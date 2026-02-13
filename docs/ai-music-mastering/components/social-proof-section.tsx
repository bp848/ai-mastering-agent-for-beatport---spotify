"use client"

import { Star } from "lucide-react"

const testimonials = [
  {
    icon: "P",
    role: "Techno Producer",
    quote: "配信リリース前に毎回使ってる。エンジニアに出すより速くて、品質も遜色ない。",
    rating: 5,
  },
  {
    icon: "P",
    role: "Trance Producer",
    quote: "初めてのリリースで使った。ラウドネス基準に自動で合わせてくれるのが最高。無料で試せたのが決め手。",
    rating: 5,
  },
  {
    icon: "D",
    role: "DJ",
    quote: "DJセットで回してる曲の音圧を揃えるのに使ってる。フロアでの鳴りが明らかに変わった。",
    rating: 5,
  },
  {
    icon: "P",
    role: "House Producer",
    quote: "Before/Afterの比較機能が良い。自分のミックスの問題点も見えて勉強になる。",
    rating: 5,
  },
  {
    icon: "Y",
    role: "DJ / YouTuber",
    quote: "MV用の音源を通したら、YouTube上での聴こえ方が全然違う。DJ MIX動画にも使ってる。",
    rating: 5,
  },
]

export function SocialProofSection() {
  return (
    <section id="reviews" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            User Reviews
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            プロデューサーもDJも使用中
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {`"${t.quote}"`}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {t.icon}
                </div>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
