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
    <div className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground uppercase w-24 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-sm text-foreground truncate">{value || '—'}</span>
      {value && (
        <button
          type="button"
          onClick={copy}
          className="p-1.5 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
          title="コピー"
        >
          <CopyIcon />
        </button>
      )}
      {copied && <span className="text-xs text-primary uppercase">Copied</span>}
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
    <section className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Library</p>
            <h2 className="text-2xl font-bold text-foreground">楽曲ライブラリ</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold uppercase hover:bg-primary/30 transition-colors"
          >
            {showAdd ? 'キャンセル' : '+ 楽曲を追加'}
          </button>
        </div>

        {showAdd && (
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">新規楽曲（メタ情報）</p>
            {FIELDS.filter((f) => f.key !== 'id' && f.key !== 'createdAt').map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-24 shrink-0">{label}</label>
                <input
                  type="text"
                  value={(newTrack[key as keyof LibraryTrack] as string) ?? ''}
                  onChange={(e) => setNewTrack((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
                  placeholder={label}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase hover:brightness-110 transition-colors"
            >
              追加
            </button>
          </div>
        )}

        <div className="space-y-2">
          {tracks.length === 0 && !showAdd && (
            <div className="py-16 text-center text-muted-foreground text-sm rounded-xl border border-border/50 bg-card">
              楽曲がありません。追加するか、マスタリング完了後に「ライブラリに保存」から登録できます。
            </div>
          )}
          {tracks.map((track) => (
            <div
              key={track.id}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId((id) => (id === track.id ? null : track.id))}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-card/80 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xl font-bold">
                  {track.artist.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist} · {track.genre}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(track.createdAt).toLocaleDateString('ja-JP')}
                </span>
                <span className="text-muted-foreground">{expandedId === track.id ? '▲' : '▼'}</span>
              </button>
              {expandedId === track.id && (
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <div className="rounded-xl border border-border/50 bg-secondary/50 p-4 space-y-0">
                  {FIELDS.map(({ key: fieldKey, label }) => (
                    <React.Fragment key={String(fieldKey)}>
                      <CopyableField
                        label={label}
                        value={String(track[fieldKey] ?? '')}
                      />
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('この楽曲を削除しますか？')) removeTrack(track.id);
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
    </section>
  );
}
