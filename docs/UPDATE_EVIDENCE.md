# 更新エビデンス（Evidence of Updates）

このドキュメントは、音割れ対策・フィードバック/リトライ修正・診断レポートのプロ向け強化で行った変更の証跡です。

---

## 1. 音割れ対策（audioService.ts）

| 内容 | 場所 | 証跡 |
|------|------|------|
| ブリックウォール用カーブ | `services/audioService.ts` | `makeBrickwallCurve()` を追加（約311–320行付近）。出力を `Math.max(-1, Math.min(1, x))` で ±1 にクランプ。 |
| リミッター直後に Brickwall 挿入 | 同ファイル | `buildMasteringChain` 内でリミッターの後に `WaveShaper`（brickwall）を接続。`brickwall.curve = makeBrickwallCurve()`、`oversample: '4x'`（約562–567行付近）。 |
| 自己補正のゲイン上乗せ制限 | 同ファイル | `optimizeMasteringParams` 内で `MAX_SELF_CORRECTION_BOOST_DB = 3`、ゲイン上限 `GAIN_CAP_DB = 12`。補正で AI 値から最大 +3 dB までに制限（約666–677行付近）。 |

---

## 2. ゲイン上限・フィードバック（geminiService / feedbackService / MasteringAgent）

| 内容 | 場所 | 証跡 |
|------|------|------|
| ゲイン上限 15→12 dB | `services/geminiService.ts` | `clampMasteringParams` 内で `gain_adjustment_db` の上限を `Math.min(12, ...)` に変更（約9行付近）。 |
| フィードバックで NaN 防止 | `services/feedbackService.ts` | `applyFeedbackAdjustment` で `n(v, fallback)` を使い全パラメータを有効数値に正規化。`tube_drive_amount` 上限 3、`width_amount` 上限 1.4 に合わせて調整（約32–110行付近）。 |
| フィードバック後にクランプ | `components/MasteringAgent.tsx` | `handleRetry` 内で `applyFeedbackAdjustment` の結果を `clampMasteringParams(adjusted)` でクランプしてから `onFeedbackApply(clamped)`（約574–576行付近）。`clampMasteringParams` を `geminiService` から import（約6行付近）。 |

---

## 3. リトライ・UI（ResultsModal）

| 内容 | 場所 | 証跡 |
|------|------|------|
| 結果モーダル初期タブをプレビューに | `components/ResultsModal.tsx` | `slide` の初期値を `1` に変更。`useEffect` で `open` 時に `setSlide(1)`。プレビュー・フィードバック・リトライが最初から表示される（約56–61行付近）。 |
| スライドの aria-label | 同ファイル | 2つ目のドットの `aria-label` に「プレビュー・フィードバック」を追加（約86–88行付近）。 |

---

## 4. 診断レポートのプロ向け強化（DiagnosisReport.tsx）

| 内容 | 場所 | 証跡 |
|------|------|------|
| 判断用サマリ表 | `components/DiagnosisReport.tsx` | 「判断用サマリ（現在値 vs 目標）」セクションを追加。表：指標 / 現在値 / 目標 / 判定（ラウドネス・トゥルーピーク・ダイナミクス・位相・歪み・ノイズフロア・ステレオ幅）（約255–318行付近）。 |
| マスタリング後想定の明示 | 同ファイル | 表の下に「マスタリング後想定: ○○ LUFS 前後、True Peak ≤ ○ dBTP（Brickwall でクリップ防止）」を追加（約314–317行付近）。 |
| チェーンに Brickwall 明記 | 同ファイル | 実行ボタン上のチェーン表記を `… → Limiter` から `… → Limiter → Brickwall (±1)` に変更。その下に「Brickwall: 出力を ±1 に保証。クリップ・割れ防止。」を追加（約424–429行付近）。 |
| レポートをコピー | 同ファイル | `copyReportToClipboard` を追加（約178–193行付近）。「レポートをコピー（判断・共有用）」ボタンでクリップボードにサマリ・マスタリング後想定・チェーンをコピー（約319–324行付近）。`copied` state で「コピーしました」表示（約323行付近）。 |

---

## 5. Neuro-Drive の抑えめ化（audioService.ts）

| 内容 | 場所 | 証跡 |
|------|------|------|
| Air shelf 4.5→3.0 dB | `services/audioService.ts` | `airShelf.gain.value = 3.0`（約527行付近）。 |
| 並列ウェット 0.22→0.16 | 同ファイル | `neuroWetGain.gain.value = 0.16`（約531行付近）。 |

---

## 変更ファイル一覧

- `services/audioService.ts` — ブリックウォール、自己補正制限、Neuro 抑えめ
- `services/geminiService.ts` — ゲイン上限 12 dB
- `services/feedbackService.ts` — NaN 防止・安全なデフォルト
- `components/MasteringAgent.tsx` — フィードバック後にクランプ
- `components/ResultsModal.tsx` — 初期タブをプレビューに
- `components/DiagnosisReport.tsx` — プロ用サマリ表・Brickwall 表記・レポートコピー

---

*最終更新: 上記変更がリポジトリに存在することを前提としたエビデンス一覧です。*
