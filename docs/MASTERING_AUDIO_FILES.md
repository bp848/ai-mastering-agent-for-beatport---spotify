# マスタリング・音加工に関わるファイル一覧

## Python（分析のみ・ブラウザ内 Pyodide で実行）

| ファイル | 役割 |
|----------|------|
| **`mastering_analyzer.py`** | 現在は空。実装は下記 TS 内の文字列と同等。 |
| **`services/audioService.ts`** の `analysisScript`（62–175行付近） | 実体の Python コード。`numpy` / `pyloudnorm` で LUFS・True Peak・RMS・ダイナミックレンジ・位相相関・歪み推定・ノイズフロア・周波数帯域（20–60, 60–250, … 8k–20k）を算出。Pyodide に `runPythonAsync` で渡して実行。 |

※ 分析のみ Python。**音の加工（マスタリング）はすべて TypeScript（Web Audio API）** です。

---

## TypeScript：マスタリング DSP（音加工の本体）

| ファイル | 役割 |
|----------|------|
| **`services/audioService.ts`** | **中核。** ゲイン変換、Tube/テープサチュレーション、Pultec 風低域、EQ、Exciter、M/S Width、Neuro-Drive、**Make-up Gain（ボリューム上げ）**、ソフトクリッパー、リミッター、ブリックウォール、WAV 書き出し。`buildMasteringChain` / `renderMasteredBuffer` / `applyMasteringAndExport`。分析は上記 Python を呼び出し、波形配列は JS で生成。 |

---

## TypeScript：パラメータ導出・AI・安全クランプ

| ファイル | 役割 |
|----------|------|
| **`services/masteringDerivation.ts`** | 分析データ + AI 意思決定から DSP 用パラメータを導出（ゲイン・Tube・Exciter・low_contour・width・low_mono_hz など）。固定キャップではなく分析駆動。 |
| **`services/geminiService.ts`** | Gemini でマスタリング提案 JSON 取得、`clampMasteringParams`（安全クランプ）。 |
| **`services/openaiMastering.ts`** | OpenAI でマスタリング提案（リトライ等で利用）。 |
| **`services/masteringPrompts.ts`** | プラットフォーム別目標（target LUFS / peak）、AI 用プロンプト文。 |
| **`services/feedbackService.ts`** | ユーザーフィードバック（もっと低域／高域など）をパラメータ差分に変換。 |

---

## TypeScript：UI・再生・表示

| ファイル | 役割 |
|----------|------|
| **`components/MasteringAgent.tsx`** | プレビュー再生、波形オーバーレイ、GR メーター、Live Peak、Original/Master 切替、ダウンロード。 |
| **`components/AnalysisDisplay.tsx`** | 分析結果表示（波形・スペクトル等）。 |
| **`components/Waveform.tsx`** | 波形コンポーネント（分析用表示）。 |
| **`components/DiagnosisReport.tsx`** | 診断レポートと「マスタリング実行」ボタン。 |
| **`components/ResultsModal.tsx`** | 結果モーダル（分析タブ・プレビュー＆DL）。 |

---

## 型・テスト

| ファイル | 役割 |
|----------|------|
| **`types.ts`** | `AudioAnalysisData`, `MasteringParams`, `AIDecision`, `EQAdjustment` 等。 |
| **`tests/mastering-derivation-adaptive-dsp.test.ts`** | 導出ロジックのテスト。 |
| **`tests/peak-safe-gain.test.ts`** | ピーク安全ゲインのテスト。 |
| **`tests/ai-safety-guard.test.ts`** | AI 安全ガードのテスト。 |

---

## ボリュームの上げ方（コード上の場所）

- **`services/audioService.ts`** の **Make-up Gain**（約 508–512 行）:
  - `params.gain_adjustment_db` を `dbToLinear` でリニアに変換し、`makeupGain.gain.value` に設定。
  - その前の経路: DC Block → Tube → Pultec → EQ → Exciter → M/S → Neuro-Drive → **makeupGain** → Clipper → Limiter → Brickwall → 出力。
- ゲイン値そのものは **`services/masteringDerivation.ts`** で `targetLufs - analysis.lufs` から算出し、`optimizeMasteringParams`（自己補正ループ）で目標 LUFS に合わせて微調整されたものが `params.gain_adjustment_db` に入る。
