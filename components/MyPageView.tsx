import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDownloadHistory } from '../services/downloadHistory';
import { useTranslation } from '../contexts/LanguageContext';
import { UserIcon } from './Icons';
import type { MasteringTarget } from '../types';

export default function MyPageView() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { t } = useTranslation();
  const [history, setHistory] = useState<{ id: string; file_name: string; mastering_target: MasteringTarget; created_at: string; amount_cents?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDownloadHistory(user.id);
      setHistory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadHistory();
    else setHistory([]);
    setLoading(!user?.id);
  }, [user?.id, loadHistory]);

  if (authLoading) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        {t('auth.loading')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-gray-500">
          <UserIcon />
        </div>
        <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">
          {t('mypage.sign_in_required')}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('mypage.sign_in_required_description')}
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors"
        >
          {t('auth.sign_in_google')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserIcon />
          </div>
          <div>
            <p className="font-bold text-white">
              {user.user_metadata?.full_name ?? user.email ?? user.id}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider"
        >
          {t('auth.sign_out')}
        </button>
      </div>

      <div>
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
          {t('mypage.download_history')}
        </h3>
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}
        {loading ? (
          <p className="text-sm text-gray-500">{t('auth.loading')}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 py-8">{t('mypage.no_history')}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-white truncate">{row.file_name}</p>
                  <p className="text-[10px] text-gray-500 uppercase mt-0.5">
                    {row.mastering_target} · {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                {row.amount_cents != null && (
                  <span className="text-xs text-gray-400 shrink-0">
                    ¥{(row.amount_cents / 100).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
