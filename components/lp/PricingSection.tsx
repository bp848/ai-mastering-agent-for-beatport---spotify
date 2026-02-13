import React from 'react';
import { Check, ArrowRight, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    unit: '円',
    period: '1曲限定',
    desc: 'まずは無料で体験。登録不要。',
    highlight: false,
    cta: '無料で試す',
    href: '#hero',
  },
  {
    name: 'Per Track',
    price: '1,000',
    unit: '円',
    period: '1曲ごと',
    desc: '必要な時だけ。都度購入。',
    highlight: true,
    cta: 'まず無料で1曲試す',
    href: '#hero',
    onSelect: true,
  },
  {
    name: 'Monthly',
    price: '4,980',
    unit: '円',
    period: '月額',
    desc: '月3曲以上リリースするなら最安。',
    highlight: false,
    cta: 'まず無料で1曲試す',
    href: '#hero',
    onSelect: true,
  },
];

interface PricingSectionProps {
  onPerTrackSelect?: () => void;
  onMonthlySelect?: () => void;
}

export default function PricingSection({ onPerTrackSelect, onMonthlySelect }: PricingSectionProps) {
  const scrollToHero = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-2 text-balance text-2xl font-bold text-foreground md:text-3xl">プロのマスタリングが1曲1,000円</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            スタジオ料金の1/10以下。まずは無料で1曲お試しください。
          </p>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 transition-all ${
                plan.highlight
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/50 bg-card'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                  人気
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.unit}</span>
                  <span className="text-xs text-muted-foreground">/ {plan.period}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.desc}</p>
              </div>

              <ul className="mb-6 flex flex-col gap-2.5">
                {plan.name === 'Free' && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      AIマスタリング 1曲
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      7項目AI診断レポート
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Before/After視聴
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      WAV 16bit ダウンロード
                    </li>
                  </>
                )}
                {plan.name === 'Per Track' && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      AIマスタリング 無制限リトライ
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      7項目AI診断レポート
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      WAV 24bit ダウンロード
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      配信 / YouTube / DJプレイ最適化
                    </li>
                  </>
                )}
                {plan.name === 'Monthly' && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      月間無制限マスタリング
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      全Free + Per Track機能
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      優先処理
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      バッチアップロード
                    </li>
                  </>
                )}
              </ul>

              {plan.name === 'Free' && (
                <a
                  href="#hero"
                  onClick={scrollToHero}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary/80"
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
              {plan.name === 'Per Track' && (
                <button
                  type="button"
                  onClick={onPerTrackSelect ?? (() => scrollToHero({ preventDefault: () => {} } as React.MouseEvent))}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  <Zap className="h-4 w-4" />
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {plan.name === 'Monthly' && (
                <button
                  type="button"
                  onClick={onMonthlySelect ?? (() => scrollToHero({ preventDefault: () => {} } as React.MouseEvent))}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary/80"
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border/50 bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            プロのマスタリングエンジニア: <span className="line-through">10,000〜30,000円/曲</span>
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            AI Mastering: <span className="text-primary">1,000円/曲</span> (初回無料)
          </p>
        </div>
      </div>
    </section>
  );
}
