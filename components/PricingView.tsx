import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

/* ══════════════════════════════════════════════════════════════════
   PricingView — SaaS-standard Tier Card Layout
   Shot / Volume / Subscription をタブ切替、Best Value にシアン発光
   ══════════════════════════════════════════════════════════════════ */

type Tab = 'shot' | 'volume' | 'subscription';

interface PlanCard {
  name: string;
  nameEn: string;
  price: number;
  priceLabel: string;
  priceLabelEn: string;
  perTrack?: number;
  features: string[];
  featuresEn: string[];
  best?: boolean;
}

const SHOT_CARDS: PlanCard[] = [
  {
    name: 'Basic', nameEn: 'Basic',
    price: 1000, priceLabel: '¥1,000', priceLabelEn: '¥1,000',
    features: ['WAV 16bit / 44.1kHz', 'Tube Saturation', 'Neuro-Drive Engine', 'プレビュー無制限'],
    featuresEn: ['WAV 16bit / 44.1kHz', 'Tube Saturation', 'Neuro-Drive Engine', 'Unlimited previews'],
  },
  {
    name: 'Pro 10', nameEn: 'Pro 10',
    price: 10000, priceLabel: '¥10,000', priceLabelEn: '¥10,000',
    perTrack: 1000,
    features: ['10曲パック', '全DSP機能', 'Self-Correction Loop', 'プレビュー無制限'],
    featuresEn: ['10-track pack', 'Full DSP chain', 'Self-Correction Loop', 'Unlimited previews'],
  },
  {
    name: 'Pro 30', nameEn: 'Pro 30',
    price: 20000, priceLabel: '¥20,000', priceLabelEn: '¥20,000',
    perTrack: 667, best: true,
    features: ['30曲パック', '全DSP機能', 'Self-Correction Loop', '優先処理', '1曲あたり ¥667'],
    featuresEn: ['30-track pack', 'Full DSP chain', 'Self-Correction Loop', 'Priority processing', '¥667 per track'],
  },
  {
    name: 'Studio 50', nameEn: 'Studio 50',
    price: 30000, priceLabel: '¥30,000', priceLabelEn: '¥30,000',
    perTrack: 600,
    features: ['50曲パック', '全DSP機能', '優先処理', '1曲あたり ¥600'],
    featuresEn: ['50-track pack', 'Full DSP chain', 'Priority processing', '¥600 per track'],
  },
  {
    name: 'Studio 100', nameEn: 'Studio 100',
    price: 50000, priceLabel: '¥50,000', priceLabelEn: '¥50,000',
    perTrack: 500,
    features: ['100曲パック', '全DSP機能', '優先処理', '1曲あたり ¥500'],
    featuresEn: ['100-track pack', 'Full DSP chain', 'Priority processing', '¥500 per track'],
  },
];

const SUBSCRIPTION_CARDS: PlanCard[] = [
  {
    name: 'Monthly 30', nameEn: 'Monthly 30',
    price: 10000, priceLabel: '¥10,000/月', priceLabelEn: '¥10,000/mo',
    perTrack: 333,
    features: ['30曲/月', '全DSP機能', 'Self-Correction Loop', '1曲あたり ¥333'],
    featuresEn: ['30 tracks/mo', 'Full DSP chain', 'Self-Correction Loop', '¥333 per track'],
  },
  {
    name: 'Monthly 50', nameEn: 'Monthly 50',
    price: 30000, priceLabel: '¥30,000/月', priceLabelEn: '¥30,000/mo',
    perTrack: 600, best: true,
    features: ['50曲/月', '全DSP機能', '優先処理', 'Neuro-Drive 最適化', '1曲あたり ¥600'],
    featuresEn: ['50 tracks/mo', 'Full DSP chain', 'Priority processing', 'Neuro-Drive optimized', '¥600 per track'],
  },
  {
    name: 'Monthly 100', nameEn: 'Monthly 100',
    price: 50000, priceLabel: '¥50,000/月', priceLabelEn: '¥50,000/mo',
    perTrack: 500,
    features: ['100曲/月', '全DSP機能', '優先処理', 'API利用可', '1曲あたり ¥500'],
    featuresEn: ['100 tracks/mo', 'Full DSP chain', 'Priority processing', 'API access', '¥500 per track'],
  },
];

