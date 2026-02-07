
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
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onTargetChange('beatport')}
        className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all touch-manipulation ${
          currentTarget === 'beatport'
            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
            : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-zinc-300'
        }`}
        aria-pressed={currentTarget === 'beatport'}
      >
        {t('platform.beatport')}
      </button>
      <button
        onClick={() => onTargetChange('spotify')}
        className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all touch-manipulation ${
          currentTarget === 'spotify'
            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
            : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-zinc-300'
        }`}
        aria-pressed={currentTarget === 'spotify'}
      >
        {t('platform.spotify')}
      </button>
    </div>
  );
};

export default PlatformSelector;
