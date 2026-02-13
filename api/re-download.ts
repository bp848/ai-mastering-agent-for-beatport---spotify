import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('SERVER CONFIG ERROR: Missing Supabase environment variables in re-download.ts');
}

/** マイページから再ダウンロード: 履歴が本人のもので有効期限内なら署名付きURLを返す */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const historyId = typeof req.query.history_id === 'string' ? req.query.history_id : '';
  if (!historyId) {
    return res.status(400).json({ error: 'history_id required' });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({ error: 'server_config', message: 'Missing Supabase Config' });
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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: row, error: rowError } = await supabaseAdmin
    .from('download_history')
    .select('user_id, storage_path, expires_at, file_name, mastering_target')
    .eq('id', historyId)
    .maybeSingle();

  if (rowError || !row) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (row.user_id !== user.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (!row.storage_path || !row.expires_at) {
    return res.status(410).json({ error: 'redownload_expired', message: 'Re-download period has ended.' });
  }
  if (new Date(row.expires_at) <= new Date()) {
    return res.status(410).json({ error: 'redownload_expired', message: 'Re-download period has ended.' });
  }

  const baseName = (row.file_name ?? 'master').replace(/\.[^/.]+$/, '');
  const suggestedName = `${baseName}_${row.mastering_target}_mastered.wav`;

  const stream = req.query.stream === '1' || req.query.stream === 'true';
  if (stream) {
    const { data: blob, error: dlError } = await supabaseAdmin.storage
      .from('mastered')
      .download(row.storage_path);

    if (dlError || !blob) {
      console.error('re-download storage download failed:', dlError);
      return res.status(500).json({ error: 'storage_error' });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(suggestedName)}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('mastered')
    .createSignedUrl(row.storage_path, 60, { download: true });

  if (signError || !signed?.signedUrl) {
    console.error('re-download signed url failed:', signError);
    return res.status(500).json({ error: 'storage_error' });
  }

  return res.status(200).json({
    url: signed.signedUrl,
    suggested_name: suggestedName,
  });
}
