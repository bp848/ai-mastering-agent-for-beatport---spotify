import React, { useState, useCallback } from 'react';
import type { LibraryTrack } from '../types';
import { usePlatform } from '../contexts/PlatformContext';
import { CopyIcon, TrashIcon } from './Icons';

const FIELDS: { key: keyof LibraryTrack; label: string }[] = [
  { key: 'title', label: 'タイトル' },
  { key: 'artist', label: 'アーティスト' },
  { key: 'album', label: 'アルバム' },
  { key: 'genre', label: 'ジャンル' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'releaseDate', label: 'リリース日' },
  { key: 'fileName', label: 'ファイル名' },
];

function CopyableField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  }, [value]);

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-gray-500 uppercase w-24 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-sm text-white truncate">{value || '—'}</span>
      {value && (
        <button
          type="button"
          onClick={copy}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
          title="コピー"
        >
          <CopyIcon />
        </button>
      )}
      {copied && <span className="text-[10px] text-emerald-500 uppercase">Copied</span>}
    </div>
  );
}

export default function LibraryView() {
  const { tracks, updateTrack, removeTrack, addTrack } = usePlatform();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTrack, setNewTrack] = useState<Partial<LibraryTrack>>({
    title: '',
    artist: '',
    album: '',
    genre: 'Techno',
    isrc: '',
    releaseDate: '',
    artworkUrl: '',
    fileName: '',
    masteringTarget: null,
  });

  const handleAdd = useCallback(() => {
    if (!newTrack.title?.trim() || !newTrack.artist?.trim()) return;
    addTrack({
      title: newTrack.title.trim(),
      artist: newTrack.artist.trim(),
      album: (newTrack.album ?? '').trim(),
      genre: (newTrack.genre ?? '').trim() || 'Techno',
      isrc: (newTrack.isrc ?? '').trim(),
      releaseDate: (newTrack.releaseDate ?? '').trim(),
      artworkUrl: (newTrack.artworkUrl ?? '').trim(),
      fileName: (newTrack.fileName ?? '').trim(),
      masteringTarget: newTrack.masteringTarget ?? null,
    });
    setNewTrack({
      title: '',
      artist: '',
      album: '',
      genre: 'Techno',
      isrc: '',
      releaseDate: '',
      artworkUrl: '',
      fileName: '',
      masteringTarget: null,
    });
    setShowAdd(false);
  }, [addTrack, newTrack]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">楽曲ライブラリ</h2>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/30 transition-colors"
        >
          {showAdd ? 'キャンセル' : '+ 楽曲を追加'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#141414] p-6 rounded-2xl border border-white/10 space-y-4">
          <p className="text-[10px] text-gray-500 uppercase">新規楽曲（メタ情報）</p>
          {FIELDS.filter((f) => f.key !== 'id' && f.key !== 'createdAt').map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 w-24 shrink-0">{label}</label>
              <input
                type="text"
                value={(newTrack[key as keyof LibraryTrack] as string) ?? ''}
                onChange={(e) => setNewTrack((prev) => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
                placeholder={label}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase hover:bg-emerald-600 transition-colors"
          >
            追加
          </button>
        </div>
      )}

      <div className="space-y-2">
        {tracks.length === 0 && !showAdd && (
          <div className="py-16 text-center text-gray-500 text-sm">
            楽曲がありません。追加するか、マスタリング完了後に「ライブラリに保存」から登録できます。
          </div>
        )}
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId((id) => (id === track.id ? null : track.id))}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 text-xl font-black">
                {track.artist.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-500 truncate">{track.artist} · {track.genre}</p>
              </div>
              <span className="text-[10px] text-gray-600">
                {new Date(track.createdAt).toLocaleDateString('ja-JP')}
              </span>
              <span className="text-gray-500">{expandedId === track.id ? '▲' : '▼'}</span>
            </button>
            {expandedId === track.id && (
              <div className="px-4 pb-4 pt-0 border-t border-white/5">
                <div className="bg-[#0d0d0d] rounded-xl p-4 space-y-0">
                  {FIELDS.map(({ key, label }) => (
                    <CopyableField
                      key={key}
                      label={label}
                      value={String(track[key] ?? '')}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('この楽曲を削除しますか？')) removeTrack(track.id);
                    }}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="削除"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
