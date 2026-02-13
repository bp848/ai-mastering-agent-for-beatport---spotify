import React from 'react';
import { Cpu, BarChart3, Headphones, Target, Gauge, Layers } from 'lucide-react';

const features = [
  { icon: Cpu, title: 'Hybrid-Analog Engine', desc: '真空管サチュレーション + Pultec EQ + Neuro-Drive。AIが最適な組み合わせを自動選択。' },
  { icon: Target, title: '用途別に自動最適化', desc: '配信ストア (-9 LUFS) / ストリーミング (-14 LUFS) / YouTube (-14 LUFS) / DJプレイ用に1クリックで最適化。' },
  { icon: BarChart3, title: '7項目AI診断', desc: 'ラウドネス・トゥルーピーク・ダイナミクス・位相・歪み・ノイズ・ステレオ幅を即座に判定。' },
  { icon: Headphones, title: 'Before / After 聴き比べ', desc: 'マスタリング前後をワンクリックで切り替え。波形とリアルタイムピークメーターで視覚的に確認。' },
  { icon: Gauge, title: '30秒で完了', desc: 'アップロードから視聴まで30秒。やり直しも無料。納得いくまで何度でも調整。' },
  { icon: Layers, title: 'プロのチェーン', desc: 'Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall。全工程を可視化。' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Technology</p>
          <h2 className="mt-2 text-balance text-2xl font-bold text-foreground md:text-3xl">なぜ配信で通用する音になるのか</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            物理モデリングとAI解析のハイブリッド。プロのマスタリングエンジニアの判断をアルゴリズムで再現。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-primary/30 hover:bg-card/80"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
