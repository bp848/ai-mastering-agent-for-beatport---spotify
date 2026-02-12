import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function MasteringDemoSection() {
  const [step] = useState<'analysis' | 'processing' | 'preview'>('analysis');

  const scrollToHero = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="before-after" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Live Demo</p>
          <h2 className="mt-2 text-balance text-2xl font-bold text-foreground md:text-3xl">
            アップロード後の体験をそのまま再現
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            分析 → AI処理 → プレビュー。実際のUI体験をこのページで確認できます。
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {['分析', '実行', '聴く・購入'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 md:w-10 bg-border" />}
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {i + 1}
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm md:p-6">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-xs text-muted-foreground">診断サマリ（デモ）</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              +7.5 dB のブースト、低域最適化、サチュレーションを適用します。
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall
            </p>
          </div>
          <button
            onClick={scrollToHero}
            className="animate-pulse-glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 md:text-base"
          >
            AI マスタリングを実行する（実際は上でアップロード）
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <a
            href="#hero"
            onClick={scrollToHero}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            自分の曲で試す
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
