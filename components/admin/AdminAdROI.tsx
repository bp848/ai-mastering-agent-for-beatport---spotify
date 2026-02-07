import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AdminAdROI() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<{ id: string; platform: string; campaign_name: string | null; spend_cents: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('ad_spend')
        .select('id, platform, campaign_name, spend_cents, date')
        .order('date', { ascending: false })
        .limit(100);
      if (error) {
        setLoading(false);
        return;
      }
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.adroi.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.adroi.description')}</p>
      {loading ? (
        <p className="text-gray-500">{t('auth.loading')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-white/10">
                <th className="pb-2 pr-4">日付</th>
                <th className="pb-2 pr-4">プラットフォーム</th>
                <th className="pb-2 pr-4">キャンペーン</th>
                <th className="pb-2">費用</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-gray-500">{r.date}</td>
                  <td className="py-2 pr-4 text-white">{r.platform}</td>
                  <td className="py-2 pr-4 text-gray-400">{r.campaign_name ?? '—'}</td>
                  <td className="py-2 text-white">¥{(r.spend_cents / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-gray-500 py-4">{t('admin.no_data')}</p>}
        </div>
      )}
    </div>
  );
}
