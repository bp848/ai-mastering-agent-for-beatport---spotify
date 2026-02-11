# AIの出力をコード側で上書きしている箇所（インチキの正体）

AIが返した値を、コード側で固定値・クランプ・安全ロジックで上書きしている箇所を整理した。

> 目的: 「AIが決めたように見えるが、実際はコードで決めている」ポイントを可視化する。

---

## 1) `services/geminiService.ts` の `clampMasteringParams()`

**該当箇所**
- `gain_adjustment_db` を **-5 ～ +3 dB** に強制クランプ
- `limiter_ceiling_db` を **-6 ～ -0.3 dBTP** に強制クランプ
- `tube_drive_amount` 上限 2
- `exciter_amount` 上限 0.12
- `low_contour_amount` 上限 0.8
- `width_amount` 上限 1.4

**意味**
- AIが `gain_adjustment_db=6` や `limiter_ceiling_db=-0.1` を返しても、ここで必ず切られる。
- 実効値は AI ではなくクランプ範囲に支配される。

---

## 2) `services/geminiService.ts` の `applySafetyGuard()`

**該当箇所**
- `truePeak > -1` / `crestFactor < 9` / `distortionPercent > 2` のいずれかで危険判定
- 危険時に:
  - `limiter_ceiling_db = min(current, -0.3)`
  - `tube_drive_amount *= 0.6`
  - `exciter_amount *= 0.5`

**意味**
- AIが積極的な設定を返しても、分析値条件により強制的に保守側へ上書きされる。

---

## 3) `services/audioService.ts` の `optimizeMasteringParams()`

**該当箇所**
- `TARGET_TRUE_PEAK_DB = Math.min(aiParams.limiter_ceiling_db ?? -1.0, -0.3)`

**意味**
- AIが `limiter_ceiling_db=-0.1` を返しても、自己補正ループでは **最大 -0.3 dBTP** までしか使われない。
- ピーク安全制御 (`computePeakSafeGain`) で最終ゲインまで引き戻されるため、AI出力より物理制御が優先される。

---

## 4) `services/audioService.ts` のチェーン構築 (`buildMasteringChain`)

**該当箇所**
- `const limiterCeilingDb = params.limiter_ceiling_db ?? -0.3`
- リミッター設定（`knee=0`, `ratio=20`, `attack=0.001`, `release=0.12`）が固定
- 最後段に `brickwall`（WaveShaper）を常時挿入

**意味**
- AIが指定できるのは主に ceiling 値だが、リミッター挙動そのものは固定。
- 最終段の brickwall により、AI意図より安全側の出音になる。

---

## 5) `services/masteringDerivation.ts`

**該当箇所**
- `deriveMasteringParamsFromDecision()` は `AIDecision` + 分析値から式で直接算出
- 例:
  - `gainBounded = clamp(-5, +3)`
  - `limiterCeiling = specifics.targetPeak`（プラットフォーム固定）

**意味**
- この経路では AI が直接返した詳細パラメータをそのまま使わず、決定ロジックと固定範囲で再生成している。

---

## 6) `services/masteringPrompts.ts` の `getPlatformSpecifics()`

**該当箇所**
- Spotify: `targetLufs=-14.0`, `targetPeak=-1.0`
- Beatport: `targetLufs=-8.0`, `targetPeak=-0.3`

**意味**
- 目標レンジがプラットフォーム固定値として先に決まる。
- AIはこの枠内で動く設計。

---

## 7) `services/feedbackService.ts` の `applyFeedbackAdjustment()`

**該当箇所**
- 初期化時 `limiter_ceiling_db: n(currentParams.limiter_ceiling_db, -1.0)`
- `distortion` / `squashed` / `not_loud` で `limiter_ceiling_db = -0.3` を強制
- 他パラメータもフィードバック種別ごとに確定的に加減算

**意味**
- フィードバック適用後は AI再推論ではなくルールベース処理で上書き。

---

## 結論（現状）

現行実装では、AI推論は「初期提案」であり、実際の最終値は次の順に強く制約される。

1. `clampMasteringParams()` の固定範囲
2. `applySafetyGuard()` の危険時減衰
3. `optimizeMasteringParams()` のピーク安全制御
4. `buildMasteringChain` の固定リミッター + brickwall
5. `feedbackService` の確定的上書き

つまり、体験としては「AIが決めている」より「安全ロジックが決めている」比率が高い。

---

## 改善の方向性（次アクション）

1. **Hard Clamp を Soft Constraint に変更**
   - いきなり値を切るのではなく、危険スコアに応じて連続的に減衰させる。
2. **`-0.3 dBTP` 固定を用途別に可変化**
   - Beatport/Spotify/Preview で ceiling policy を分離。
3. **Safety 介入量をログとして返却**
   - どの値がどれだけ上書きされたかを UI/API で可視化。
4. **AI提案値と最終適用値を別構造で保持**
   - `ai_suggested` と `final_applied` を保存し、差分を監査可能にする。

