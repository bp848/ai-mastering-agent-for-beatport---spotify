import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<{ event_name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (error) {
        setLoading(false);
        return;
      }
      const counts = new Map<string, number>();
      (data ?? []).forEach((r) => {
        counts.set(r.event_name, (counts.get(r.event_name) ?? 0) + 1);
      });
      setEvents(
        Array.from(counts.entries())
          .map(([event_name, count]) => ({ event_name, count }))
          .sort((a, b) => b.count - a.count)
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.analytics.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.analytics.description')}</p>
      {loading ? (
        <p className="text-gray-500">{t('auth.loading')}</p>
      ) : (
        <div className="space-y-2">
          {events.map(({ event_name, count }) => (
            <div
              key={event_name}
              className="flex items-center justify-between py-2 px-4 rounded-xl bg-white/5 border border-white/5"
            >
              <span className="font-mono text-sm text-white">{event_name}</span>
              <span className="text-emerald-400 font-bold">{count}</span>
            </div>
          ))}
          {events.length === 0 && <p className="text-gray-500 py-4">{t('admin.no_data')}</p>}
        </div>
      )}
    </div>
  );
}
