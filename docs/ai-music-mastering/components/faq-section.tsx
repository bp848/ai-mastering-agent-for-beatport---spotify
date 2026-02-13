"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "無料で試す場合、クレジットカードの登録は必要ですか?",
    a: "不要です。登録もログインも一切なしで、1曲をアップロードしてマスタリング結果を視聴できます。",
  },
  {
    q: "どのファイル形式に対応していますか?",
    a: "WAV, MP3, AIFF, FLACに対応。出力はWAV 16bit/24bitです。24bit/44.1kHz以上のWAVでのアップロードを推奨します。",
  },
  {
    q: "配信基準とは何ですか?",
    a: "主要ダンスミュージックストアではラウドネス -8 LUFS、トゥルーピーク -0.3 dBTP が推奨されています。ストリーミングサービスでは -14 LUFS が標準です。当サービスは配信先に合わせて自動最適化します。",
  },
  {
    q: "マスタリング結果に満足できない場合は?",
    a: "無料で何度でもリトライ可能です。購入前に必ずBefore/Afterで聴き比べができます。",
  },
  {
    q: "購入後のダウンロードはどうなりますか?",
    a: "購入後、マイページから即座にWAVファイルをダウンロードできます。そのまま各配信プラットフォームにアップロード可能です。",
  },
  {
    q: "既にマスタリング済みの曲でも使えますか?",
    a: "使えますが、未マスタリングのミックスダウン(2mix)からの処理を推奨します。二重マスタリングは音質劣化の原因になります。",
  },
  {
    q: "DJセットで使っている曲のパワーアップにも使えますか?",
    a: "はい。新曲のリリースだけでなく、手持ちの曲の音圧・音質を底上げしたいDJにも好評です。フロアで映える音に仕上げたい場合にお試しください。",
  },
  {
    q: "YouTube用の音源にも使えますか?",
    a: "はい。YouTubeのラウドネス正規化(-14 LUFS)に合わせた最適化も可能です。MV・DJ MIX動画・ライブ配信のアーカイブなど、映像用途の音源にも効果的です。",
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            よくある質問
          </h2>
        </div>

        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border/50 bg-card px-5 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
