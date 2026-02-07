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
    <div className="space-y-6">
      <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SNS投稿提案</h2>
      <p className="text-sm text-gray-500">楽曲情報からAIが投稿文を考えます。Twitter/X・Instagram用のコピーをコピーして使えます。</p>

      {tracks.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">
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
                    ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {selectedTrack && (
            <div className="bg-[#141414] rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShareIcon />
                </div>
                <div>
                  <p className="font-bold text-white">{selectedTrack.title}</p>
                  <p className="text-sm text-gray-500">{selectedTrack.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold uppercase hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <span className="w-5 h-5"><Spinner /></span> : null}
                  {loading ? '生成中...' : '投稿文を生成'}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {suggestions.length > 0 && (
                <ul className="space-y-3">
                  {suggestions.map((text, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <p className="flex-1 text-sm text-gray-300 whitespace-pre-wrap">{text}</p>
                      <button
                        type="button"
                        onClick={() => copyText(text)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors shrink-0"
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
  );
}
