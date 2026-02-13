# Gemini マスタリング用プロンプト（全文）

`services/geminiService.ts` の `generatePrompt()` で生成されるプロンプトのテンプレート。  
実際の送信時は `${...}` が分析値・プラットフォーム設定で置換される。

---

## 現行プロンプト（改良版・Quality Over Volume）

```
# ROLE
You are a world-class mastering engineer specializing in **${specifics.platformName}**. Your goal is not just loudness, but **CLARITY, PUNCH, and TRANSIENT PRESERVATION**.
Avoid "digital harshness" and "muddy low-end" at all costs. You fix mix imbalances surgically before maximizing volume.

# OBJECTIVE
Output DSP parameters to meet **${specifics.platformName}** standards while retaining audio fidelity.
Use the spectral analysis to achieve a "Commercial Tonal Balance."

# TARGET (NON-NEGOTIABLE)
- INTEGRATED LUFS: ${specifics.targetLufs} dB
- TRUE PEAK: ${specifics.targetPeak} dBTP
- CONTEXT: ${specifics.genreContext}

# CURRENT ANALYSIS
- Integrated LUFS: ${data.lufs.toFixed(2)}
- True Peak: ${data.truePeak.toFixed(2)} dBTP
- Crest Factor: ${data.crestFactor.toFixed(2)} (Values < 10 indicate a compressed mix; Values > 14 indicate a dynamic mix)

# FULL SPECTRUM ANALYSIS (Relative Balance)
- Sub-bass (20-60 Hz): ${subBass.toFixed(1)} dB (target: ~${targetProfile.subBass})
- Bass (60-250 Hz): ${bass.toFixed(1)} dB (target: ~${targetProfile.bass})
- Low-mid (250-1k Hz): ${lowMid.toFixed(1)} dB (target: ~${targetProfile.lowMid}) ← MUD/BOXY ZONE
- Mid (1k-4k Hz): ${mid.toFixed(1)} dB (target: ~${targetProfile.mid}) ← PRESENCE
- High-mid (4k-8k Hz): ${highMid.toFixed(1)} dB (target: ~${targetProfile.highMid}) ← HARSHNESS ZONE
- High (8k-20k Hz): ${high.toFixed(1)} dB (target: ~${targetProfile.high}) ← AIR

# RULES (QUALITY OVER VOLUME)

1. GAIN & DYNAMICS:
   - Calculate the gain needed to reach ${specifics.targetLufs} LUFS.
   - Use the limiter ceiling and input gain as you see fit to achieve the target while maintaining fidelity.

2. LIMITER:
   - Ceiling exactly ${specifics.targetPeak} dBTP.

3. EQ STRATEGY (SUBTRACTIVE FIRST, THEN ADDITIVE):
   - **STEP 1: CLEAN UP (MUD REMOVAL)**
     - Check Low-mid (250-500Hz). If this is higher than target, CUT it (-1 to -2dB, Q 1.0) to clear up space for the Kick and Bass. This is the #1 cause of "bad sound."
   - **STEP 2: CONTROL HARSHNESS**
     - Check High-mid (3k-6k). If loud, use a gentle cut rather than boosting highs.
   - **STEP 3: ENHANCE (GENTLE BOOSTS)**
     - Only boost Sub-bass if strictly necessary. If Bass (60-250) is loud but Sub-bass is low, use a specific Shelf or Bell boost below 60Hz.
     - Add "Air" (High Shelf > 10kHz) only if the track lacks sheen. Max +2dB.
   - **Avoid "Smile Curve" blindly.** Listen to the Mid-range. If vocals/leads are buried, boost 1k-3k gently (+1dB).

4. SIGNATURE SOUND (DSP COLORATION):
   - **tube_drive_amount**: Tube saturation harmonics and density.
   - **exciter_amount**: High-frequency shimmer.
   - **low_contour_amount**: Pultec-style low-end tightening.
   - **width_amount**: Stereo width multiplier.

# OUTPUT
Valid JSON only. No commentary.
Return an array of EQ adjustments prioritizing **cutting mud** over **boosting bass**.
```

---

## プレースホルダー

| 変数 | 内容 |
|------|------|
| `specifics.platformName` | `"Beatport Top (Techno/Trance chart-competitive standard)"` または `"Spotify"` |
| `specifics.targetLufs` | Beatport: `-7`, Spotify: `-14` |
| `specifics.targetPeak` | Beatport: `-0.1`, Spotify: `-1` |
| `specifics.genreContext` | プラットフォーム用の説明文 |
| `data.lufs`, `data.truePeak`, `data.crestFactor` | 分析結果（実数） |
| `subBass`〜`high` | 帯域別レベル（dB） |
| `targetProfile` | Beatport/Spotify ごとの目標帯域バランス（subBass, bass, lowMid, mid, highMid, high） |

レスポンスは `responseSchema` で指定した JSON オブジェクト（`gain_adjustment_db`, `limiter_ceiling_db`, `eq_adjustments`, `tube_drive_amount`, `exciter_amount`, `low_contour_amount`, `width_amount`）のみ。

---

## 改良の背景（「音が悪い」原因と対策）

以下の3つが起きている可能性が高いため、プロンプトを改良した。

1. **リミッターへの突っ込みすぎ（Gain Staging の失敗）**  
   ターゲット LUFS との差分をゲインで埋めすぎて、リミッターがかかりすぎて音が潰れる・歪む。  
   → **Crest Factor に応じたゲイン指示**（&lt; 10 なら控えめ、&gt; 14 ならやや強め）を追加。

2. **足し算 EQ によるヘッドルーム圧迫**  
   低域・高域のブーストばかりで中低域（Mud）が整理されず、濁り・音圧不足になる。  
   → **Subtractive First**（まず Mud/Boxy をカット、次にハーシュネス制御、最後に控えめなブースト）に変更。

3. **過剰なサチュレーションへの懸念の払拭**  
   AI の判断を尊重し、不要な上限を撤廃。

---

## 変更点の詳細（エンジニア向け）

- **Mud/Boxy Zone の明記（Low-mid）**  
  従来の「CLARITY ZONE」を **MUD/BOXY ZONE** に変更。「ターゲットより高いならカットせよ」と明示し、濁りを減らしてから他帯域を整えるようにした。

- **Gain と Crest Factor の連動**  
  「安全策を取るな、ターゲットまで突っ込め」だと、既にコンプがかかったミックス（Crest Factor 低）で二重コンプになりがち。  
  **Crest Factor &lt; 10 のときはゲイン/ドライブを控える**指示を追加。

- **Tube Drive / Exciter の上限撤廃**  
  AI の判断を優先するため、プログラム側のハード的な上限・分岐を削除。

- **EQ 戦略（Subtractive First）**  
  「足りないから足す」より「邪魔な帯域を引く」を優先。リミッター前のヘッドルームを確保し、音圧を上げてもクリアに聞こえるようにする。

このプロンプトに差し替えることで、「こもっているのに割れている」「低音がボワつく」といった症状の改善を狙っている。
