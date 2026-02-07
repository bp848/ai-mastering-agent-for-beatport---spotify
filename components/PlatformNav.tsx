import React from 'react';
import type { PlatformSection } from '../types';
import { BrandIcon, LibraryIcon, ChecklistIcon, MailIcon, ShareIcon } from './Icons';

const SECTIONS: { id: PlatformSection; label: string; icon: React.ReactNode }[] = [
  { id: 'mastering', label: 'マスタリング', icon: <BrandIcon /> },
  { id: 'library', label: 'ライブラリ', icon: <LibraryIcon /> },
  { id: 'checklist', label: 'プレイリストチェック', icon: <ChecklistIcon /> },
  { id: 'email', label: 'メール', icon: <MailIcon /> },
  { id: 'sns', label: 'SNS投稿', icon: <ShareIcon /> },
];

interface PlatformNavProps {
  current: PlatformSection;
  onSelect: (section: PlatformSection) => void;
}

export default function PlatformNav({ current, onSelect }: PlatformNavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
      {SECTIONS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            current === id
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-gray-500 border border-transparent hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center opacity-80">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
