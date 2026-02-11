import React, { useState, useCallback } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../services/stripeCheckout';

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
  /** 購入時にチャージするダウンロード回数（未指定は 1） */
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
    featuresEn: ['30-track pack', 'Full DSP chain', 'Self-Correction Loop', 'Priority processing', '$4.45/track'],
  },
  {
    name: 'Studio 50', nameEn: 'Studio 50',
    price: 30000, priceLabel: '¥30,000', priceLabelEn: '$200',
    perTrack: 600, tokenCount: 50,
    features: ['50曲パック', '全DSP機能', '優先処理', '1曲あたり ¥600'],
    featuresEn: ['50-track pack', 'Full DSP chain', 'Priority processing', '$4/track'],
  },
  {
    name: 'Studio 100', nameEn: 'Studio 100',
    price: 50000, priceLabel: '¥50,000', priceLabelEn: '$333',
    perTrack: 500, tokenCount: 100,
    features: ['100曲パック', '全DSP機能', '優先処理', '1曲あたり ¥500'],
    featuresEn: ['100-track pack', 'Full DSP chain', 'Priority processing', '$3.33/track'],
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
    features: ['50曲/月', '全DSP機能', '優先処理', 'Neuro-Drive 最適化', '1曲あたり ¥600'],
    featuresEn: ['50 tracks/mo', 'Full DSP chain', 'Priority processing', 'Neuro-Drive optimized', '$4/track'],
  },
  {
    name: 'Monthly 100', nameEn: 'Monthly 100',
    price: 50000, priceLabel: '¥50,000/月', priceLabelEn: '$333/mo',
    perTrack: 500, tokenCount: 100,
    features: ['100曲/月', '全DSP機能', '優先処理', 'API利用可', '1曲あたり ¥500'],
    featuresEn: ['100 tracks/mo', 'Full DSP chain', 'Priority processing', 'API access', '$3.33/track'],
  },
];

const ENTERPRISE_CARDS: PlanCard[] = [
  {
    name: 'セルフデプロイ', nameEn: 'Self-Deploy',
    price: 100000, priceLabel: '¥100,000', priceLabelEn: '$670',
    features: ['アプリケーション買い切り', '自社サーバーで運用', '無制限トラック', '技術サポート 30日'],
    featuresEn: ['Application purchase', 'Run on your servers', 'Unlimited tracks', '30-day tech support'],
  },
  {
    name: 'ホワイトラベル', nameEn: 'White Label',
    price: 200000, priceLabel: '¥200,000', priceLabelEn: '$1,330',
    features: ['ブランドカスタマイズ', '再販ライセンス', '無制限トラック', '技術サポート 90日'],
    featuresEn: ['Brand customization', 'Resale license', 'Unlimited tracks', '90-day tech support'],
  },
];

