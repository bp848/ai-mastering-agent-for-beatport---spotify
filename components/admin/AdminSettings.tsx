import React, { useState, useEffect } from 'react';
import { getSetting, setSetting, type AdminSettingKey } from '../../services/admin';
import { useTranslation } from '../../contexts/LanguageContext';

const KEYS: { key: AdminSettingKey; label: string; placeholder: string }[] = [
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', placeholder: 'AIza...' },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', placeholder: 'sk_live_...' },
  { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', placeholder: 'pk_live_...' },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const v: Record<string, string> = {};
      for (const { key } of KEYS) {
        v[key] = await getSetting(key);
      }
      setValues(v);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      for (const { key } of KEYS) {
        await setSetting(key, values[key] ?? '');
      }
      setMessage(t('admin.settings.saved'));
    } catch (e) {
      setMessage(t('admin.settings.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">{t('auth.loading')}</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.settings.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.settings.description')}</p>
      <div className="space-y-4 max-w-xl">
        {KEYS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">{label}</label>
            <input
              type="password"
              value={values[key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600"
              autoComplete="off"
            />
          </div>
        ))}
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold uppercase disabled:opacity-50"
          >
            {saving ? t('admin.settings.saving') : t('admin.settings.save')}
          </button>
          {message && (
            <span className="text-xs text-gray-400">{message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
