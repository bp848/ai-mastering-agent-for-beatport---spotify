import type { MasteringTarget } from '../types';
import { supabase } from './supabase';

const REDOWNLOAD_DAYS = 7;

export type DownloadHistoryRow = {
  id: string;
  file_name: string;
  mastering_target: MasteringTarget;
  created_at: string;
  amount_cents?: number | null;
  storage_path?: string | null;
  expires_at?: string | null;
};

export async function recordDownload(
  userId: string,
  fileName: string,
  masteringTarget: MasteringTarget,
  amountCents?: number,
  storagePath?: string
) {
  const expiresAt = storagePath
    ? new Date(Date.now() + REDOWNLOAD_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const { error } = await supabase.from('download_history').insert({
    user_id: userId,
    file_name: fileName,
    mastering_target: masteringTarget,
    amount_cents: amountCents ?? null,
    storage_path: storagePath ?? null,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

/** API経由で履歴取得（推奨）。認証・RLS不具合を避けられる。 */
export async function fetchDownloadHistoryViaApi(accessToken: string): Promise<DownloadHistoryRow[]> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/api/get-download-history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || (res.status === 401 ? 'Unauthorized' : `Request failed (${res.status})`);
    throw new Error(msg);
  }
  return Array.isArray(data?.history) ? data.history : [];
}

/** クライアントのSupabaseで取得（APIが使えない場合のフォールバック） */
export async function fetchDownloadHistory(userId: string): Promise<DownloadHistoryRow[]> {
  const { data, error } = await supabase
    .from('download_history')
    .select('id, file_name, mastering_target, created_at, amount_cents, storage_path, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as DownloadHistoryRow[];
}
