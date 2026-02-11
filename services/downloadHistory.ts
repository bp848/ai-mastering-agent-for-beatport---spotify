import type { MasteringTarget } from '../types';
import { supabase } from './supabase';

const REDOWNLOAD_DAYS = 7;

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

export async function fetchDownloadHistory(userId: string) {
  const { data, error } = await supabase
    .from('download_history')
    .select('id, file_name, mastering_target, created_at, amount_cents, storage_path, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
