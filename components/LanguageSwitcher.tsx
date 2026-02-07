
import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();

  const handleLanguageChange = (lang: 'ja' | 'en') => {
    setLanguage(lang);
  };

  const baseClasses = "px-3 py-2 min-h-[40px] text-xs rounded-lg transition-colors duration-200 touch-manipulation";
  const activeClasses = "bg-cyan-500/30 text-cyan-300 font-medium";
  const inactiveClasses = "text-zinc-500 hover:text-zinc-300 hover:bg-white/5";

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleLanguageChange('ja')}
        className={`${baseClasses} ${language === 'ja' ? activeClasses : inactiveClasses}`}
        aria-pressed={language === 'ja'}
      >
        {t('language.ja')}
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`${baseClasses} ${language === 'en' ? activeClasses : inactiveClasses}`}
        aria-pressed={language === 'en'}
      >
        {t('language.en')}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
