import { Cpu, BarChart3, Headphones, Target, Gauge, Layers } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

const features = [
  { icon: Cpu, title: 'Hybrid-Analog Engine', desc: '真空管サチュレーション + Pultec EQ + Neuro-Drive。AIが最適な組み合わせを自動選択。' },
  { icon: Target, title: '用途別に自動最適化', desc: '配信ストア (-9 LUFS) / ストリーミング (-14 LUFS) / YouTube (-14 LUFS) / DJプレイ用に1クリックで最適化。' },
  { icon: BarChart3, title: '7項目AI診断', desc: 'ラウドネス・トゥルーピーク・ダイナミクス・位相・歪み・ノイズ・ステレオ幅を即座に判定。' },
  { icon: Headphones, title: 'Before / After 聴き比べ', desc: 'マスタリング前後をワンクリックで切り替え。波形とリアルタイムピークメーターで視覚的に確認。' },
  { icon: Gauge, title: '30秒で完了', desc: 'アップロードから視聴まで30秒。やり直しも無料。納得いくまで何度でも調整。' },
  { icon: Layers, title: 'プロのチェーン', desc: 'Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall。全工程を可視化。' },
];

export default function FeaturesSection() {
  const { language, t } = useTranslation();
  const ja = language === 'ja';

  return (
    <section id="features" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/80">Japanese Audio Precision</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {ja ? '30年の技術を、伝説の機材のDNAとともに。' : '30 Years of Mastery. The DNA of Legends.'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">
            {ja
              ? 'Roland、Technics、Pioneer。世界を席巻した日本製機材たちが大切にしてきた「音への執念」と「絶対的な信頼」。私たちはその魂をAIという新しい器に移植しました。'
              : 'The obsession with sound that made Roland, Technics, and Pioneer global icons. We’ve transplanted that same Japanese heritage into a state-of-the-art AI mastering engine.'
            }
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="hardware-panel group rounded-lg border border-white/5 p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(180_100%_50%/0.1)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-primary/20 text-primary shadow-[0_0_15px_hsl(180_100%_50%/0.2)]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="led-cyan text-sm font-bold tracking-wider uppercase">{f.title}</h3>
              <p className="mt-2 text-xs leading-loose text-muted-foreground/80">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
