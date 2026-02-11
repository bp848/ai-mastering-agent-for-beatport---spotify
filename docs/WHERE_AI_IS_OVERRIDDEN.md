# AIの出力をコード側で上書きしている箇所（インチキの正体）

AIが返した値を、人間が決めた範囲で強制的に書き換えている場所の一覧。  
「AIが決める」のではなく「コードが決めている」部分。

---

## 1. `services/geminiService.ts` — `clampMasteringParams()`

**7–26行目**  
AIの生の出力をここで必ずクランプしている。**全リクエストで必ず通る。**

| パラメータ | AIが例えば出した値 | コードが強制する範囲 | 結果 |
|-----------|-------------------|----------------------|------|
| `gain_adjustment_db` | +5, +6, -8 など | **-5 ～ +3** にクランプ | それ以上/以下は無視 |
| `limiter_ceiling_db` | -0.3, -0.5 など | **-6 ～ -1.0** にクランプ | -0.3 は -1.0 にされる |
| `tube_drive_amount` | 2.5, 3.0 など | **0 ～ 2** にクランプ | 2.5 は 2 にされる |
| `exciter_amount` | 0.15, 0.2 など | **0 ～ 0.12** にクランプ | それ以上は切られる |
| `low_contour_amount` | 0.9, 1.0 など | **0 ～ 0.8** にクランプ | それ以上は切られる |
| `width_amount` | 1.5 など | **1.0 ～ 1.4** にクランプ | |

→ **「AIが提案した値」はこの範囲外だと一切反映されない。**

---

## 2. `services/geminiService.ts` — `applySafetyGuard()`

**29–46行目**  
分析結果が「危険」と判定されると、**AIの値に関係なく**さらに上書き。

- `limiter_ceiling_db` → 必ず **-1.0 以下** にされる
- `tube_drive_amount` → **0.6 倍**
- `exciter_amount` → **0.5 倍**

判定条件: ピーク > -1 dBTP / クレスト < 9 / 歪み > 2%

---

## 3. `services/audioService.ts` — 自己補正ループ内

**637–639行目**

```ts
const TARGET_TRUE_PEAK_DB = Math.min(aiParams.limiter_ceiling_db ?? -1.0, -1.0);
```

→ AIが -0.5 や -0.3 を返しても、**常に -1.0 を目標**にゲインを引き下げる。  
→ 実質「リミッター天井はコードが -1.0 と決めている」。

**714–718行目**

- `GAIN_CAP_DB = 3` → ゲインは **+3 dB まで**で打ち切り
- `GAIN_FLOOR_DB = -5` → ゲインは **-5 dB まで**で打ち切り
- `MAX_GAIN_STEP_DB = 0.8` → 1回の補正で動かせるゲインも **0.8 dB まで**
- `MAX_SELF_CORRECTION_BOOST_DB = 1.5` → AIゲインからの上乗せも **1.5 dB まで**

→ 自己補正も「コードが決めた上限・下限」のなかでしか動かない。

---

## 4. `services/masteringDerivation.ts`

**AIDecision（定性）からパラメータを「算出」しているので、AIの数値出力は使っていない。**

- 28行目: `gainBounded = Math.max(-5, Math.min(3, gainDb))` → ゲイン -5～+3 固定
- 30行目: `limiterCeiling = specifics.targetPeak` → プラットフォームの **固定 targetPeak**（-9 LUFS / -1.0 dB など）
- 46, 52, 54–57行目: tube / exciter / low_contour を **すべて式＋上限で算出**。AIの数値は未使用。

→ **Gemini の数値パラメータは、derive 経路ではそもそも使われていない。**

---

## 5. `services/masteringPrompts.ts` — `getPlatformSpecifics()`

**3–18行目**

- Beatport: `targetLufs: -9.0`, `targetPeak: -1.0`
- Spotify: `targetLufs: -14.0`, `targetPeak: -1.0`

→ **目標 LUFS / True Peak は全部ここで固定。** AIに「目標を決めさせて」はいない。

---

## 6. `services/feedbackService.ts`

フィードバック（「歪んでる」「もっとラウド」など）に応じてパラメータを書き換えるとき、

- 73, 130, 136行目: `limiter_ceiling_db = -1.0` を**固定で代入**
- 62行目: `target_lufs` を **-20 ～ -5** にクランプ
- その他 tube / exciter / width なども **コード側の min/max でクランプ**

→ ユーザー意向に合わせるが、**最終的な天井や範囲はコードが決めている。**

---

## 7. `services/audioService.ts` — リミッター・クリッパー

**556–574行目**

- `limiterCeilingDb = params.limiter_ceiling_db ?? -1.0` → 未指定なら **-1.0 固定**
- リミッターの `knee`, `ratio`, `attack`, `release` は **すべてコードで固定**（AIパラメータなし）

→ 天井の「デフォルト」とリミッターの振る舞いは **AIが変えられない。**

---

## まとめ：どこが「インチキ」か

| 場所 | 何をしているか |
|------|----------------|
| **geminiService.ts** `clampMasteringParams` | AIの全パラメータを固定範囲にクランプ。**ここが最大の上書きポイント。** |
| **geminiService.ts** `applySafetyGuard` | 条件満たすと ceiling / tube / exciter をさらに上書き |
| **audioService.ts** 自己補正 | 目標 True Peak を -1.0 に固定し、ゲイン上限・補正量も固定 |
| **masteringDerivation.ts** | 数値は式と固定範囲で算出。AIの数値提案は使わない経路あり |
| **masteringPrompts.ts** `getPlatformSpecifics` | 目標 LUFS / Peak を固定 |
| **feedbackService.ts** | フィードバック時に ceiling -1.0 固定など |
| **audioService.ts** チェーン | リミッターの knee/ratio 等は固定、デフォルト天井 -1.0 |

「AIがマスタリングを決めている」ように見えて、**実際にはこれらの範囲と固定値が最終的な音を決めている。**

AIの判断を本当に優先するなら、  
`clampMasteringParams` の範囲を「破綻しない最小限」に広げる、  
`TARGET_TRUE_PEAK_DB` に AI の `limiter_ceiling_db` をそのまま使う、  
などの変更が必要。
