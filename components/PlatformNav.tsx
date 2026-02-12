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
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 rounded-lg text-sm font-medium transition-colors ${
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
        className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 rounded-lg text-sm font-medium transition-colors ${
          current === 'mypage'
            ? 'text-primary bg-primary/10 border border-primary/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
      >
        {session?.user ? t('nav.mypage') : t('nav.login')}
      </button>
    </nav>
  );
}
