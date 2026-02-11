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
    <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
      {items.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={current === id ? 'page' : undefined}
          className={`min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            current === id
              ? 'text-primary bg-primary/10 border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
      <button
        type="button"
        onClick={onLoginClick}
        aria-current={current === 'mypage' ? 'page' : undefined}
        className={`min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          current === 'mypage'
            ? 'text-primary bg-primary/10 border border-primary/30'
            : session?.user
              ? 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              : 'text-foreground bg-primary/10 border border-primary/20 hover:bg-primary/20'
        }`}
      >
        {session?.user ? t('nav.mypage') : t('nav.login')}
      </button>
    </nav>
  );
}
