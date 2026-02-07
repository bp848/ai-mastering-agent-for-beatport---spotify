
import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();

  const handleLanguageChange = (lang: 'ja' | 'en') => {
    setLanguage(lang);
  };

  const baseClasses = "px-3 py-1 text-sm rounded-md transition-colors duration-200";
  const activeClasses = "bg-emerald-600 text-white font-semibold";
  const inactiveClasses = "bg-gray-700 hover:bg-gray-600 text-gray-300";

  return (
    <div className="flex items-center space-x-1 p-1 bg-gray-800 rounded-lg">
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
