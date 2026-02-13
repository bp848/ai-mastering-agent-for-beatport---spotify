import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "返金ポリシー | Dance Music Mastering AI",
  description: "Dance Music Mastering AI の返金ポリシー",
}

const sections = [
  {
    title: "1. デジタル提供（ダウンロード/利用権）について",
    body: "本サービスはデジタルコンテンツ（マスタリング済みファイルの提供、または利用権の付与）を含みます。その性質上、原則として購入後の返金・返品はお受けしておりません。",
  },
  {
    title: "2. 例外（返金対象となり得るケース）",
    list: [
      "当社のシステム障害により、購入した提供物が合理的期間内に提供されない場合",
      "二重課金等、当社または決済の不具合が認められる場合",
    ],
  },
  {
    title: "3. 返金手続き",
    body: "返金をご希望の場合は、運営者情報に記載の連絡先（info@plu.plus）へご連絡ください。決済方法により、返金完了まで数日〜数週間かかる場合があります。",
  },
  {
    title: "4. サブスクリプション（提供する場合）",
    body: "サブスクリプションの解約は次回更新日前までに行ってください。日割り返金の有無はプラン説明に従います。",
  },
]

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">Dance Music Mastering AI</span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">返金・キャンセルポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2026-02-11</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border/50 bg-card px-5 py-5">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {section.body && (
                <p className="mt-2 text-sm leading-relaxed text-secondary-foreground">{section.body}</p>
              )}
              {section.list && (
                <ul className="mt-3 space-y-1.5 pl-5">
                  {section.list.map((item) => (
                    <li key={item} className="list-disc text-sm leading-relaxed text-secondary-foreground">{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/legal" className="text-primary underline underline-offset-2 hover:text-primary/80">運営者情報</Link>
          <Link href="/legal/terms" className="text-primary underline underline-offset-2 hover:text-primary/80">利用規約</Link>
          <Link href="/legal/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">プライバシーポリシー</Link>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          ALGORITHM MUSIC TOKYO &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
