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
  const [remainingDownloads, setRemainingDownloads] = useState<number | null>(null);

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


  const loadRemainingDownloads = useCallback(async () => {
    if (!session?.access_token) {
      setRemainingDownloads(null);
      return;
    }
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${base}/api/check-download-entitlement`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.remaining === 'number') {
        setRemainingDownloads(data.remaining);
        return;
      }
      if (res.ok && data?.admin === true) {
        setRemainingDownloads(null);
        return;
      }
      setRemainingDownloads(0);
    } catch (_) {
      setRemainingDownloads(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user?.id) loadHistory();
    else { setHistory([]); setLoading(false); }
  }, [user?.id, loadHistory]);

  useEffect(() => {
    if (user?.id) loadRemainingDownloads();
    else setRemainingDownloads(null);
  }, [user?.id, loadRemainingDownloads]);

  /* ── Auth Loading ── */
  if (authLoading) {
    return (
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="max-w-md mx-auto px-4 py-20 text-center animate-fade-up">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{ja ? '認証確認中...' : 'Verifying authentication...'}</p>
        </div>
      </section>
    );
  }

  /* ── Not signed in ── */
  if (!user) {
    return (
      <section className="border-t border-border/50 py-16 md:py-20">
        <div className="max-w-md mx-auto px-4 text-center animate-fade-up space-y-6">
          <div className="w-20 h-20 rounded-full border border-border bg-card flex items-center justify-center mx-auto text-muted-foreground">
            <UserIcon />
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">{ja ? 'My Page' : 'My Page'}</p>
          <h2 className="text-2xl font-bold text-foreground">
            {ja ? 'マイページ' : 'My Page'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {ja
              ? 'ログインすると、マスタリング履歴の閲覧やダウンロードが可能になります。'
              : 'Sign in to view your mastering history and access downloads.'}
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-xl bg-primary px-8 py-3.5 text-primary-foreground font-bold text-sm hover:brightness-110 transition-colors active:scale-[0.98] touch-manipulation shadow-lg"
          >
            {ja ? 'Google でログイン' : 'Sign in with Google'}
          </button>
        </div>
      </section>
    );
  }

  /* ── Signed in: Dashboard ── */
  return (
    <section className="border-t border-border/50 py-16 md:py-20 animate-fade-up">
      <div className="mx-auto max-w-3xl px-4 space-y-6">
        {/* ── Profile Card ── */}
        <div className="rounded-xl border border-border/50 bg-card p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <UserIcon />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                {user.user_metadata?.full_name ?? user.email ?? 'User'}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-all"
          >
            {ja ? 'ログアウト' : 'Sign out'}
          </button>
        </div>

        {/* ── History Section ── */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {ja ? 'マスタリング履歴' : 'Mastering History'}
            </p>
            <p className="text-xs text-muted-foreground">
              {remainingDownloads == null
                ? (ja ? 'ダウンロード残数: 無制限 / 取得中' : 'Download credits: Unlimited / Loading')
                : (ja ? `ダウンロード残数: ${remainingDownloads}回` : `Download credits: ${remainingDownloads}`)}
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
              <p className="text-sm text-destructive">
              {ja
                ? '履歴の読み込みに失敗しました。しばらくしてから「再読み込み」を押してください。'
                : 'Failed to load history. Please try "Retry" again in a moment.'}
            </p>
            <p className="text-xs text-muted-foreground">
              {ja
                ? '繰り返し発生する場合は、お手数ですが ishijima@b-p.co.jp までご連絡ください。'
                : 'If this keeps happening, please contact ishijima@b-p.co.jp.'}
            </p>
            <button
              type="button"
              onClick={loadHistory}
              className="text-xs font-bold text-destructive hover:brightness-110 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 transition-all"
            >
              {ja ? '再読み込み' : 'Retry'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="py-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">{ja ? '読み込み中...' : 'Loading...'}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && history.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto text-muted-foreground text-2xl">
              ♪
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {ja ? 'まだ履歴がありません' : 'No history yet'}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors flex-wrap sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-foreground truncate">{row.file_name}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-0.5">
                      {row.mastering_target} · {new Date(row.created_at).toLocaleString(ja ? 'ja-JP' : 'en-US')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {row.amount_cents != null && (
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
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
                        className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-colors"
                      >
                        {isDownloading ? (ja ? '取得中...' : 'Loading...') : (ja ? 'ダウンロード' : 'Download')}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
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
    </section>
  );
}