const Card: React.FC<{
  plan: PlanCard;
  isJa: boolean;
  onSelect: (plan: PlanCard) => void;
  loading?: boolean;
  isLoggedIn?: boolean;
  signInLabel?: string;
}> = ({ plan, isJa, onSelect, loading, isLoggedIn, signInLabel }) => (
  <div className={`relative flex flex-col rounded-xl p-7 transition-all duration-300 ${
    plan.best
      ? 'bg-white/[0.06] border-2 border-cyan-400/50 shadow-xl shadow-cyan-500/20 scale-[1.03]'
      : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
  }`}>
    {plan.best && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 text-black text-xs font-extrabold uppercase tracking-widest whitespace-nowrap shadow-lg shadow-cyan-500/30">
        Best Value
      </div>
    )}
    <h3 className="text-lg font-extrabold text-white mb-2">
      {isJa ? plan.name : plan.nameEn}
    </h3>
    <div className="mb-5">
      <span className="text-3xl font-extrabold text-white tabular-nums">
        {isJa ? plan.priceLabel : plan.priceLabelEn}
      </span>
      {plan.perTrack && (
        <span className="text-sm text-zinc-400 ml-2 font-semibold">
          ({isJa ? `¥${plan.perTrack}/曲` : `$${(plan.perTrack / 150).toFixed(2)}/track`})
        </span>
      )}
    </div>
    <ul className="flex-1 space-y-3 mb-7">
      {(isJa ? plan.features : plan.featuresEn).map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
          <span className="text-cyan-400 mt-0.5 shrink-0 text-base">✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button
      type="button"
      onClick={() => onSelect(plan)}
      disabled={loading}
      className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all active:scale-[0.97] touch-manipulation disabled:opacity-60 ${
        plan.best
          ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300 shadow-xl shadow-cyan-500/30'
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
      }`}
    >
      {loading ? (isJa ? '送信中...' : 'Loading...') : isLoggedIn ? (isJa ? '選択する' : 'Select') : (signInLabel ?? (isJa ? 'ログインして購入' : 'Sign in to purchase'))}
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
      if (!accessToken) {
        signInWithGoogle();
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const tokenCount = plan.tokenCount ?? 1;
        const { url } = await createCheckoutSession(
          accessToken,
          plan.price,
          isJa ? plan.name : plan.nameEn,
          tokenCount
        );
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
        setLoading(false);
      }
    },
    [session?.access_token, signInWithGoogle, isJa]
  );

  const tabs: { id: Tab; label: string; labelEn: string }[] = [
    { id: 'shot', label: 'ショット（都度払い）', labelEn: 'One-time (Shot)' },
    { id: 'volume', label: '月額サブスクリプション', labelEn: 'Monthly Subscription' },
    { id: 'subscription', label: 'エンタープライズ', labelEn: 'Enterprise' },
  ];

  return (
    <div className="animate-fade-up space-y-10">
      {/* ── Header: 無料プレビュー → 気に入ったら購入 ── */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500/15 border border-green-400/40 shadow-lg shadow-green-500/10">
          <span className="text-sm font-extrabold text-green-300 uppercase tracking-wider">
            {isJa ? '無料プレビュー可能' : 'Free Preview Available'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          {t('pricing.title')}
        </h2>
        <p className="text-base sm:text-lg text-white font-semibold max-w-2xl mx-auto">
          {t('pricing.free_preview_cta')}
        </p>
        <p className="text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {isJa
            ? '1曲から購入可能。まとめ買い・月額でさらにお得に。全プランで Hybrid-Analog Engine のフル機能をご利用いただけます。'
            : 'Purchase from a single track. Save more with bundles and subscriptions. All plans include the full Hybrid-Analog Engine.'}
        </p>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-white/[0.05] border border-white/[0.12] p-1.5 shadow-lg">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-5 sm:px-7 py-3 rounded-lg text-sm font-extrabold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black shadow-xl shadow-cyan-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {isJa ? t.label : t.labelEn}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 text-center">
          {error}
        </div>
      )}

      {/* ── Cards Grid ── */}
      {tab === 'shot' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SHOT_CARDS.map((p) => (
            <Card
              key={p.name}
              plan={p}
              isJa={isJa}
              onSelect={handleSelectPlan}
              loading={loading}
              isLoggedIn={!!session}
              signInLabel={isJa ? 'ログインして購入' : 'Sign in to purchase'}
            />
          ))}
        </div>
      )}
      {tab === 'volume' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {SUBSCRIPTION_CARDS.map((p) => (
            <Card
              key={p.name}
              plan={p}
              isJa={isJa}
              onSelect={handleSelectPlan}
              loading={loading}
              isLoggedIn={!!session}
              signInLabel={isJa ? 'ログインして購入' : 'Sign in to purchase'}
            />
          ))}
        </div>
      )}
      {tab === 'subscription' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {ENTERPRISE_CARDS.map((p) => (
            <Card
              key={p.name}
              plan={p}
              isJa={isJa}
              onSelect={handleSelectPlan}
              loading={loading}
              isLoggedIn={!!session}
              signInLabel={isJa ? 'ログインして購入' : 'Sign in to purchase'}
            />
          ))}
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
