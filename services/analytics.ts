import { supabase } from './supabase';

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId ?? user?.id ?? null,
      properties: properties ?? {},
    });
  } catch (e) {
    console.warn('Analytics track failed:', e);
  }
}
