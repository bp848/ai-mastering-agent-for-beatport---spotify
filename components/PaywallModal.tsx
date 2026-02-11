import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onGoToPricing: () => void;
}

export default function PaywallModal({ open, onClose, onGoToPricing }: PaywallModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-padding"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl animate-fade-up"
        style={{ background: 'rgba(10,10,14,0.98)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="paywall-title" className="text-lg font-bold text-foreground mb-2">
          {t('paywall.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t('paywall.description')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { onClose(); onGoToPricing(); }}
            className="btn-primary w-full"
          >
            {t('paywall.cta')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('auth.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