const ENTERPRISE_CARDS: PlanCard[] = [
  {
    name: 'セルフデプロイ', nameEn: 'Self-Deploy',
    price: 100000, priceLabel: '¥100,000', priceLabelEn: '¥100,000',
    features: ['アプリケーション買い切り', '自社サーバーで運用', '無制限トラック', '技術サポート 30日'],
    featuresEn: ['Application purchase', 'Run on your servers', 'Unlimited tracks', '30-day tech support'],
  },
  {
    name: 'ホワイトラベル', nameEn: 'White Label',
    price: 200000, priceLabel: '¥200,000', priceLabelEn: '¥200,000',
    features: ['ブランドカスタマイズ', '再販ライセンス', '無制限トラック', '技術サポート 90日'],
    featuresEn: ['Brand customization', 'Resale license', 'Unlimited tracks', '90-day tech support'],
  },
];

const Card: React.FC<{ plan: PlanCard; isJa: boolean }> = ({ plan, isJa }) => (
  <div className={`relative flex flex-col rounded-2xl p-6 transition-all ${
    plan.best
      ? 'glass-elevated glow-cyan scale-[1.02]'
      : 'glass hover:border-white/15'
  }`}>
    {plan.best && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-500 text-black text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        Best Value
      </div>
    )}
    <h3 className="text-base font-bold text-white mb-1">
      {isJa ? plan.name : plan.nameEn}
    </h3>
    <div className="mb-4">
      <span className="text-2xl font-extrabold text-white tabular-nums">
        {isJa ? plan.priceLabel : plan.priceLabelEn}
      </span>
      {plan.perTrack && (
        <span className="text-xs text-zinc-500 ml-2">
          ({isJa ? `¥${plan.perTrack}/曲` : `¥${plan.perTrack}/track`})
        </span>
      )}
    </div>
    <ul className="flex-1 space-y-2 mb-6">
      {(isJa ? plan.features : plan.featuresEn).map((f) => (
        <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
          <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button
      type="button"
      className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] touch-manipulation ${
        plan.best
          ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
      }`}
    >
      {isJa ? '選択する' : 'Select'}
    </button>
  </div>
);

export default function PricingView() {
  const { language, t } = useTranslation();
  const isJa = language === 'ja';
  const [tab, setTab] = useState<Tab>('shot');

  const tabs: { id: Tab; label: string; labelEn: string }[] = [
    { id: 'shot', label: 'ショット（都度払い）', labelEn: 'One-time (Shot)' },
    { id: 'volume', label: '月額サブスクリプション', labelEn: 'Monthly Subscription' },
    { id: 'subscription', label: 'エンタープライズ', labelEn: 'Enterprise' },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      {/* ── Header: 無料プレビュー → 気に入ったら購入 ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
            {isJa ? '無料' : 'Free'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          {t('pricing.title')}
        </h2>
        <p className="text-sm sm:text-base text-cyan-200/90 font-medium max-w-lg mx-auto">
          {t('pricing.free_preview_cta')}
        </p>
        <p className="text-xs text-zinc-500 max-w-lg mx-auto">
          {isJa
            ? '1曲から購入可能。まとめ買い・月額でさらにお得に。全プランで Hybrid-Analog Engine のフル機能をご利用いただけます。'
            : 'Purchase from a single track. Save more with bundles and subscriptions. All plans include the full Hybrid-Analog Engine.'}
        </p>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isJa ? t.label : t.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {tab === 'shot' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SHOT_CARDS.map((p) => <Card key={p.name} plan={p} isJa={isJa} />)}
        </div>
      )}
      {tab === 'volume' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {SUBSCRIPTION_CARDS.map((p) => <Card key={p.name} plan={p} isJa={isJa} />)}
        </div>
      )}
      {tab === 'subscription' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {ENTERPRISE_CARDS.map((p) => <Card key={p.name} plan={p} isJa={isJa} />)}
        </div>
      )}

      {/* ── Note ── */}
      <p className="text-center text-[10px] text-zinc-600">
        {isJa
          ? '※ 価格はすべて税込表示です。プレビューは全プラン無制限・無料です。'
          : '※ All prices include tax. Preview is unlimited and free on all plans.'}
      </p>
    </div>
  );
}
