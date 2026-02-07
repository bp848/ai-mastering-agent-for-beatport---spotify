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
    <div className="space-y-6">
      <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">プレイリスト入りチェック（グラウンディング）</h2>
      <p className="text-sm text-gray-500">配信後に「このプレイリストに入ったか」をチェックして管理できます。</p>

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
                onClick={() => setSelectedTrackId(t.id)}
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

          {selectedTrackId && (
            <div className="bg-[#141414] rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as PlaylistCheckItem['platform'])}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
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
                  className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/30 transition-colors"
                >
                  項目を追加
                </button>
              </div>

              <ul className="space-y-2">
                {currentChecks.length === 0 && (
                  <li className="text-gray-500 text-sm">この楽曲のチェック項目はまだありません。</li>
                )}
                {currentChecks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        item.checked ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/5 text-gray-500'
                      }`}
                      title={item.checked ? '未入りに戻す' : 'プレイリスト入りした'}
                    >
                      <CheckCircleIcon />
                    </button>
                    <span className="text-[10px] text-gray-500 uppercase w-20">{PLATFORM_LABELS[item.platform]}</span>
                    <input
                      type="text"
                      value={item.playlistName}
                      onChange={(e) => setCheckItemPlaylistName(item.id, e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-white/20 focus:border-emerald-500/50 outline-none py-1 text-sm text-white"
                    />
                    {item.checked && item.checkedAt && (
                      <span className="text-[10px] text-gray-500">
                        ✓ {new Date(item.checkedAt).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeCheckItem(item.id)}
                      className="text-gray-500 hover:text-red-400 text-xs"
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
  );
}
