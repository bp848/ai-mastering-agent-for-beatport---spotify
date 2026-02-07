import React, { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AdminAIAds() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = () => {
    setLoading(true);
    setResult(null);
    // TODO: Edge Function でファネル・分析サマリを送り、Gemini に地域・広告文・レスポンシブディスプレイ案を生成させる
    setTimeout(() => {
      setResult(
        '【AI 広告提案】\n・地域: 日本、米国、英国を優先。\n・広告文: "Don\'t use this AI mastering. You\'ll cancel the others."\n・レスポンシブディスプレイ: 前後比較のビジュアル＋短いキャッチ。'
      );
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">
        {t('admin.aiads.title')}
      </h2>
      <p className="text-xs text-gray-500">{t('admin.aiads.description')}</p>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold uppercase disabled:opacity-50"
      >
        {loading ? t('admin.aiads.generating') : t('admin.aiads.generate')}
      </button>
      {result && (
        <pre className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
