# 現状の問題一覧

プロジェクトのコード・仕様・ドキュメントを確認し、洗い出した問題です。

---

## 1. 重大：Beatport 目標 LUFS の不整合

**現象:** Beatport の目標 LUFS がファイル間で **-7.0** と **-8.0** に分かれており、スコア・表示・自己補正が一致していません。

| 場所 | 値 | ファイル:行 |
|------|-----|-------------|
| スコア計算（診断%） | **-8.0** | `DiagnosisReport.tsx` L20 `calculateScore` |
| 診断表示・lufsGap | **-7.0** | `DiagnosisReport.tsx` L94 |
| 分析ログ | -7.0 | `App.tsx` L113 |
| 自己補正の target_lufs | **-8.0** | `App.tsx` L181 |
| Gemini プロンプト | -7.0 | `geminiService.ts` L17 |
| ロケール・ResultsModal | -7.0 | `LanguageContext.tsx`, `ResultsModal.tsx` |
| AnalysisDisplay good range | -8.0〜-6.0, target -7.0 | `AnalysisDisplay.tsx` L16 |

**影響:** 診断スコアは -8.0 基準で計算される一方、UI メッセージや AI は -7.0 を目標にしているため、ユーザーに示す「目標」と「スコアの基準」が食い違います。自己補正ループは -8.0 で回っているため、Beatport を「-7.0 で揃える」か「-8.0 で揃える」かを仕様で決め、コード全体で統一する必要があります。

---

## 2. 重大：types.ts の重複定義

**現象:** 以下のインターフェースが **2 回ずつ** 定義されています。

- **LibraryTrack**  
  - 1 つ目 (L64–76): `fileName`, `masteringTarget`, `artworkUrl`（データURL or 空）  
  - 2 つ目 (L96–107): `notes` あり、`fileName` / `masteringTarget` なし
- **PlaylistCheckItem** (L79–86 と L112–118)  
  - 1 つ目: `platform: 'spotify' | 'beatport' | ...`  
  - 2 つ目: `platform: PlaylistPlatform`
- **EmailContact** (L89–94 と L121–125)  
  - 定義内容はほぼ同じ

**影響:** 後から定義された型が前の定義を上書きするため、`LibraryTrack` を使うコードが `fileName` / `masteringTarget` を期待していると型エラーや実行時不整合になり得ます。1 つの定義にまとめ、必要なプロパティを統合する必要があります。

---

## 3. 重要：WAV 書き出しがワークフロー仕様と不一致

**docs/MASTERING_WORKFLOW.md の要求:**

- 配信用は **16 bit / 44.1 kHz** にダウンコンバート
- **Dither（TPDF 推奨）** を 24bit→16bit 時に適用することが望ましい

**現状の audioService.ts:**

- `bufferToWave()` は **元の buffer の sampleRate をそのまま** 使用（48 kHz アップロードなら 48 kHz のまま出力）
- 16 bit 化は `(sample * 32767) | 0` の単純な丸めのみで、**Dither なし**
- 44.1 kHz へのリサンプリング処理は **なし**

**影響:** Beatport 納品推奨（16 bit / 44.1 kHz + Dither）と実装が一致しておらず、ドキュメントと実装のギャップが残っています。

---

## 4. 重要：自己補正ループのデフォルト target_lufs

**現象:** `audioService.ts` の `optimizeMasteringParams` で:

```ts
const TARGET_LUFS = aiParams.target_lufs ?? -9.0;
```

他コンポーネントは Beatport **-7** / **-8**、Spotify **-14** を使っているのに対し、ここだけ **-9.0** がデフォルトです。

**影響:** `target_lufs` が渡り損ねた場合に、意図しない -9.0 で補正が走る可能性があります。Beatport/Spotify に合わせたデフォルトにするか、呼び出し元で必ず `target_lufs` を渡すようにする必要があります。

---

## 5. 中：Neuro-Drive のログと実装の不一致

**現象:** `App.tsx` のアクションログでは:

- 「Energy Filter: **250Hz** HPF」

と表示していますが、`audioService.ts` の Neuro-Drive 実装では:

```ts
energyFilter.frequency.value = 800;  // 800 Hz
```

**影響:** ユーザーやサポートが「250 Hz でキック/ベース干渉を避けている」と理解する一方、実際は 800 Hz。仕様・ログ・実装のどれを正とするか決め、そろえる必要があります。

---

## 6. 中：Pyodide の `analyze_audio_func.destroy()`

**現象:** `audioService.ts` で Python から返した関数に対して:

```ts
analyze_audio_func.destroy();
```

を呼んでいます。Pyodide の関数オブジェクトに `destroy` メソッドがあるかはバージョン依存であり、無い場合にランタイムエラーになる可能性があります。

**対応案:** `destroy` の有無をチェックしてから呼ぶ、または Pyodide ドキュメントに従い不要なら削除する。

---

## 7. 軽微：PostCSS 設定が 2 つある

**現象:** ルートに `postcss.config.cjs` と `postcss.config.js` が両方存在します。内容は同等（Tailwind プラグイン）ですが、ツールによってどちらが読まれるかが変わり、将来的な混乱や重複修正の原因になります。

**対応案:** どちらか 1 つに統一（Vite のデフォルトは `postcss.config.js` を探すため、`.cjs` をやめるか、明示的に 1 本化する）。

---

## 8. 軽微：DiagnosisReport の「7項目」と実際の DiagLine

**現象:** コピー上は「7項目を検査」と書かれており、実際の DiagLine も 7 本（ラウドネス、トゥルーピーク、ダイナミックレンジ、位相相関、Bass Mono、歪み、ノイズフロア）で一致しています。現時点では不整合はありませんが、項目を増減する際は文言と実装を一緒に更新する必要があります。

---

## 修正の優先度案

1. **最優先:** Beatport 目標 LUFS を -7.0 か -8.0 のどちらかに仕様決定し、全箇所で統一する。  
2. **最優先:** `types.ts` の重複インターフェースを 1 つに統合する。  
3. **高:** WAV 書き出しを 16 bit / 44.1 kHz（＋必要なら Dither）に対応するか、少なくともドキュメントと「現状は元サンプルレートのまま」を明記する。  
4. **高:** `optimizeMasteringParams` のデフォルト `TARGET_LUFS` を Beatport/Spotify と整合させる。  
5. **中:** Neuro-Drive の 250 Hz / 800 Hz を仕様に合わせてログか実装のどちらかを修正する。  
6. **中:** `analyze_audio_func.destroy()` の有無チェックまたは削除。  
7. **低:** PostCSS 設定を 1 ファイルに統一する。

---

*このドキュメントはコードベースの静的確認に基づいています。実行時や環境依存の事象は別途テストで確認してください。*
