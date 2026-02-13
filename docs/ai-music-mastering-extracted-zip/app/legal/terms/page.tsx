import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "利用規約 | Dance Music Mastering AI",
  description: "Dance Music Mastering AI の利用規約",
}

const sections = [
  {
    title: "1. 適用",
    body: "本規約は、運営者（以下「当社」）が提供する本サービスの利用条件を定めるものです。利用者は本規約に同意のうえ本サービスを利用します。",
  },
  {
    title: "2. サービス内容",
    body: "本サービスは、アップロードされた音源データの解析およびマスタリング処理（プレビュー／書き出し）を提供します。処理結果の品質は入力音源、環境、設定に依存します。",
  },
  {
    title: "3. アカウント",
    body: "利用者は、正確な情報をもって登録／ログインを行い、自己の責任においてアカウントを管理します。",
  },
  {
    title: "4. 禁止事項",
    list: [
      "法令または公序良俗に反する行為",
      "第三者の権利（著作権・人格権等）を侵害する音源の無断アップロード",
      "不正アクセス、脆弱性の探索、サービス妨害",
      "決済・クーポン等の不正利用",
    ],
  },
  {
    title: "5. 知的財産権",
    body: "本サービスに関するUI／ソフトウェア／ドキュメント等の権利は当社または正当な権利者に帰属します。利用者のアップロード音源の権利は利用者または権利者に帰属します。",
  },
  {
    title: "6. 音源データの取扱い",
    body: "音源データは、解析・処理・提供のために必要な範囲で取り扱います。詳細はプライバシーポリシーを参照してください。",
  },
  {
    title: "7. 免責・保証の否認",
    body: "当社は、本サービスが特定の目的に適合すること、期待する品質・結果を保証しません。入力音源が既にクリップしている／歪んでいる場合、処理により改善できないことがあります。",
  },
  {
    title: "8. 損害賠償の制限",
    body: "当社の故意または重過失を除き、当社が負う損害賠償責任は、当該取引に関して利用者が当社に支払った金額を上限とします。",
  },
  {
    title: "9. 返金・キャンセル",
    body: "返金・キャンセルの条件は返金ポリシーに定めます。",
  },
  {
    title: "10. 規約の変更",
    body: "当社は必要に応じて本規約を変更できます。変更後は、本ページへの掲示等により周知します。",
  },
  {
    title: "11. 準拠法・管轄",
    body: "本規約は日本法に準拠し、紛争は当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
  },
  {
    title: "12. 事業者情報",
    body: "事業者情報は運営者情報を参照してください。",
    link: { href: "/legal", text: "運営者情報" },
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
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
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Dance Music Mastering AI
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">利用規約</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2026-02-11</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border/50 bg-card px-5 py-5">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {section.body && (
                <p className="mt-2 text-sm leading-relaxed text-secondary-foreground">
                  {section.body}
                  {section.link && (
                    <>
                      {" "}
                      <Link href={section.link.href} className="text-primary underline underline-offset-2 hover:text-primary/80">
                        {section.link.text}
                      </Link>
                    </>
                  )}
                </p>
              )}
              {section.list && (
                <ul className="mt-3 space-y-1.5 pl-5">
                  {section.list.map((item) => (
                    <li key={item} className="list-disc text-sm leading-relaxed text-secondary-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/legal" className="text-primary underline underline-offset-2 hover:text-primary/80">
            運営者情報
          </Link>
          <Link href="/legal/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">
            プライバシーポリシー
          </Link>
          <Link href="/legal/refund" className="text-primary underline underline-offset-2 hover:text-primary/80">
            返金ポリシー
          </Link>
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
