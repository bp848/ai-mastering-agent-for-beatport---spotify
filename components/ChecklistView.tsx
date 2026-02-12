import React, { useState, useCallback } from 'react';
import type { PlaylistCheckItem } from '../types';
import { usePlatform } from '../contexts/PlatformContext';
import { CheckCircleIcon } from './Icons';

const PLATFORM_LABELS: Record<PlaylistCheckItem['platform'], string> = {
  spotify: 'Spotify',
  beatport: 'Beatport',
  apple: 'Apple Music',
  other: 'その他',
};

export default function ChecklistView() {
  const { tracks, checklist, getChecksForTrack, addCheckItem, toggleCheck, setCheckItemPlaylistName, removeCheckItem } = usePlatform();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(tracks[0]?.id ?? null);
  const [newPlatform, setNewPlatform] = useState<PlaylistCheckItem['platform']>('spotify');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const currentChecks = selectedTrackId ? getChecksForTrack(selectedTrackId) : [];

  const handleAdd = useCallback(() => {
    if (!selectedTrackId) return;
    addCheckItem({
      trackId: selectedTrackId,
      platform: newPlatform,
      playlistName: newPlaylistName.trim() || PLATFORM_LABELS[newPlatform],
    });
    setNewPlaylistName('');
  }, [selectedTrackId, newPlatform, newPlaylistName, addCheckItem]);

  return (
    <section className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Checklist</p>
        <h2 className="text-2xl font-bold text-foreground">プレイリスト入りチェック</h2>
        <p className="text-sm text-muted-foreground">配信後に「このプレイリストに入ったか」をチェックして管理できます。</p>

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
                  onClick={() => setSelectedTrackId(t.id)}
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

            {selectedTrackId && (
              <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as PlaylistCheckItem['platform'])}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="プレイリスト名（任意）"
                    className="flex-1 min-w-[160px] bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold uppercase hover:bg-primary/30 transition-colors"
                  >
                    項目を追加
                  </button>
                </div>

                <ul className="space-y-2">
                  {currentChecks.length === 0 && (
                    <li className="text-muted-foreground text-sm">この楽曲のチェック項目はまだありません。</li>
                  )}
                  {currentChecks.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCheck(item.id)}
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          item.checked ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                        }`}
                        title={item.checked ? '未入りに戻す' : 'プレイリスト入りした'}
                      >
                        <CheckCircleIcon />
                      </button>
                      <span className="text-xs text-muted-foreground uppercase w-20">{PLATFORM_LABELS[item.platform]}</span>
                      <input
                        type="text"
                        value={item.playlistName}
                        onChange={(e) => setCheckItemPlaylistName(item.id, e.target.value)}
                        className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 text-sm text-foreground"
                      />
                      {item.checked && item.checkedAt && (
                        <span className="text-xs text-muted-foreground">
                          ✓ {new Date(item.checkedAt).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCheckItem(item.id)}
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
