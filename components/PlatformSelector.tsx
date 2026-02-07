
import React from 'react';
import type { MasteringTarget } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PlatformSelectorProps {
  currentTarget: MasteringTarget;
  onTargetChange: (target: MasteringTarget) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ currentTarget, onTargetChange }) => {
  const { t } = useTranslation();
  const baseClasses = "flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75";
  const activeClasses = "bg-emerald-600 text-white shadow";
  const inactiveClasses = "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70";

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-400 mb-2 text-center">{t('platform_selector.title')}</h3>
      <div className="flex bg-[#2a2a2a] p-1 rounded-lg space-x-1">
        <button
          onClick={() => onTargetChange('beatport')}
          className={`${baseClasses} ${currentTarget === 'beatport' ? activeClasses : inactiveClasses}`}
          aria-pressed={currentTarget === 'beatport'}
        >
          {t('platform.beatport')}
        </button>
        <button
          onClick={() => onTargetChange('spotify')}
          className={`${baseClasses} ${currentTarget === 'spotify' ? activeClasses : inactiveClasses}`}
          aria-pressed={currentTarget === 'spotify'}
        >
          {t('platform.spotify')}
        </button>
      </div>
    </div>
  );
};

export default PlatformSelector;
