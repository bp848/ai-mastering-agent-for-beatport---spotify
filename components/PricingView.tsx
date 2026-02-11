import React, { useState, useCallback } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../services/stripeCheckout';

type Tab = 'shot' | 'volume' | 'subscription';

interface PlanCard {
  name: string;
  nameEn: string;
  price: number;
  priceLabel: string;
  priceLabelEn: string;
  perTrack?: number;
  tokenCount?: number;
  features: string[];
  featuresEn: string[];
  best?: boolean;
}

const SHOT_CARDS: PlanCard[] = [
  {
    name: 'Basic', nameEn: 'Basic',
    price: 1000, priceLabel: '¥1,000', priceLabelEn: '$7',
    tokenCount: 1,
    features: ['WAV 16bit / 44.1kHz', 'Tube Saturation', 'Neuro-Drive Engine', 'プレビュー無制限'],
    featuresEn: ['WAV 16bit / 44.1kHz', 'Tube Saturation', 'Neuro-Drive Engine', 'Unlimited previews'],
  },
  {
    name: 'Pro 10', nameEn: 'Pro 10',
    price: 10000, priceLabel: '¥10,000', priceLabelEn: '$67',
    perTrack: 1000, tokenCount: 10,
    features: ['10曲パック', '全DSP機能', 'Self-Correction Loop', 'プレビュー無制限'],
    featuresEn: ['10-track pack', 'Full DSP chain', 'Self-Correction Loop', 'Unlimited previews'],
  },
  {
    name: 'Pro 30', nameEn: 'Pro 30',
    price: 20000, priceLabel: '¥20,000', priceLabelEn: '$133',
    perTrack: 667, best: true, tokenCount: 30,
    features: ['30曲パック', '全DSP機能', 'Self-Correction Loop', '優先処理', '1曲あたり ¥667'],
    featuresEn: ['30-track pack', 'Full DSP chain', 'Self-Correction Loop', 'Priority', '$4.45/track'],
  },
  {
    name: 'Studio 50', nameEn: 'Studio 50',
    price: 30000, priceLabel: '¥30,000', priceLabelEn: '$200',
    perTrack: 600, tokenCount: 50,
    features: ['50曲パック', '全DSP機能', '優先処理', '1曲あたり ¥600'],
    featuresEn: ['50-track pack', 'Full DSP chain', 'Priority', '$4/track'],
  },
  {
    name: 'Studio 100', nameEn: 'Studio 100',
    price: 50000, priceLabel: '¥50,000', priceLabelEn: '$333',
    perTrack: 500, tokenCount: 100,
    features: ['100曲パック', '全DSP機能', '優先処理', '1曲あたり ¥500'],
    featuresEn: ['100-track pack', 'Full DSP chain', 'Priority', '$3.33/track'],
  },
];

const SUBSCRIPTION_CARDS: PlanCard[] = [
  {
    name: 'Monthly 30', nameEn: 'Monthly 30',
    price: 10000, priceLabel: '¥10,000/月', priceLabelEn: '$67/mo',
    perTrack: 333, tokenCount: 30,
    features: ['30曲/月', '全DSP機能', 'Self-Correction Loop', '1曲あたり ¥333'],
    featuresEn: ['30 tracks/mo', 'Full DSP chain', 'Self-Correction Loop', '$2.22/track'],
  },
  {
    name: 'Monthly 50', nameEn: 'Monthly 50',
    price: 30000, priceLabel: '¥30,000/月', priceLabelEn: '$200/mo',
    perTrack: 600, best: true, tokenCount: 50,
    features: ['50曲/月', '全DSP機能', '優先処理', 'Neuro-Drive最適化', '1曲あたり ¥600'],
    featuresEn: ['50 tracks/mo', 'Full DSP', 'Priority', 'Neuro-Drive', '$4/track'],
  },
  {
    name: 'Monthly 100', nameEn: 'Monthly 100',
    price: 50000, priceLabel: '¥50,000/月', priceLabelEn: '$333/mo',
    perTrack: 500, tokenCount: 100,
    features: ['100曲/月', '全DSP機能', '優先処理', 'API利用可', '1曲あたり ¥500'],
    featuresEn: ['100 tracks/mo', 'Full DSP', 'Priority', 'API access', '$3.33/track'],
  },
];

const ENTERPRISE_CARDS: PlanCard[] = [
  {
    name: 'セルフデプロイ', nameEn: 'Self-Deploy',
    price: 100000, priceLabel: '¥100,000', priceLabelEn: '$670',
    features: ['アプリケーション買い切り', '自社サーバーで運用', '無制限トラック', '技術サポート 30日'],
    featuresEn: ['Application purchase', 'Run on your servers', 'Unlimited tracks', '30-day support'],
  },
  {
    name: 'ホワイトラベル', nameEn: 'White Label',
    price: 200000, priceLabel: '¥200,000', priceLabelEn: '$1,330',
    features: ['ブランドカスタマイズ', '再販ライセンス', '無制限トラック', '技術サポート 90日'],
    featuresEn: ['Brand customization', 'Resale license', 'Unlimited tracks', '90-day support'],
  },
];

