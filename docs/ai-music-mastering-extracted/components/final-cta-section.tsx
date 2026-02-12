import { ArrowRight, Zap } from "lucide-react"

export function FinalCtaSection() {
  return (
    <section className="border-t border-border/50 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-8 md:p-12">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
          </div>

          <div className="relative">
            <h2 className="text-balance text-2xl font-bold text-foreground md:text-3xl">
              配信もYouTubeもDJプレイも、プロの音に
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              4,700曲以上の処理実績。リリース・MV・DJセット・ライブPA、あらゆる用途に。
              今すぐ無料で1曲お試しください。登録不要・クレカ不要。
            </p>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="#hero"
                className="animate-pulse-glow flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                <Zap className="h-4 w-4" />
                無料でAIマスタリングを開始
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              30秒で完了 / 登録不要 / すぐに聴ける
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
