import { supabase } from './supabase';
import { isAdmin } from './admin';

/**
 * ダウンロード可能かどうか。
 * - 管理者は常に true
 * - それ以外は download_tokens に paid=true が1件以上ある場合のみ true
 */
export async function canDownload(userId: string): Promise<boolean> {
  try {
    if (await isAdmin()) return true;
    const { data, error } = await supabase
      .from('download_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('paid', true)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
