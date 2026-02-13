import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

/**
 * ダウンロード権限のサーバー側チェック。
 * 管理者 or download_tokens.paid=true が1件以上ある場合のみ 200 { allowed: true }。
 * 改ざんされたクライアントでも、このAPIを通さないと「許可」を出さない運用にする。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({
      allowed: false,
      code: 'server_config',
      message: 'Supabase URL or Key is not configured on the server.'
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ allowed: false, code: 'missing_token' });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user?.id) {
    return res.status(401).json({ allowed: false, code: 'auth_failed' });
  }

  // 管理者チェック（anon で admin_emails を読む）
  const { data: adminRow } = await supabaseAuth
    .from('admin_emails')
    .select('email')
    .eq('email', user.email ?? '')
    .maybeSingle();
  if (adminRow) {
    return res.status(200).json({ allowed: true, remaining: null, admin: true });
  }

  // 一般ユーザー: service role で download_tokens 件数を確認
  if (!supabaseServiceKey) {
    return res.status(500).json({ allowed: false, code: 'server_config' });
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { count, error: tokenError } = await supabaseAdmin
    .from('download_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('paid', true);
  if (tokenError) {
    console.error('check-download-entitlement:', tokenError);
    return res.status(403).json({ allowed: false, code: 'db_error' });
  }
  const remaining = count ?? 0;
  if (remaining > 0) {
    return res.status(200).json({ allowed: true, remaining });
  }
  return res.status(200).json({ allowed: false, remaining: 0, code: 'no_entitlement' });
}
