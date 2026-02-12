import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDownloadHistory, fetchDownloadHistoryViaApi } from '../services/downloadHistory';
import { useTranslation } from '../contexts/LanguageContext';
import { UserIcon } from './Icons';
import type { MasteringTarget } from '../types';

/* ══════════════════════════════════════════════════════════════════
   MyPageView — Dashboard style with proper error/empty states
   ══════════════════════════════════════════════════════════════════ */

export default function MyPageView() {
  const { user, session, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { language } = useTranslation();
  const ja = language === 'ja';
  const [history, setHistory] = useState<{
    id: string;
    file_name: string;
    mastering_target: MasteringTarget;
    created_at: string;
    amount_cents?: number | null;
    storage_path?: string | null;
    expires_at?: string | null;
  }[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = session?.access_token
        ? await fetchDownloadHistoryViaApi(session.access_token)
        : await fetchDownloadHistory(user.id);
      setHistory(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      setError(msg);
      if (typeof console !== 'undefined' && console.error) {
        console.error('MyPageView: fetch download history failed', e);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (user?.id) loadHistory();
    else { setHistory([]); setLoading(false); }
  }, [user?.id, loadHistory]);

  /* ── Auth Loading ── */
  if (authLoading) {
    return (
      <div className="py-20 text-center animate-fade-up">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-zinc-500">{ja ? '認証確認中...' : 'Verifying authentication...'}</p>
      </div>
    );
  }

  /* ── Not signed in ── */
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center animate-fade-up space-y-6">
        <div className="w-20 h-20 rounded-full glass-elevated flex items-center justify-center mx-auto text-zinc-500">
          <UserIcon />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">
            {ja ? 'マイページ' : 'My Page'}
          </h2>
          <p className="text-sm text-zinc-400">
            {ja
              ? 'ログインすると、マスタリング履歴の閲覧やダウンロードが可能になります。'
              : 'Sign in to view your mastering history and access downloads.'}
          </p>
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="px-8 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors active:scale-[0.98] touch-manipulation shadow-lg"
        >
          {ja ? 'Google でログイン' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  /* ── Signed in: Dashboard ── */
  return (
    <div className="animate-fade-up space-y-6">
      {/* ── Profile Card ── */}
      <div className="glass-elevated rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 ring-2 ring-cyan-500/20">
            <UserIcon />
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              {user.user_metadata?.full_name ?? user.email ?? 'User'}
            </p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-xs font-medium text-zinc-500 hover:text-white px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          {ja ? 'ログアウト' : 'Sign out'}
        </button>
      </div>

      {/* ── History Section ── */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {ja ? 'マスタリング履歴' : 'Mastering History'}
        </h3>

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <p className="text-sm text-amber-400">
              {ja
                ? '履歴の読み込みに失敗しました。しばらくしてから「再読み込み」を押してください。'
                : 'Failed to load history. Please try "Retry" again in a moment.'}
            </p>
            <p className="text-xs text-zinc-500">
              {ja
                ? '繰り返し発生する場合は、お手数ですが ishijima@b-p.co.jp までご連絡ください。'
                : 'If this keeps happening, please contact ishijima@b-p.co.jp.'}
            </p>
            <button
              type="button"
              onClick={loadHistory}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all"
            >
              {ja ? '再読み込み' : 'Retry'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="py-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-500">{ja ? '読み込み中...' : 'Loading...'}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && history.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-600 text-2xl">
              ♪
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">
                {ja ? 'まだ履歴がありません' : 'No history yet'}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {ja
                  ? 'マスタリング完了後、結果画面の「購入してWAVを取得」からダウンロードすると、ここに表示されます。'
                  : 'After mastering, download from "Purchase → Download" on the result screen; it will appear here.'}
              </p>
            </div>
          </div>
        )}

        {/* History list */}
        {!loading && !error && history.length > 0 && (
          <ul className="space-y-2">
            {history.map((row) => {
              const canRedownload =
                row.storage_path &&
                row.expires_at &&
                new Date(row.expires_at) > new Date();
              const isDownloading = downloadingId === row.id;

              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors flex-wrap sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-white truncate">{row.file_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
                      {row.mastering_target} · {new Date(row.created_at).toLocaleString(ja ? 'ja-JP' : 'en-US')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {row.amount_cents != null && (
                      <span className="text-xs font-mono text-zinc-400 tabular-nums">
                        ¥{(row.amount_cents / 100).toLocaleString()}
                      </span>
                    )}
                    {canRedownload ? (
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={async () => {
                          if (!session?.access_token) return;
                          setDownloadingId(row.id);
                          try {
                            const base = typeof window !== 'undefined' ? window.location.origin : '';
                            const res = await fetch(
                              `${base}/api/re-download?history_id=${encodeURIComponent(row.id)}`,
                              { headers: { Authorization: `Bearer ${session.access_token}` } }
                            );
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.url) {
                              const a = document.createElement('a');
                              a.href = data.url;
                              a.download = data.suggested_name ?? `${row.file_name.replace(/\.[^/.]+$/, '')}_${row.mastering_target}_mastered.wav`;
                              a.rel = 'noopener noreferrer';
                              a.target = '_blank';
                              a.click();
                            }
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                      >
                        {isDownloading ? (ja ? '取得中...' : 'Loading...') : (ja ? 'ダウンロード' : 'Download')}
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-500">
                        {ja ? '再DL期限切れ' : 'Expired'}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
