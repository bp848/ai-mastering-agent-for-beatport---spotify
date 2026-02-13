import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

const STORAGE_KEY = 'genre_request_counts';
const TARGET = 100;

const OTHER_GENRES = [
  'Hip-Hop / Trap',
  'Pop / EDM',
  'Rock / Metal',
  'Ambient / Chillout',
  'Drum & Bass',
  'Dubstep',
  'Future Bass',
  'Lo-Fi',
  'Classical',
  'その他',
];

function getStoredCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {}
}

export default function GenreNoticeSection() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setCounts(getStoredCounts());
  }, []);

  const handleClick = (genre: string) => {
    const next = { ...counts, [genre]: (counts[genre] ?? 0) + 1 };
    setCounts(next);
    setStoredCounts(next);
  };

  return (
    <section className="border-t border-border/50 py-8 md:py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              本サービスは<strong>テクノ・トランス・サイケデリックトランス・プログレッシブハウス・メロディックハウス</strong>のジャンルに特化しています。
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              ほかのジャンルをご希望の場合は、以下の欲しいジャンルをクリックください。100人に到達したジャンルから順次開発します。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {OTHER_GENRES.map((genre) => {
                const n = counts[genre] ?? 0;
                const reached = n >= TARGET;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleClick(genre)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      reached
                        ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-primary/10'
                    }`}
                  >
                    {genre}
                    <span className="ml-1.5 tabular-nums text-muted-foreground">({n}/{TARGET})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
