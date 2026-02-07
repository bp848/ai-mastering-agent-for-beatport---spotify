import React from 'react';
import type { PlatformSection } from '../types';
import { BrandIcon, LibraryIcon, ChecklistIcon, MailIcon, ShareIcon, UserIcon, AdminIcon } from './Icons';
import { useAdmin } from '../contexts/AdminContext';
import { useTranslation } from '../contexts/LanguageContext';

const BASE_SECTIONS: { id: PlatformSection; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'mastering', labelKey: 'nav.mastering', icon: <BrandIcon /> },
  { id: 'library', labelKey: 'nav.library', icon: <LibraryIcon /> },
  { id: 'checklist', labelKey: 'nav.checklist', icon: <ChecklistIcon /> },
  { id: 'email', labelKey: 'nav.email', icon: <MailIcon /> },
  { id: 'sns', labelKey: 'nav.sns', icon: <ShareIcon /> },
  { id: 'mypage', labelKey: 'nav.mypage', icon: <UserIcon /> },
];

interface PlatformNavProps {
  current: PlatformSection;
  onSelect: (section: PlatformSection) => void;
}

export default function PlatformNav({ current, onSelect }: PlatformNavProps) {
  const { isAdmin } = useAdmin();
  const { t } = useTranslation();
  const sections = [
    ...BASE_SECTIONS,
    ...(isAdmin ? [{ id: 'admin' as PlatformSection, labelKey: 'nav.admin', icon: <AdminIcon /> }] : []),
  ];
  return (
    <nav className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 sm:overflow-visible">
      {sections.map(({ id, labelKey, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          title={t(labelKey)}
          className={`flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg text-xs transition-colors shrink-0 touch-manipulation ${
            current === id
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
        </button>
      ))}
    </nav>
  );
}
