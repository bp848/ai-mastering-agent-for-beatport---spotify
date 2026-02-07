import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTranslation } from '../../contexts/LanguageContext';

interface UserRow {
  user_id: string;
  count: number;
  last_at: string;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('download_history')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      const byUser = new Map<string, { count: number; last_at: string }>();
      (data ?? []).forEach((r) => {
        const cur = byUser.get(r.user_id);
        if (!cur) {
          byUser.set(r.user_id, { count: 1, last_at: r.created_at });
        } else {
          cur.count += 1;
          if (r.created_at > cur.last_at) cur.last_at = r.created_at;
        }
      });
      setRows(
        Array.from(byUser.entries()).map(([user_id, v]) => ({
          user_id,
          count: v.count,
          last_at: v.last_at,
        }))
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.users.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.users.description')}</p>
      {loading ? (
        <p className="text-gray-500">{t('auth.loading')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-white/10">
                <th className="pb-2 pr-4">User ID</th>
                <th className="pb-2 pr-4">DL回数</th>
                <th className="pb-2">最終DL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-gray-300 truncate max-w-[200px]">{r.user_id}</td>
                  <td className="py-2 pr-4 text-white">{r.count}</td>
                  <td className="py-2 text-gray-500">{new Date(r.last_at).toLocaleString()}</td>
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
