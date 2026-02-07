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
    <nav className="flex items-center gap-2 sm:gap-4">
      {items.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`text-sm font-medium transition-colors ${
            current === id ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
      <button
        type="button"
        onClick={onLoginClick}
        className={`text-sm font-medium transition-colors ${
          current === 'mypage' ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {session?.user ? t('nav.mypage') : t('nav.login')}
      </button>
    </nav>
  );
}