const Card: React.FC<{
  plan: PlanCard;
  isJa: boolean;
  onSelect: (plan: PlanCard) => void;
  loading?: boolean;
  isLoggedIn?: boolean;
}> = ({ plan, isJa, onSelect, loading, isLoggedIn }) => (
  <div className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
    plan.best
      ? 'border-primary/40 glow-cyan'
      : 'border-border hover:border-primary/20'
  }`} style={{ background: plan.best ? 'rgba(34,211,238,0.03)' : 'rgba(255,255,255,0.02)' }}>
    {plan.best && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        Best Value
      </div>
    )}
    <h3 className="text-base font-bold text-foreground mb-1">
      {isJa ? plan.name : plan.nameEn}
    </h3>
    <div className="mb-5">
      <span className="text-2xl font-extrabold text-foreground tabular-nums font-mono">
        {isJa ? plan.priceLabel : plan.priceLabelEn}
      </span>
      {plan.perTrack && (
        <span className="text-xs text-muted-foreground ml-2">
          ({isJa ? `¥${plan.perTrack}/曲` : `$${(plan.perTrack / 150).toFixed(2)}/track`})
        </span>
      )}
    </div>
    <ul className="flex-1 space-y-2.5 mb-6">
      {(isJa ? plan.features : plan.featuresEn).map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground">
          <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button
      type="button"
      onClick={() => onSelect(plan)}
      disabled={loading}
      className={`w-full py-3 min-h-[48px] rounded-xl font-bold text-sm transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50 ${
        plan.best
          ? 'btn-primary'
          : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
      }`}
    >
      {loading
        ? (isJa ? '送信中...' : 'Loading...')
        : isLoggedIn
          ? (isJa ? '選択する' : 'Select')
          : (isJa ? 'ログインして購入' : 'Sign in to purchase')}
    </button>
  </div>
);

export default function PricingView() {
  const { language, t } = useTranslation();
  const { session, signInWithGoogle } = useAuth();
  const isJa = language === 'ja';
  const [tab, setTab] = useState<Tab>('shot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = useCallback(
    async (plan: PlanCard) => {
      const accessToken = session?.access_token;
      if (!accessToken) { signInWithGoogle(); return; }
      setError(null);
      setLoading(true);
      try {
        const tokenCount = plan.tokenCount ?? 1;
        const { url } = await createCheckoutSession(accessToken, plan.price, isJa ? plan.name : plan.nameEn, tokenCount);
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
        setLoading(false);
      }
    },
    [session?.access_token, signInWithGoogle, isJa]
  );

  const tabs: { id: Tab; label: string; labelEn: string }[] = [
    { id: 'shot', label: '都度払い', labelEn: 'One-time' },
    { id: 'volume', label: '月額', labelEn: 'Monthly' },
    { id: 'subscription', label: 'エンタープライズ', labelEn: 'Enterprise' },
  ];

  return (
    <div className="animate-fade-up space-y-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-bold text-success uppercase tracking-wider">
            {isJa ? '無料プレビュー付き' : 'Free Preview Included'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {t('pricing.title')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          {isJa
            ? '全プランでHybrid-Analog Engineのフル機能。1曲から購入可能、まとめ買いでお得に。'
            : 'Full Hybrid-Analog Engine on all plans. Purchase from a single track, save with bundles.'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-border p-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === tb.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isJa ? tb.label : tb.labelEn}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 text-center">
          {error}
        </div>
      )}

      {/* Cards Grid */}
      {tab === 'shot' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SHOT_CARDS.map((p) => (
            <Card key={p.name} plan={p} isJa={isJa} onSelect={handleSelectPlan} loading={loading} isLoggedIn={!!session} />
          ))}
        </div>
      )}
      {tab === 'volume' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {SUBSCRIPTION_CARDS.map((p) => (
            <Card key={p.name} plan={p} isJa={isJa} onSelect={handleSelectPlan} loading={loading} isLoggedIn={!!session} />
          ))}
        </div>
      )}
      {tab === 'subscription' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {ENTERPRISE_CARDS.map((p) => (
            <Card key={p.name} plan={p} isJa={isJa} onSelect={handleSelectPlan} loading={loading} isLoggedIn={!!session} />
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        {isJa ? '※ 価格はすべて税込。プレビューは全プラン無制限・無料。' : '※ All prices include tax. Preview is unlimited and free.'}
      </p>
    </div>
  );
}
