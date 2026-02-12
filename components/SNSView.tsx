import React, { useState, useCallback } from 'react';
import { usePlatform } from '../contexts/PlatformContext';
import { useTranslation } from '../contexts/LanguageContext';
import { getSnsSuggestions } from '../services/geminiService';
import { ShareIcon, CopyIcon, Spinner } from './Icons';

export default function SNSView() {
  const { tracks } = usePlatform();
  const { language } = useTranslation();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(tracks[0]?.id ?? null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedTrack = selectedTrackId ? tracks.find((t) => t.id === selectedTrackId) : null;

  const generate = useCallback(async () => {
    if (!selectedTrack) return;
    setLoading(true);
    setError('');
    try {
      const result = await getSnsSuggestions(
        {
          title: selectedTrack.title,
          artist: selectedTrack.artist,
          album: selectedTrack.album || undefined,
          genre: selectedTrack.genre || undefined,
          releaseDate: selectedTrack.releaseDate || undefined,
        },
        language
      );
      setSuggestions(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error.gemini.fail');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTrack, language]);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <section className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">SNS</p>
        <h2 className="text-2xl font-bold text-foreground">SNS投稿提案</h2>
        <p className="text-sm text-muted-foreground">楽曲情報からAIが投稿文を考えます。Twitter/X・Instagram用のコピーをコピーして使えます。</p>

        {tracks.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm rounded-xl border border-border/50 bg-card">
            まずライブラリに楽曲を追加してください。
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTrackId(t.id);
                    setSuggestions([]);
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    selectedTrackId === t.id
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 hover:text-foreground'
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {selectedTrack && (
              <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <ShareIcon />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedTrack.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrack.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={generate}
                    disabled={loading}
                    className="ml-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase hover:brightness-110 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <span className="w-5 h-5 block"><Spinner /></span> : null}
                    {loading ? '生成中...' : '投稿文を生成'}
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <ul className="space-y-3">
                    {suggestions.map((text, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card/50"
                      >
                        <p className="flex-1 text-sm text-foreground whitespace-pre-wrap">{text}</p>
                        <button
                          type="button"
                          onClick={() => copyText(text)}
                          className="p-2 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title="コピー"
                        >
                          <CopyIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
