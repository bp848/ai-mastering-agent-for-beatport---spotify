import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const notifyEmail = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || '';
const resendApiKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.NOTIFY_FROM || 'onboarding@resend.dev';

/**
 * Googleログイン・会員登録時に「未通知」なら管理者へメール1通送る（Stripe Webhook 代替）。
 * クライアントがログイン後に Bearer 付きで呼ぶ。同じ user_id には1回だけ送信。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user?.id) {
    return res.status(401).json({ error: 'auth_failed' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'server_config' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: existing } = await supabaseAdmin
    .from('notified_signups')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({ notified: false, already: true });
  }

  const { error: insertError } = await supabaseAdmin.from('notified_signups').insert({
    user_id: user.id,
  });
  if (insertError) {
    console.error('notify-new-signup insert failed:', insertError);
    return res.status(500).json({ error: 'db_error' });
  }

  if (!notifyEmail || !resendApiKey) {
    console.warn('notify-new-signup: NOTIFY_EMAIL or RESEND_API_KEY not set, skip email');
    return res.status(200).json({ notified: true, email_skipped: true });
  }

  const subject = '[AI Mastering] 新規ログイン・会員登録';
  const html = `
    <p>新規でログイン／会員登録がありました。</p>
    <ul>
      <li>User ID: ${user.id}</li>
      <li>Email: ${user.email ?? '（なし）'}</li>
      <li>日時: ${new Date().toISOString()}</li>
    </ul>
    <p>（Stripe Webhook 代替の通知です）</p>
  `;

  try {
    const resResend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        subject,
        html,
      }),
    });
    const data = await resResend.json().catch(() => ({}));
    if (!resResend.ok) {
      console.error('Resend API error:', resResend.status, data);
      return res.status(500).json({ error: 'email_failed', detail: data });
    }
  } catch (e) {
    console.error('notify-new-signup email error:', e);
    return res.status(500).json({ error: 'email_error' });
  }

  return res.status(200).json({ notified: true });
}
