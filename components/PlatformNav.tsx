import React from 'react';
import type { PlatformSection } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PlatformNavProps {
  current: PlatformSection;
  onSelect: (section: PlatformSection) => void;
  session: { user: unknown } | null;
  onLoginClick: () => void;
}

export default function PlatformNav({ current, onSelect, session, onLoginClick }: PlatformNavProps) {
  const { t } = useTranslation();
  const items: { id: PlatformSection; labelKey: string }[] = [
    { id: 'mastering', labelKey: 'nav.mastering' },
    { id: 'pricing', labelKey: 'nav.pricing' },
  ];
  return (
    <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
      {items.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={current === id ? 'page' : undefined}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-2 rounded-lg text-sm font-medium transition-colors ${
            current === id
              ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
      <button
        type="button"
        onClick={onLoginClick}
        aria-current={current === 'mypage' ? 'page' : undefined}
        className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-2 rounded-lg text-sm font-medium transition-colors ${
          current === 'mypage'
            ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }`}
      >
        {session?.user ? t('nav.mypage') : t('nav.login')}
      </button>
    </nav>
  );
}
