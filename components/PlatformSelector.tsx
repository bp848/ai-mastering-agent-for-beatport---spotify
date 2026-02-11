
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
    <div className="flex gap-3 sm:gap-4 flex-wrap">
      <button
        onClick={() => onTargetChange('beatport')}
        className={`px-6 py-3.5 min-h-[52px] rounded-2xl text-base sm:text-lg font-bold transition-all touch-manipulation ${
          currentTarget === 'beatport'
            ? 'bg-cyan-500/30 text-cyan-200 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20'
            : 'bg-white/5 text-zinc-400 border-2 border-white/10 hover:bg-white/10 hover:text-zinc-300 hover:border-white/20'
        }`}
        aria-pressed={currentTarget === 'beatport'}
      >
        {t('platform.beatport')}
      </button>
      <button
        onClick={() => onTargetChange('spotify')}
        className={`px-6 py-3.5 min-h-[52px] rounded-2xl text-base sm:text-lg font-bold transition-all touch-manipulation ${
          currentTarget === 'spotify'
            ? 'bg-cyan-500/30 text-cyan-200 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20'
            : 'bg-white/5 text-zinc-400 border-2 border-white/10 hover:bg-white/10 hover:text-zinc-300 hover:border-white/20'
        }`}
        aria-pressed={currentTarget === 'spotify'}
      >
        {t('platform.spotify')}
      </button>
    </div>
  );
};

export default PlatformSelector;
