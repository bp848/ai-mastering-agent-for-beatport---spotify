import React from 'react';
import type { MasteringTarget } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PlatformSelectorProps {
  currentTarget: MasteringTarget;
  onTargetChange: (target: MasteringTarget) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ currentTarget, onTargetChange }) => {
  const { t } = useTranslation();

  return (
    <div className="inline-flex rounded-xl border border-border p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {(['beatport', 'spotify'] as const).map((platform) => (
        <button
          key={platform}
          type="button"
          onClick={() => onTargetChange(platform)}
          aria-pressed={currentTarget === platform}
          className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all touch-manipulation ${
            currentTarget === platform
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
        >
          {t(`platform.${platform}`)}
        </button>
      ))}
    </div>
  );
};

export default PlatformSelector;
