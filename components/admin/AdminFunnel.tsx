import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AdminFunnel() {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<{ name: string; count: number; rate?: string }[]>([]);
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
      const order = ['page_view', 'upload_start', 'mastering_complete', 'download_click', 'payment_complete'];
      const arr = order.map((name) => ({ name, count: counts.get(name) ?? 0 }));
      let prev = 0;
      const withRate = arr.map((s) => {
        const rate = prev > 0 ? ((s.count / prev) * 100).toFixed(1) + '%' : '—';
        prev = s.count;
        return { ...s, rate };
      });
      setSteps(withRate);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.funnel.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.funnel.description')}</p>
      {loading ? (
        <p className="text-gray-500">{t('auth.loading')}</p>
      ) : (
        <div className="space-y-2">
          {steps.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/5"
            >
              <span className="font-mono text-sm text-white">{s.name}</span>
              <span className="text-white font-bold">{s.count}</span>
              <span className="text-gray-500 text-xs">{s.rate}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
