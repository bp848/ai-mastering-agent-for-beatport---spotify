import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDownloadHistory, fetchDownloadHistoryViaApi } from '../services/downloadHistory';
import { useTranslation } from '../contexts/LanguageContext';
import { UserIcon, MailIcon } from './Icons';
import { triggerBlobDownload } from '../utils/download';
import type { MasteringTarget } from '../types';

interface MyPageViewProps {
  onNavigateToMastering?: () => void;
}

export default function MyPageView({ onNavigateToMastering }: MyPageViewProps) {
  const { user, session, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { t, language } = useTranslation();
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
      if (msg.includes('server_config')) {
        // Prevent repeated calls if server config is broken
        setLoading(false);
        return;
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
          <p className="text-sm text-muted-foreground">{t('auth.loading')}</p>
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
          <p className="text-xs font-medium uppercase tracking-widest text-primary">{t('header.mypage', { default: 'My Page' })}</p>
          <h2 className="text-2xl font-bold text-foreground">
            {t('mypage.sign_in_required')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('mypage.sign_in_required_description')}
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-xl bg-primary px-8 py-3.5 text-primary-foreground font-bold text-sm hover:brightness-110 transition-colors active:scale-[0.98] touch-manipulation shadow-lg"
          >
            {t('auth.sign_in_google')}
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onNavigateToMastering}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-sm transition-all"
            >
              {t('mypage.button.next_mastering', { default: 'Next Song Mastering' })}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg bg-secondary border border-border hover:bg-secondary/80 transition-all"
            >
              {t('auth.sign_out')}
            </button>
          </div>
        </div>

        {/* ── History Section ── */}
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('mypage.download_history')}
            </p>
            <p className="text-xs text-muted-foreground">
              {remainingDownloads == null
                ? t('mypage.credits.unlimited')
                : t('mypage.credits.count', { replacements: { count: remainingDownloads } })}
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
              <p className="text-sm text-destructive">
                {t('mypage.history.error')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('mypage.history.error_contact')}
              </p>
              <button
                type="button"
                onClick={loadHistory}
                className="text-xs font-bold text-destructive hover:brightness-110 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 transition-all"
              >
                {t('mypage.history.retry')}
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && !error && (
            <div className="py-8 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">{t('common.loading', { default: 'Loading...' })}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && history.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto text-muted-foreground text-2xl">
                ♪
              </div>
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('mypage.no_history')}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t('mypage.history.empty_description')}
                </p>
                <button
                  type="button"
                  onClick={onNavigateToMastering}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-bold text-sm shadow-lg hover:brightness-110 transition-all"
                >
                  {t('mypage.history.cta_start')}
                </button>
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
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      {row.amount_cents != null && (
                        <span className="hidden sm:inline text-xs font-mono text-muted-foreground tabular-nums mr-2">
                          ¥{(row.amount_cents / 100).toLocaleString()}
                        </span>
                      )}
                      {canRedownload ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const name = `${row.file_name.replace(/\.[^/.]+$/, '')}_${row.mastering_target}_mastered.wav`;
                              const subject = t('mypage.history.email_subject', { replacements: { name } });
                              const body = t('mypage.history.email_body', { replacements: { name } });
                              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }}
                            className="p-2.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
                            title={t('mypage.history.email_info')}
                          >
                            <MailIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={async () => {
                              if (!session?.access_token) return;
                              setDownloadingId(row.id);
                              try {
                                const base = typeof window !== 'undefined' ? window.location.origin : '';
                                const res = await fetch(
                                  `${base}/api/re-download?history_id=${encodeURIComponent(row.id)}&stream=1`,
                                  { headers: { Authorization: `Bearer ${session.access_token}` } }
                                );
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const name = `${row.file_name.replace(/\.[^/.]+$/, '')}_${row.mastering_target}_mastered.wav`;
                                  triggerBlobDownload(blob, name);
                                }
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            className="min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-colors"
                          >
                            {isDownloading ? t('common.loading', { default: 'Loading...' }) : t('agent.button.download', { default: 'Download' })}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          {t('mypage.history.expired')}
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
