import type { MasteringTarget } from '../types';
import { supabase } from './supabase';

export async function recordDownload(
  userId: string,
  fileName: string,
  masteringTarget: MasteringTarget,
  amountCents?: number
) {
  const { error } = await supabase.from('download_history').insert({
    user_id: userId,
    file_name: fileName,
    mastering_target: masteringTarget,
    amount_cents: amountCents ?? null,
  });
  if (error) throw error;
}

export async function fetchDownloadHistory(userId: string) {
  const { data, error } = await supabase
    .from('download_history')
    .select('id, file_name, mastering_target, created_at, amount_cents')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
