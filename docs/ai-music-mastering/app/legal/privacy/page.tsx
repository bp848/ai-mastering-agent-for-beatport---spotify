import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "プライバシーポリシー | Dance Music Mastering AI",
  description: "Dance Music Mastering AI のプライバシーポリシー",
}

const sections = [
  {
    title: "1. 収集する情報",
    body: "当社は、サービスの提供にあたり以下の情報を収集する場合があります。",
    list: [
      "アカウント情報（メールアドレス、パスワードのハッシュ値）",
      "アップロードされた音源データ（解析・処理目的）",
      "決済情報（Stripe経由で処理。当社はカード番号を保持しません）",
      "アクセスログ（IPアドレス、ブラウザ情報、アクセス日時）",
    ],
  },
  {
    title: "2. 利用目的",
    list: [
      "マスタリングサービスの提供・改善",
      "決済処理および購入履歴の管理",
      "サービスの不正利用防止",
      "お問い合わせへの対応",
    ],
  },
  {
    title: "3. 音源データの取扱い",
    body: "アップロードされた音源データは、マスタリング処理のために一時的にサーバーに保存されます。処理完了後、一定期間経過後に自動削除されます。音源データを第三者に提供・共有することはありません。",
  },
  {
    title: "4. 第三者提供",
    body: "法令に基づく場合を除き、利用者の同意なく個人情報を第三者に提供しません。決済処理はStripe, Inc.が行い、同社のプライバシーポリシーが適用されます。",
  },
  {
    title: "5. Cookie等の利用",
    body: "サービスの利用状況の把握およびセッション管理のためにCookieおよび類似技術を使用する場合があります。",
  },
  {
    title: "6. 安全管理措置",
    body: "個人情報の漏洩・滅失・毀損を防止するため、通信の暗号化（TLS）やアクセス制御等の技術的・組織的安全管理措置を講じます。",
  },
  {
    title: "7. お問い合わせ",
    body: "個人情報の開示・訂正・削除等のご請求は、下記までご連絡ください。\nメール: info@plu.plus\n電話: 03-3851-0111（10:00〜17:00）",
  },
  {
    title: "8. 改定",
    body: "本ポリシーは、法令の改正やサービス内容の変更に応じて改定する場合があります。改定後は本ページにて告知します。",
  },
]

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2026-02-11</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border/50 bg-card px-5 py-5">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {section.body && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-secondary-foreground">{section.body}</p>
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
          <Link href="/legal/refund" className="text-primary underline underline-offset-2 hover:text-primary/80">返金ポリシー</Link>
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
