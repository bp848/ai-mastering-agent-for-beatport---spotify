import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AdminPayments() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<{ id: string; user_id: string; amount_cents: number; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, user_id, amount_cents, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
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
        {t('admin.payments.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.payments.description')}</p>
      {loading ? (
        <p className="text-gray-500">{t('auth.loading')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-white/10">
                <th className="pb-2 pr-4">日時</th>
                <th className="pb-2 pr-4">User ID</th>
                <th className="pb-2 pr-4">金額</th>
                <th className="pb-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono text-gray-300 truncate max-w-[180px]">{r.user_id}</td>
                  <td className="py-2 text-white">¥{Number(r.amount_cents).toLocaleString()}</td>
                  <td className="py-2 text-gray-400">{r.status}</td>
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
