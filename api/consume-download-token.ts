import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

/**
 * ダウンロード実行時にトークンを1件消費する。
 * 管理者は消費しない（無制限）。一般ユーザーは paid=true の1行を削除。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ consumed: false, code: 'server_config' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ consumed: false, code: 'missing_token' });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user?.id) {
    return res.status(401).json({ consumed: false, code: 'auth_failed' });
  }

  const { data: adminRow } = await supabaseAuth
    .from('admin_emails')
    .select('email')
    .eq('email', user.email ?? '')
    .maybeSingle();
  if (adminRow) {
    return res.status(200).json({ consumed: false, allowed: true, admin: true, remaining: null });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ consumed: false, code: 'server_config' });
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data: row, error: selectError } = await supabaseAdmin
    .from('download_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('paid', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError || !row?.id) {
    return res.status(403).json({ consumed: false, allowed: false, code: 'no_tokens_left' });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('download_tokens')
    .delete()
    .eq('id', row.id);
  if (deleteError) {
    console.error('consume-download-token delete failed:', deleteError);
    return res.status(500).json({ consumed: false, code: 'db_error' });
  }
  const { count: remainingCount, error: countError } = await supabaseAdmin
    .from('download_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('paid', true);

  if (countError) {
    console.error('consume-download-token count failed:', countError);
    return res.status(200).json({ consumed: true, allowed: true, remaining: 0 });
  }

  return res.status(200).json({ consumed: true, allowed: true, remaining: remainingCount ?? 0 });
}
