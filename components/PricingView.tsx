import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

export default function PricingView() {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-up">
      <h2 className="text-lg font-bold text-white mb-4">{t('pricing.title')}</h2>
      <p className="text-zinc-400 text-sm">{t('pricing.coming_soon')}</p>
    </div>
  );
}
