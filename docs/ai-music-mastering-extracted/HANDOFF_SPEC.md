# Dance Music Mastering AI - LP再現仕様書

このドキュメントは別のコーディングAIに渡して、本LPを既存プロジェクトに完全再現してもらうための仕様書です。

---

## 技術スタック

- **Next.js 16** (App Router / Turbopack)
- **React 19.2**
- **Tailwind CSS 3** + `tailwindcss-animate`
- **shadcn/ui** (Accordion のみ使用)
- **Lucide React** (アイコン)
- **Google Fonts**: Inter (本文), JetBrains Mono (等幅/ターミナル)
- TypeScript strict

---

## ファイル構成

```
app/
├── layout.tsx           # Root layout (フォント設定, メタデータ)
├── globals.css          # デザイントークン, アニメーション定義
├── page.tsx             # LP ページ (セクション結合)
└── legal/
    ├── page.tsx          # 運営者情報 (特商法表記)
    ├── terms/page.tsx    # 利用規約
    ├── privacy/page.tsx  # プライバシーポリシー
    └── refund/page.tsx   # 返金ポリシー

components/
├── header.tsx                  # 固定ヘッダー + モバイルメニュー
├── hero-section.tsx            # ヒーロー (D&Dアップロード + CTA)
├── social-proof-section.tsx    # レビュー (匿名テスティモニアル5件)
├── how-it-works-section.tsx    # 4ステップ説明
├── features-section.tsx        # 6つの特徴カード
├── mastering-demo-section.tsx  # 3ステップ体験デモ (★最大コンポーネント)
├── pricing-section.tsx         # 料金プラン3列
├── faq-section.tsx             # FAQ (Accordion)
├── final-cta-section.tsx       # 最終CTA
└── footer.tsx                  # フッター (法務リンク)

tailwind.config.ts              # カスタムフォント, shadcn 設定
```

---

## デザイントークン (globals.css)

**カラーパレット (HSL)**:
- `--background`: 220 20% 7% (ダークネイビー)
- `--foreground`: 180 10% 92% (オフホワイト)
- `--card`: 220 18% 10% (カード背景)
- `--primary`: **180 100% 50%** (シアン = ブランドカラー)
- `--primary-foreground`: 220 20% 7% (シアン上のテキスト)
- `--secondary`: 220 15% 15%
- `--muted-foreground`: 220 10% 55%
- `--border`: 220 15% 18%
- `--destructive`: 0 84% 60%
- `--success`: 142 76% 46%
- `--warning`: 38 92% 50%
- `--radius`: 0.625rem

