import { Upload, BarChart3, Headphones, Download } from "lucide-react"

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "アップロード",
    desc: "WAV/MP3/AIFFをドラッグ&ドロップ。登録不要。",
  },
  {
    icon: BarChart3,
    step: "02",
    title: "AI解析",
    desc: "7項目の品質診断。配信基準との差分を自動検出。",
  },
  {
    icon: Headphones,
    step: "03",
    title: "視聴・比較",
    desc: "Before/Afterをワンクリック切替で聴き比べ。",
  },
  {
    icon: Download,
    step: "04",
    title: "ダウンロード",
    desc: "納得したら購入。配信可能なWAVを即座に取得。",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            4ステップで完了
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-border/50 md:block" />
              )}
              <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-card">
                <s.icon className="h-7 w-7 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.step}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
