import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDownloadHistory } from '../services/downloadHistory';
import { useTranslation } from '../contexts/LanguageContext';
import { UserIcon } from './Icons';
import type { MasteringTarget } from '../types';

interface MyPageViewProps {
  onNavigateToMastering?: () => void;
}

export default function MyPageView({ onNavigateToMastering }: MyPageViewProps) {
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
      const data = await fetchDownloadHistory(user.id);
      setHistory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadHistory();
    else { setHistory([]); setLoading(false); }
  }, [user?.id, loadHistory]);

  if (authLoading) {
    return (
      <div className="py-20 text-center animate-fade-up">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{ja ? '認証確認中...' : 'Verifying...'}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center animate-fade-up space-y-6">
        <div className="w-20 h-20 rounded-2xl border border-border flex items-center justify-center mx-auto text-muted-foreground" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <UserIcon />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{ja ? 'マイページ' : 'My Page'}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {ja
              ? 'ログインすると、マスタリング履歴の閲覧やダウンロードが可能になります。'
              : 'Sign in to view your mastering history and access downloads.'}
          </p>
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity active:scale-[0.98] touch-manipulation"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {ja ? 'Google でログイン' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6 max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="rounded-2xl border border-border p-6 flex items-center justify-between flex-wrap gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <UserIcon />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">
              {user.user_metadata?.full_name ?? user.email ?? 'User'}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onNavigateToMastering && (
            <button
              type="button"
              onClick={onNavigateToMastering}
              className="btn-primary text-xs px-4 py-2 min-h-[40px]"
            >
              {ja ? 'もう1曲マスタリング' : 'Master Another Track'}
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-all"
          >
            {ja ? 'ログアウト' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {ja ? 'マスタリング履歴' : 'Mastering History'}
        </h3>

        {error && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/20">
            <p className="text-sm text-warning">{ja ? '読み込み失敗' : 'Failed to load'}</p>
            <button type="button" onClick={loadHistory} className="text-xs font-bold text-warning hover:text-foreground px-3 py-1.5 rounded-lg bg-warning/10 hover:bg-warning/20 transition-all">
              {ja ? '再読み込み' : 'Retry'}
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="py-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">{ja ? '読み込み中...' : 'Loading...'}</p>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl border border-border flex items-center justify-center mx-auto text-muted-foreground text-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-2.31-1.04l-.04-.109a1.03 1.03 0 0 0-1.394-.505L9 17.25V4.872c0-.498.336-.936.82-1.063l5.68-1.49A1.125 1.125 0 0 1 16.935 3.3v1.5" /></svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{ja ? 'まだ履歴がありません' : 'No history yet'}</p>
              <p className="text-xs text-muted-foreground/60">
                {ja ? '最初のトラックをマスタリングしてみましょう。' : 'Upload your first track to get started.'}
              </p>
            </div>
            {onNavigateToMastering && (
              <button type="button" onClick={onNavigateToMastering} className="btn-primary text-sm px-6 py-3 min-h-[44px]">
                {ja ? 'マスタリングを開始' : 'Start Mastering'}
              </button>
            )}
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <ul className="space-y-2">
            {history.map((row) => {
              const canRedownload = row.storage_path && row.expires_at && new Date(row.expires_at) > new Date();
              const isDownloading = downloadingId === row.id;

              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border hover:border-primary/20 transition-colors flex-wrap sm:flex-nowrap"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-foreground truncate">{row.file_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5 tabular-nums">
                      {row.mastering_target} -- {new Date(row.created_at).toLocaleString(ja ? 'ja-JP' : 'en-US')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {row.amount_cents != null && (
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {'\u00A5'}{(row.amount_cents / 100).toLocaleString()}
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
                        className="btn-primary text-xs px-4 py-2 min-h-[40px]"
                      >
                        {isDownloading ? (ja ? '取得中...' : 'Loading...') : (ja ? 'DL' : 'Download')}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{ja ? '期限切れ' : 'Expired'}</span>
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
