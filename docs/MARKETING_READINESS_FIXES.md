# マーケティング開始前の修正一覧（LP・結果ページ・プレビュー決済・マイページ）

マーケティングを開始しても問題ない水準にするため、実施した課題の抽出と修正です。

---

## 修正ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `index.html` | title / meta description / lang |
| `components/FileUpload.tsx` | キーボード操作（Enter / Space） |
| `components/ResultsModal.tsx` | ダウンロードボタン aria-label |
| `components/DownloadGateModal.tsx` | pending_download 設定、aria-labelledby・id |
| `App.tsx` | ログイン戻りバナー、MyPageView に onNavigateToMastering 渡す |
| `components/MyPageView.tsx` | 「もう1曲マスタリングする」CTA、onNavigateToMastering 受け取り |
| `contexts/LanguageContext.tsx` | flow.post_login_* / mypage.cta_master_again |

---

## 抽出した課題と対応

### LP（ランディング / マスタリング画面）

| 課題 | 対応（ファイル） |
|------|------------------|
| ページタイトル・説明が汎用的で訴求弱い | `index.html`: `title` を「AI Mastering Agent — Beatport / Spotify 配信基準」に変更。`meta name="description"` を追加（ログイン不要プレビュー・Hybrid-Analog Engine を明記）。 |
| `lang` 未指定で SEO・アクセシビリティに不利 | `index.html`: `<html lang="ja">` を指定。 |
| ドロップエリアのキーボード操作ができない | `components/FileUpload.tsx`: `onKeyDown` で Enter / Space 時に `handleClick()` を実行。 |
| 「ログイン不要でプレビューまで」の誘導が弱い | 既対応済み: `HeroEngine` に `flow.preview_no_login`、完了カードに `flow.complete_teaser` を表示。 |

### 結果ページ（ResultsModal）

| 課題 | 対応（ファイル） |
|------|------------------|
| ダウンロードボタンにスクリーンリーダー向け説明がない | `components/ResultsModal.tsx`: フッターのダウンロードボタンに `aria-label` を追加（JA/EN で「ログインが必要な場合あり」を記載）。 |
| 購入文言が決済未実装と食い違う | 既対応済み: 「購入（1曲1,000円）」をやめ、`flow.preview_then_download` で「まず聴く → ダウンロード（ログイン必要）」に統一。 |

### プレビュー・決済（DownloadGate / ログイン）

| 課題 | 対応（ファイル） |
|------|------------------|
| OAuth リダイレクト後に状態が消え、導線が分断される | `components/DownloadGateModal.tsx`: ログイン押下時に `sessionStorage.setItem('pending_download', '1')` を設定。<br>`App.tsx`: セッション取得後 `pending_download === '1'` ならバナー表示（`flow.post_login_banner`）。CTA「マスタリングへ」で `setSection('mastering')`。 |
| モーダルのアクセシビリティ | `components/DownloadGateModal.tsx`: ダイアログに `aria-labelledby="download-gate-title"`、見出しに `id="download-gate-title"` を追加。 |

### マイページ

| 課題 | 対応（ファイル） |
|------|------------------|
| 履歴閲覧後の次のアクションが不明瞭 | `components/MyPageView.tsx`: 空状態・履歴ありの両方に「もう1曲マスタリングする」ボタン（`t('mypage.cta_master_again')`）。`App.tsx` で `onNavigateToMastering={() => setSection('mastering')}` を渡す。 |
| エラー・空・ローディング状態 | 既存のエラー表示・再試行・空状態メッセージを維持（変更なし）。 |

---

## 追加した翻訳キー（LanguageContext）

| キー | 用途 |
|------|------|
| `flow.post_login_banner` | ログイン戻り後のバナー文言 |
| `flow.post_login_cta` | バナー内「マスタリングへ」ボタン |
| `mypage.cta_master_again` | マイページ「もう1曲マスタリングする」 |

---

## 崩してはいけない設計（再掲）

- **ログインなしでプレビューまで聴ける** 流れは維持する。
- 決済を実装するまでは「購入〇円」と書かず、「ログイン後にダウンロード」で誘導する。

---

## 未実装のまま開始する場合の注意

- **決済**: 決済は **Stripe** を予定。現時点では未実装のためダウンロードはログインのみで可能。料金案内は Pricing ページに委ねる。
- **OAuth ポップアップ**: リダイレクト方式のため、ログイン後は一度マスタリング画面で「もう一度プレビューしてダウンロード」となる。バナーで誘導済み。

---

*このドキュメントは、LP・結果ページ・プレビュー決済・マイページをマーケティング開始可能な状態にするための修正記録です。*
