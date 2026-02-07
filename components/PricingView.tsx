import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const SHOT_PLANS = [
  { tracks: 1, price: 1000, labelJa: '1曲', labelEn: '1 track' },
  { tracks: 10, price: 10000, labelJa: '10曲', labelEn: '10 tracks' },
  { tracks: 30, price: 20000, labelJa: '30曲', labelEn: '30 tracks' },
  { tracks: 50, price: 30000, labelJa: '50曲', labelEn: '50 tracks' },
  { tracks: 100, price: 50000, labelJa: '100曲', labelEn: '100 tracks' },
  { tracks: null, price: 100000, labelJa: 'セルフデプロイ', labelEn: 'Self-deploy' },
  { tracks: null, price: 200000, labelJa: 'ホワイトラベル', labelEn: 'White label' },
] as const;

const MONTHLY_PLANS = [
  { tracks: 30, price: 10000, labelJa: '30曲', labelEn: '30 tracks' },
  { tracks: 50, price: 30000, labelJa: '50曲', labelEn: '50 tracks' },
  { tracks: 100, price: 50000, labelJa: '100曲', labelEn: '100 tracks' },
] as const;

function formatYen(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toFixed(0)}万`;
  return `¥${n.toLocaleString()}`;
}

export default function PricingView() {
  const { t, language } = useTranslation();
  const isJa = language === 'ja';

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-up space-y-8">
      <h2 className="text-lg font-bold text-white">{t('pricing.title')}</h2>
      <p className="text-zinc-400 text-sm">
        {isJa ? '1曲 1,000円で購入。まとめ買いで単価お得。' : 'Purchase at ¥1,000 per track. Better value with bundles.'}
      </p>

      <section>
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">
          {isJa ? 'ショット（買い切り）' : 'One-time (Shot)'}
        </h3>
        <ul className="space-y-2">
          {SHOT_PLANS.map((plan) => (
            <li
              key={plan.price}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10"
            >
              <span className="text-white font-medium">
                {plan.tracks != null
                  ? (isJa ? `${plan.tracks}曲` : `${plan.tracks} tracks`)
                  : (isJa ? plan.labelJa : plan.labelEn)}
              </span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {formatYen(plan.price)}
                {plan.tracks != null && plan.tracks > 1 && isJa && (
                  <span className="text-zinc-500 font-normal text-xs ml-1">（1曲あたり {formatYen(Math.round(plan.price / plan.tracks))}）</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">
          {isJa ? '月額' : 'Monthly'}
        </h3>
        <ul className="space-y-2">
          {MONTHLY_PLANS.map((plan) => (
            <li
              key={plan.price}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10"
            >
              <span className="text-white font-medium">
                {isJa ? `${plan.tracks}曲/月` : `${plan.tracks} tracks/mo`}
              </span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {formatYen(plan.price)}
                {isJa && <span className="text-zinc-500 font-normal text-xs">/月</span>}
                {!isJa && <span className="text-zinc-500 font-normal text-xs">/mo</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
