# モバイル・広告トラフィック向けチェックリスト

広告を出し始め、アクセスの多くがスマホである前提のメモとチェックリスト。

## 現状で済んでいること

- **viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover`（`index.html`）
- **safe-area**: `env(safe-area-inset-*)` でノッチ・ホームインジケータ対応（body, モーダル）
- **入力ズーム防止**: 640px 以下で `input/select/textarea` を 16px に（iOS の自動ズーム防止）
- **タップターゲット**: ナビ・主要CTA は `min-h-[44px]` 以上（Apple HIG 推奨）
- **Google 広告**: gtag (AW-952809033) でコンバージョン計測
- **PWA 向け**: `theme-color`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`

## 広告トラフィックで気にすること

1. **LCP / CLS**: 広告経由の離脱を減らすため、初回表示の遅延（Pyodide 読み込み等）は StatusLoader で明示し、レイアウトシフトを抑える。
2. **ファーストビュー**: スマホでは「アップロード → マスタリング」の流れが一画面で分かるようにする（現状の Step 表示で対応）。
3. **コンバージョン**: 購入完了時に `gtag('event', 'conversion', ...)` を送信（`App.tsx` で実装済み）。広告側のコンバージョン設定と ID の一致を確認。
4. **今後ディスプレイ広告を載せる場合**: レスポンシブユニット（例: AdSense の `data-ad-format="auto"`）を使い、モバイルでは縦長バナーを避け、インストリームや記事内 1 ユニットなど CLS に影響しにくい配置にする。

## スマホで確認したい点

- [ ] ナビ・「選択する」「購入してWAVを取得」など主要ボタンが 44px 以上で押しやすいか
- [ ] 結果モーダルが全画面に近い表示で、下部 CTA が safe-area 内に収まっているか
- [ ] 縦向きで Step 表示・分析結果が読めるか（テキストサイズ・折り返し）
- [ ] Pyodide 初回読み込み中の「30秒かかることがあります」がスマホでも見えているか

## 参考

- [Apple HIG - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Google - Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Core Web Vitals](https://web.dev/vitals/)（LCP, FID, CLS）
