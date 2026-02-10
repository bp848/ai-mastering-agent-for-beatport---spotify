import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onGoToPricing: () => void;
}

export default function PaywallModal({
  open,
  onClose,
  onGoToPricing,
}: PaywallModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm safe-area-padding"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        className="w-full max-w-md rounded-2xl glass p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="paywall-title" className="text-sm font-black text-white uppercase tracking-widest mb-2">
          {t('paywall.title')}
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          {t('paywall.description')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToPricing();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 min-h-[48px] rounded-xl font-bold text-sm text-black transition-colors touch-manipulation"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: '0 0 16px rgba(34,211,238,0.35)',
            }}
          >
            {t('paywall.cta')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-white transition-colors"
          >
            {t('auth.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
