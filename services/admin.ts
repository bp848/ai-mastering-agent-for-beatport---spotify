import { supabase } from './supabase';

const ADMIN_SETTINGS_KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  STRIPE_SECRET_KEY: 'stripe_secret_key',
  STRIPE_PUBLISHABLE_KEY: 'stripe_publishable_key',
} as const;

export type AdminSettingKey = keyof typeof ADMIN_SETTINGS_KEYS;

export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const { data } = await supabase
    .from('admin_emails')
    .select('email')
    .eq('email', user.email)
    .maybeSingle();
  return !!data;
}

export async function getAdminEmails(): Promise<string[]> {
  const { data, error } = await supabase.from('admin_emails').select('email').order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => r.email);
}

export async function getSetting(key: AdminSettingKey): Promise<string> {
  const rowKey = ADMIN_SETTINGS_KEYS[key];
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', rowKey)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? '';
}

export async function setSetting(key: AdminSettingKey, value: string): Promise<void> {
  const rowKey = ADMIN_SETTINGS_KEYS[key];
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: rowKey, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export { ADMIN_SETTINGS_KEYS };