**カスタムアニメーション**:
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px hsl(180 100% 50% / 0.3); }
  50% { box-shadow: 0 0 40px hsl(180 100% 50% / 0.6); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## セクション別仕様

### 1. Header (`header.tsx`)
- `fixed top-0 z-50` / backdrop-blur / border-b
- ロゴ: SVG 3層レイヤーアイコン + "Dance Music Mastering AI"
- Nav: 使い方 / 特徴 / デモ / 料金 / FAQ / レビュー (ページ内アンカー)
- CTA: "1曲無料で試す" → `#hero`
- モバイル: ハンバーガーメニュー (useState toggle)

### 2. Hero (`hero-section.tsx`)
- バッジ: "今だけ1曲無料 - 登録不要・クレカ不要" (ping アニメーション付き緑ドット)
- 見出し: "あなたの曲を **チャート上位の音圧** に仕上げる"
- サブ: "WAVをアップロードするだけ。AIが配信基準を自動解析し、配信・YouTube・DJプレイに最適化されたマスタリングを30秒で完了。"
- ユースケースタグ: 配信リリース / YouTube・MV / DJプレイ / ライブPA
- 統計: 4,700+ 曲 | 30秒 処理 | 0円 初回
- **アップロードエリア**: border-2 border-dashed, primary/40常時表示, shadow-glow, animate-float アイコン, D&D + click対応
- CTAボタン: "無料でAIマスタリングを開始" (animate-pulse-glow)
- 信頼バッジ: 登録不要 | クレカ不要 | すぐに聴ける

### 3. Social Proof (`social-proof-section.tsx`)
- 見出し: "プロデューサーもDJも使用中"
- 5件の匿名レビュー (名前なし、icon+role のみ):
  - P / Techno Producer
  - P / Trance Producer
  - D / DJ
  - P / House Producer
  - Y / DJ / YouTuber
- grid sm:2 lg:3 / star rating 表示

### 4. How It Works (`how-it-works-section.tsx`)
- 4ステップ: アップロード → AI解析 → 視聴・比較 → ダウンロード
- grid md:4 / アイコン + 番号バッジ + 接続線

### 5. Features (`features-section.tsx`)
- 6カード: Hybrid-Analog Engine / 用途別最適化 / 7項目AI診断 / Before-After / 30秒完了 / プロのチェーン
- grid md:2 lg:3

### 6. Mastering Demo (`mastering-demo-section.tsx`) ★最重要
3ステップのインタラクティブUI:

**Step 1 - 分析結果 (AnalysisView)**:
- 配信先タブ4つ: Club Store / Spotify / YouTube / DJ Play
- 7項目テーブル: ラウドネス(-15.5→要対応) / トゥルーピーク / ダイナミクス / 位相 / 歪み / ノイズ / ステレオ幅
- スコアバッジ: 75%
- 推奨チェーン表示
- CTA: "AI マスタリングを実行する"

**Step 2 - 処理中 (ProcessingView)**:
- SVG円形プログレス (0→100%)
- ターミナル風UI (macOSドット + "MASTERING_ENGINE" + "RUNNING")
- 13行のログが600ms間隔で順次表示
- カーソル点滅アニメーション
- 完了後1.2秒でStep 3へ自動遷移

**Step 3 - プレビュー (PreviewView)**:
- Before/After数値比較 (2カラム)
- 再生ボタン + マスタリング後/オリジナル切替
- 波形表示 (120本のバー, 擬似ランダム生成, 再生進捗で色変化)
- リアルタイムピークメーター (グラデーションバー)
- ORIGINAL / AI MASTERED タブ
- 適用済みモジュール一覧 (9個のタグ)
- ファイル情報: WAV 16bit / 44.1kHz 05:14 57.7 MB
- リトライボタン (無料) + 購入ボタン (1000円)

**ステップインジケーター**: 分析 → 実行 → 聴く・購入 (クリックで過去ステップに戻れる)

### 7. Pricing (`pricing-section.tsx`)
- 3プラン: Free (0円/1曲) / Per Track (1,000円/曲, ★人気) / Monthly (4,980円/月)
- 価格アンカー: "プロのマスタリングエンジニア: ~~10,000〜30,000円~~ → AI: 1,000円"
- 全CTA → #hero

### 8. FAQ (`faq-section.tsx`)
- 8問: クレカ不要? / ファイル形式 / 配信基準 / 不満時 / ダウンロード / マスタリング済み / DJユース / YouTubeユース
- shadcn Accordion使用

### 9. Final CTA (`final-cta-section.tsx`)
- "配信もYouTubeもDJプレイも、プロの音に"
- "4,700曲以上の処理実績"
- animate-pulse-glow ボタン

### 10. Footer (`footer.tsx`)
- ロゴ + "ALGORITHM MUSIC TOKYO © 2026"
- リンク: 運営者情報 / 利用規約 / プライバシー / 返金ポリシー / v1.0.0

---

## 法務ページ共通構造
- 独自ヘッダー (ロゴ + "トップに戻る")
- max-w-4xl / rounded-xl border bg-card のセクションカード
- 相互リンク (他の法務ページへ)
- 独自フッター

---

## 重要な実装ポイント

1. **ダークテーマ固定** (.dark クラスは不使用。:root で直接ダーク値を設定)
2. **シアン (#00FFFF)** がブランドカラー。primary で全体に適用
3. **アップロードエリア** は常時 shadow-glow + border-primary/40 で高視認性
4. **ターミナルUI** の背景は `hsl(220 20% 5%)` でさらに暗い
5. **波形** は seed=42 の擬似ランダムで決定論的に生成
6. **「Beatport」の固有名詞は一切使わない** (広告審査対策)
7. **架空の個人名は一切使わない** (P/D/Y + 役割のみ)
8. font-mono は JetBrains Mono (ターミナル/数値表示用)
9. すべてのCTAは `#hero` (アップロードエリア) にリンク
10. shadcn/ui の Accordion のみ外部依存。他はすべてカスタム実装
