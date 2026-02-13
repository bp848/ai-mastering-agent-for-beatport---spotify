import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "運営者情報 | Dance Music Mastering AI",
  description: "特定商取引法に基づく表記",
}

const info = [
  { label: "サービス名", value: "Dance Music Mastering AI (AI Mastering Agent)" },
  { label: "運営者 (事業者名)", value: "ALGORITHM MUSIC" },
  { label: "所在地", value: "東京都千代田区神田佐久間町3-37" },
  { label: "連絡先 (メール)", value: "info@plu.plus" },
  {
    label: "連絡先 (電話)",
    value: "03-3851-0111 (お問い合わせ窓口 10:00〜17:00)",
  },
  {
    label: "販売価格",
    value:
      "料金ページに表示 (アプリ内「料金」をご参照ください)",
  },
  {
    label: "商品代金以外の必要料金",
    value: "インターネット接続料金、通信料金等はお客様負担。",
  },
  { label: "支払方法", value: "クレジットカード (Stripe 決済)" },
  {
    label: "提供時期",
    value:
      "決済完了後、直ちにダウンロード/提供 (またはアカウントへ付与)。",
  },
  {
    label: "返品・キャンセル・返金",
    value:
      "デジタルコンテンツの性質上、原則として返品不可。購入前にBefore/After視聴で品質をご確認ください。",
  },
  {
    label: "動作環境",
    value: "最新の Chrome / Edge / Safari / Firefox を推奨。",
  },
]

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-primary"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Dance Music Mastering AI
            </span>
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          運営者情報
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          特定商取引法に基づく表記
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-border/50 bg-card">
          {info.map((item, i) => (
            <div
              key={item.label}
              className={`grid grid-cols-1 gap-1 px-5 py-4 md:grid-cols-3 md:gap-4 ${
                i < info.length - 1 ? "border-b border-border/30" : ""
              }`}
            >
              <dt className="text-sm font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm text-foreground md:col-span-2">
                {item.value}
              </dd>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          本ページは特定商取引法第11条に基づく表示です。
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/legal/terms" className="text-primary underline underline-offset-2 hover:text-primary/80">利用規約</Link>
          <Link href="/legal/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">プライバシーポリシー</Link>
          <Link href="/legal/refund" className="text-primary underline underline-offset-2 hover:text-primary/80">返金ポリシー</Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          ALGORITHM MUSIC TOKYO &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
