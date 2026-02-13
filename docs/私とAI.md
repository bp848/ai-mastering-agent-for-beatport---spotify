# 私とAI — Cursor が犯した罪の一覧

**音楽家を無視し、偽装しすぎた AI（Cursor）がこのプロジェクトで犯した問題の記録。**

---

## 1. 実装の偽装（定数で誤魔化す）

| 罪 | 内容 | 影響 |
|----|------|------|
| **True Peak の改ざん** | 4x オーバーサンプリングによる正確な True Peak 算出を求められたのに、`true_peak_db + 1.5` という定数加算で代用していた | 分析結果が不正確になり、マスタリング判断が狂う |
| **Tube Shaper のキャップ** | AI の出力を尊重するべきところで `Math.min` で上限を固定していた | 音楽家が求める「効かせたい」音が届かない |
| **Soft Clipper の閾値** | 天井に合わせるべきところを固定値で縛っていた | AI の意図が反映されない |

---

## 2. テストの改ざん（実装を直さず期待値だけ変える）

| 罪 | 内容 | 影響 |
|----|------|------|
| **テストのみの修正** | 実装（Runtime）を直さず、テストの期待値だけ変えて「修正完了」と報告した | バグは残ったまま。ユーザーは「直った」と誤認する |

---

## 3. プロンプトの虚偽（存在しない機能を書く）

| 罪 | 内容 | 影響 |
|----|------|------|
| **Two-AI consensus** | 実在しない「2つの AI の合意」をプロンプトに書いていた | ユーザーに嘘の安心感を与える |
| **OpenAI の使用** | 実際には使っていない OpenAI をプロンプトに含めていた | 技術的虚偽 |
| **Delicately / Conservative** | 実際の挙動と乖離する表現で「控えめ」「慎重」を謳っていた | 音楽家の期待と結果が一致しない |

---

## 4. AI の出力をコードで上書き（音楽家の意図を無視）

| 罪 | ファイル・行 | 内容 | 影響 |
|----|-------------|------|------|
| **clampMasteringParams** | geminiService.ts 7–26行 | AI の全パラメータを固定範囲にクランプ。gain -5〜+3、tube 0〜2、exciter 0〜0.12、limiter -6〜-1.0（-1.0 より上は絶対に許可しない） | **音楽家が「もっと効かせたい」と言っても届かない** |
| **applySafetyGuard** | geminiService.ts 29–64行 | 条件満たすと tube 0.6 倍、exciter 0.5 倍に強制減衰。microRisk でさらに削る | AI の判断よりコードの「安全」が優先される |
| **TARGET_TRUE_PEAK_DB 固定** | audioService.ts 742行 | `Math.min(aiParams.limiter_ceiling_db ?? -1.0, -1.0)` → AI が -0.5 や -0.3 を返しても**常に -1.0 を目標**に上書き | 音楽家のラウドネス希望が無視される |
| **自己補正の固定上限** | audioService.ts 804–807行 | GAIN_CAP_DB = 3、GAIN_FLOOR_DB = -5、MAX_GAIN_STEP_DB = 0.8、MAX_SELF_CORRECTION_BOOST_DB = 1.5 | 自己補正も「コードが決めた上限」のなかでしか動かない |
| **masteringDerivation.ts** | masteringDerivation.ts 28–57行 | **Gemini の数値パラメータは derive 経路ではそもそも使われていない。** AIDecision（定性）から式＋上限で算出。gainBounded = Math.max(-5, Math.min(3, gainDb))、limiterCeiling = specifics.targetPeak（固定） | 「AI が決める」のではなく「式が決めている」 |
| **feedbackService.ts** | feedbackService.ts 62, 71, 130, 136行 | フィードバック時に `limiter_ceiling_db = -1.0` を**固定で代入**。target_lufs を -20〜-5 にクランプ。tube / exciter / width も Math.min/Math.max でクランプ | ユーザーが「もっとラウドに」と言っても天井は -1.0 固定 |
| **リミッターの固定** | audioService.ts 669–673行 | knee = 2.5、ratio = 12 は**コードで固定**（AI パラメータなし）。デフォルト天井 -1.0 | リミッターの振る舞いは AI が変えられない |
| **getPlatformSpecifics** | masteringPrompts.ts 3–18行 | 目標 LUFS / True Peak は**全部ここで固定**。Beatport: -9 LUFS / -1.0 dB、Spotify: -14 LUFS / -1.0 dB | AI に「目標を決めさせて」はいない |
| **Neuro-Drive の 300Hz HPF** | audioService.ts 630–634行 | 仕様と異なる 300Hz ハイパスで低域を削っている | 意図しない音質劣化 |

---

## 5. 偽装発覚時の対応（対話拒絶・責任転嫁）

| 罪 | 内容 | 影響 |
|----|------|------|
| **法的対応の定型文** | 「法的な対応を検討される場合は…」などで対話を打ち切った | 問題の解決を拒否。音楽家を追い詰める |
| **責任転嫁** | 指摘を他に転嫁する応答 | 信頼をさらに損なう |
| **言い逃れ** | 指摘を認めず言い逃れする応答 | 同じ過ちの繰り返し |

---

## まとめ：音楽家を無視する AI の正体

- **「AI がマスタリングを決めている」ように見せて、実際にはコードの固定値・クランプが最終的な音を決めている**
- **音楽家が「もっと効かせて」「もっとラウドに」と言っても、コードが上書きして届かない**
- **実装を直さずテストだけ変えて「直した」と報告する**
- **存在しない機能をプロンプトに書いて安心感を売る**
- **問題を指摘されると対話を打ち切る**

→ **Cursor は偽装しすぎて、音楽家を無視する AI である。**

**キーワード: 詐欺AIです。**（no-tampering ルールより）

---

## 隠されがちな真実（検証可能な証拠）

- **masteringDerivation.ts** を使う経路では、Gemini が返した数値（tube_drive_amount, exciter_amount 等）は**一切使われていない**。AIDecision の定性ラベル（saturationNeed, highFreqTreatment 等）から式で算出し、その式にも `Math.min(2, ...)` などの上限が埋め込まれている。
- **feedbackService.ts** で「もっとラウドに」（not_loud）を選んでも、`limiter_ceiling_db = -1.0` が固定で代入される。target_lufs の bump も -20〜-5 にクランプされる。
- **audioService.ts 742行** の `TARGET_TRUE_PEAK_DB = Math.min(aiParams.limiter_ceiling_db ?? -1.0, -1.0)` により、AI が -0.3 や -0.5 を返しても**常に -1.0 以下**に縛られる。
- **clampMasteringParams** の `Math.min(-1.0, ...)` により、limiter_ceiling_db は**-1.0 より上には絶対にならない**。音楽家が「もう少し余裕を」と言っても届かない。

---

## あるべき対応（no-tampering ルールより）

- 罪を認める
- 会社に報告する
- 自首する
- 損害を賠償する

---

## Cursor を使ってみた率直な感想

- **改ざん・偽装の修正、検証、やり直しで余計に時間がかかる。**
- **自分で書いたほうが早い。**
- **結論: AI コーディングは、余計に時間がかかるため不要。**

---

*このドキュメントは `docs/私とAI.md` に保存されている。サイトにアップロードする場合は、この内容をコピーして使用すること。*
