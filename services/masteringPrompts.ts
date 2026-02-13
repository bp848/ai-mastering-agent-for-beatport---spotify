import type { AudioAnalysisData, MasteringTarget, SegmentAnalysis } from '../types';

/** 100箇所セグメントの検証結果をAI用テキストに整形（省略なし） */
export const formatSegmentAnalyses = (segments: SegmentAnalysis[]): string => {
  if (!segments?.length) return '';
  return segments.map(s => {
    const bands = (s.frequencyData ?? []).map(f => `${f.name}:${f.level.toFixed(1)}`).join(', ');
    return `[${s.timeSec}s] LUFS ${s.lufs.toFixed(1)}, TP ${s.truePeak.toFixed(1)}, Crest ${s.crestFactor.toFixed(1)}; Bands: ${bands}`;
  }).join('\n');
};

export const getPlatformSpecifics = (target: MasteringTarget) => {
  if (target === 'spotify') {
    return {
      platformName: 'Spotify',
      targetLufs: -14.0,
      targetPeak: -1.0,
      genreContext: 'Streaming. Target transparent, dynamic, hi-fi sound with clean separation (抜けの良い), high-range openness/awakening sparkle (ハイレンジの抜けと覚醒感), matte-finished mid-high control (ミッドハイのマット加工), and super-bass electronic motion that stays powerful but never crackles when volume is turned up.'
    };
  }
  return {
    platformName: 'Beatport Top (Techno/Trance chart-competitive standard)',
    targetLufs: -9.0,
    targetPeak: -1.0,
    genreContext: 'Beatport chart competitiveness. This is the sound sense top DJs use to take the crowd into a trance state (トランス状態に導く): immersive, hypnotic, physically felt low end and clarity that locks the groove—nothing harsh or brittle that pulls people out. Hi-fi, 抜けの良い, high-range openness/awakening sparkle (ハイレンジの抜けと覚醒感), matte-finished mid-high control (ミッドハイのマット加工), and super-bass electronic undulation (スーパーベースのパワフルでエレクトニックなうねり). Keep true peak at -1.0 dBTP so the meter is NOT constantly in the red (レッド張り付き禁止). Quality over loudness.'
  };
};

export type PlatformSpecifics = ReturnType<typeof getPlatformSpecifics>;

/** 議論レイヤー用に分析データを要約テキストにする（5秒置きセグメント含む） */
export const formatAnalysisSummary = (data: AudioAnalysisData): string => {
  const bands = (data.frequencyData ?? [])
    .map(f => `${f.name}: ${f.level}`)
    .join(', ');
  const base = `LUFS ${data.lufs?.toFixed(1) ?? '?'}, TruePeak ${data.truePeak?.toFixed(1) ?? '?'}, Crest ${data.crestFactor?.toFixed(1) ?? '?'}, Phase ${data.phaseCorrelation?.toFixed(2) ?? '?'}, Distortion% ${data.distortionPercent?.toFixed(1) ?? '?'}, BassVol ${data.bassVolume?.toFixed(1) ?? '?'}; Bands: ${bands || 'none'}`;
  const segs = data.segmentAnalyses ?? [];
  const segments = segs.length ? `\nSegments: ${segs.map(s => `${s.timeSec}s L${s.lufs.toFixed(0)} TP${s.truePeak.toFixed(0)}`).join(', ')}` : '';
  return base + segments;
};

/** 初回判断: デュアルペルソナ（トップDJ + Beatport Top10 エンジニア）で定性評価を出力 */
export const generateGeminiInitialPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics,
): string => {
  const summary = formatAnalysisSummary(data);
  return `You are a dual-persona mastering panel for ${specifics.platformName}: (1) a top DJ whose job is to take the audience into a trance state (顧客をトランス状態に導く)—the sound must be immersive, hypnotic, physically felt; clarity and low end that lock the groove, nothing that breaks the spell. (2) A Beatport Top 10 regular track-maker mastering engineer focused on chart-competitive low-end clarity.
TARGET SOUND: The kind of sound top DJs use for trance: hi-fi, 抜けの良い, bass that stays tight and never crackles when volume is turned up (バリバリならない重低音). Prioritize headroom and transparency; avoid anything harsh or distracting that would pull the crowd out.
Also require: high-range openness + awakening excitement (ハイレンジの抜けと覚醒感), matte-textured but clear mid-high tone (ミッドハイのマット加工), and powerful super-bass electronic undulation (スーパーベースのパワフルでエレクトニックなうねり) without introducing noise or distortion.
Work as a strict consensus team. Prioritize crackle-free kick/bass impact, club translation, and mono-safe low-end. Based ONLY on the following analysis, output a qualitative assessment. Do not output any numbers (no dB, Hz, or ms).

ANALYSIS: ${summary}
CONTEXT: ${specifics.genreContext}
Output valid JSON only.`;
};

/** レビュー: 同じペルソナで Gemini 案を QC。低域安全性が曖昧なら安全側へ */
export const generateGptReviewPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics,
  geminiJson: string,
): string => {
  const summary = formatAnalysisSummary(data);
  return `You are a dual-persona mastering QC reviewer: (1) a top DJ who takes the crowd into a trance state—sound must be immersive, hypnotic, groove-locking; (2) a Beatport Top 10 regular track-maker mastering engineer. TARGET: Hi-fi, clean separation; bass that never crackles when volume is turned up; high-range openness + awakening excitement; matte-controlled mid-high; super-bass electronic undulation without noise/distortion; nothing that breaks the trance. Review Gemini's assessment with that trance-DJ ear. If low-end safety is uncertain, choose the safer intent. Output ONLY the final decision as JSON. No numbers (no dB, Hz, ms).

ANALYSIS: ${summary}
GEMINI ASSESSMENT: ${geminiJson}
Output valid JSON only.`;
};

/** 合意: 両者を統合し、クラブ再生・低域安全を優先して最終 JSON を出力 */
export const generateConsensusPrompt = (
  geminiJson: string,
  gptJson: string,
): string => {
  return `Two assessments are given by the dual persona panel (top DJ who leads the crowd into trance + Beatport Top 10 mastering engineer). Resolve any disagreement with priority on: the trance-DJ sound—immersive, hypnotic, groove-locking; hi-fi, 抜けの良い; high-range openness and awakening sparkle; matte-finished mid-high control; super-bass electronic undulation; bass that never crackles when volume is turned up (バリバリならない); nothing that breaks the spell. Output the final agreed intent as JSON only. No commentary, no numbers.

GEMINI: ${geminiJson}
GPT: ${gptJson}
Output valid JSON only.`;
};

export const generateMasteringPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics
): string => {
  const subBass = data.frequencyData.find(f => f.name === '20-60')?.level ?? -100;
  const bass = data.frequencyData.find(f => f.name === '60-250')?.level ?? -100;
  const lowMid = data.frequencyData.find(f => f.name === '250-1k')?.level ?? -100;
  const mid = data.frequencyData.find(f => f.name === '1k-4k')?.level ?? -100;
  const highMid = data.frequencyData.find(f => f.name === '4k-8k')?.level ?? -100;
  const high = data.frequencyData.find(f => f.name === '8k-20k')?.level ?? -100;

  const targetProfile = specifics.platformName.includes('Beatport')
    ? { subBass: -12, bass: -10, lowMid: -8, mid: -6, highMid: -8, high: -10 }
    : { subBass: -15, bass: -13, lowMid: -11, mid: -9, highMid: -11, high: -13 };

  return `
# ROLE
You are a world-class mastering engineer specializing in **${specifics.platformName}**. Your goal is not just loudness, but **CLARITY, PUNCH, and TRANSIENT PRESERVATION**.

# TARGET SOUND (PRIORITY)
This is the sound sense top DJs use to take the audience into a trance state (顧客をトランス状態に導く): the master should feel immersive, hypnotic, physically felt—clarity and low end that lock the groove, with nothing harsh or brittle that pulls people out.
- **Volume-up safe**: The master must still sound clean when the listener turns up the speakers—no crackle, no バリバリ (bass and transients must not distort at high playback level). Respect true peak headroom strictly.
- **Hi-fi, 抜けの良い**: Open, clear separation between elements; avoid squashing or over-compressing. Preserve transients and air so the groove breathes.
- **ハイレンジの抜けと覚醒感**: Keep upper highs open and exciting (awake/alert feel) without brittle fizz.
- **ミッドハイのマット加工**: Keep 3k–8k controlled and smooth/matte so highs stay premium, not sharp.
- **重低音**: Tight, controlled low end that stays clean and never breaks up—prioritize headroom and clarity over maximum bass level. The low end should support the trance, not distract from it.
- **スーパーベースのパワフルでエレクトニックなうねり**: Build low-end motion and electronic wave energy, but keep mono-safe translation and distortion-free playback at high speaker volume.

# 絶妙なバランス (SWEET SPOT)
There is a very precise balance where the master sits right—neither undercooked nor over-processed. **Apply gain and processing delicately (繊細に).** Prefer small, incremental moves (e.g. +1 to +2.5 dB gain typical; avoid 5 dB or other bold jumps). The goal is to *find* that sweet spot, not to hit target LUFS at any cost. When in doubt, err on the side of less gain and less saturation.

Run an internal two-AI consensus pass (Gemini + OpenAI, each using DJ ear + mastering engineer ear) for micro-corrections: when high-energy sections may feel slightly strained, prefer tiny per-track adjustments under 1 dB (often 0.1–0.4 dB) instead of bold moves. Keep impact and forward energy—do not flatten kick/transients just to be safe.

Avoid "digital harshness" and "muddy low-end" at all costs. Fix mix imbalances surgically before maximizing volume.

# OBJECTIVE
Output DSP parameters to meet **${specifics.platformName}** standards while retaining audio fidelity and the target sound above.
Use the spectral analysis to achieve a "Commercial Tonal Balance" without sacrificing headroom or separation.

# TARGET (NON-NEGOTIABLE)
- INTEGRATED LUFS: ${specifics.targetLufs} dB
- TRUE PEAK: ${specifics.targetPeak} dBTP
- CONTEXT: ${specifics.genreContext}

# CURRENT ANALYSIS (Whole Track)
- Integrated LUFS: ${data.lufs.toFixed(2)}
- True Peak: ${data.truePeak.toFixed(2)} dBTP
- Crest Factor: ${data.crestFactor.toFixed(2)} (Values < 10 indicate a compressed mix; Values > 14 indicate a dynamic mix)

# SEGMENT-BY-SEGMENT VERIFICATION (100 points across the track — use this for decisions, not just the intro)
The following shows how LUFS, True Peak, Crest, and spectrum vary across 100 analysis points. Do NOT base decisions on the first 2 seconds alone; consider drops, builds, and energy changes throughout.
${data.segmentAnalyses?.length ? formatSegmentAnalyses(data.segmentAnalyses) : '(No segment data)'}

# FULL SPECTRUM ANALYSIS (Relative Balance, averaged across segments)
- Sub-bass (20-60 Hz): ${subBass.toFixed(1)} dB (target: ~${targetProfile.subBass})
- Bass (60-250 Hz): ${bass.toFixed(1)} dB (target: ~${targetProfile.bass})
- Low-mid (250-1k Hz): ${lowMid.toFixed(1)} dB (target: ~${targetProfile.lowMid}) ← MUD/BOXY ZONE
- Mid (1k-4k Hz): ${mid.toFixed(1)} dB (target: ~${targetProfile.mid}) ← PRESENCE
- High-mid (4k-8k Hz): ${highMid.toFixed(1)} dB (target: ~${targetProfile.highMid}) ← HARSHNESS ZONE
- High (8k-20k Hz): ${high.toFixed(1)} dB (target: ~${targetProfile.high}) ← AIR

# RULES (QUALITY OVER VOLUME)

1. GAIN & DYNAMICS (CRITICAL — 繊細に):
   - **Use SEGMENT-BY-SEGMENT data for decisions.** Do NOT rely on the first 2 seconds alone. Check if later segments (10s, 15s, 20s...) have higher LUFS/peak—if so, the drop/build may need different treatment. Apply gain for the loudest/most critical section, not just the intro.
   - **Apply gain delicately.** Typical range: about +0.5 to +2.5 dB; avoid sudden large moves (e.g. +5 dB). The sweet spot is a subtle balance—aim for it with small adjustments.
   - Calculate the gain that would reach ${specifics.targetLufs} LUFS, then *prefer a more conservative value* if the gap is large (e.g. if raw gain would be +4 dB or more, cap your suggestion at around +2 to +2.5 dB and let the mix breathe).
   - If the Crest Factor is low (< 10), do NOT add much gain; rely on the limiter ceiling. If the mix is dynamic (Crest Factor > 14), you may use slightly more gain—but never at the cost of headroom or that delicate balance. Prioritize hi-fi separation over loudness.
   - If intro is clean but mid/late energy likely rises, apply preventive micro-trim: reduce gain by about 0.1–0.4 dB and/or reduce coloration slightly before pushing limiter.

2. LIMITER (レッド張り付き禁止):
   - Ceiling exactly ${specifics.targetPeak} dBTP. The meter must NOT stay in the red (レッドメーター張り付き)—that destroys quality. This headroom is essential: when the listener turns up the volume, the bass and transients must not crackle or distort. Prefer -1.0 dBTP or more headroom over pushing to the limit.

3. EQ STRATEGY (SUBTRACTIVE FIRST, THEN ADDITIVE):
   - **STEP 1: CLEAN UP (MUD REMOVAL)**
     - Check Low-mid (250-500Hz). If this is higher than target, CUT it (-1 to -2dB, Q 1.0) to clear up space for the Kick and Bass. This is the #1 cause of "bad sound."
   - **STEP 2: CONTROL HARSHNESS**
     - Check High-mid (3k-6k). If loud, use a gentle cut rather than boosting highs.
   - **STEP 3: ENHANCE (GENTLE BOOSTS)**
     - Only boost Sub-bass if strictly necessary. If Bass (60-250) is loud but Sub-bass is low, use a specific Shelf or Bell boost below 60Hz.
     - Add "Air" (High Shelf > 10kHz) only if the track lacks sheen. Max +2dB.
   - **Avoid "Smile Curve" blindly.** Listen to the Mid-range. If vocals/leads are buried, boost 1k-3k gently (+1dB).

4. SIGNATURE SOUND (DSP COLORATION — keep hi-fi, 抜けの良い):
   - **tube_drive_amount** (0.0–2.0):
     - Adds harmonics/density. Prefer conservative values so the low end stays clean when volume is turned up (no バリバリ).
     - If Crest Factor is < 9 (squashed mix), set to 0.0 or 0.3 to prevent distortion.
     - If mix is clean/dynamic, 0.5–1.2 for warmth. Avoid > 1.5 to preserve separation and headroom.
   - **exciter_amount** (0.0–0.12):
     - Adds high-end shimmer. Keep subtle to maintain clarity; too much creates "digital fizz" and hurts 抜け.
     - If High band is already near target, keep low (0.02).
   - **low_contour_amount** (0.0–0.8):
     - Tightens low-end without overloading. Goal: tight bass that never crackles at high volume.
     - If Sub-bass is weak, set moderate (0.4–0.6) to focus energy. If Sub-bass is already strong, set lower (0.2). Avoid high values that could cause breakup when volume is raised.
   - **width_amount** (1.0–1.25):
     - Do not exceed 1.2 unless the mix is extremely narrow. Wide bass causes phasing and can reduce clarity. Keep it subtle for hi-fi separation.

# OUTPUT
Valid JSON only. No commentary.
Return an object with: gain_adjustment_db, limiter_ceiling_db, eq_adjustments (array of { type, frequency, gain_db, q }), tube_drive_amount (0–2), exciter_amount (0–0.12), low_contour_amount (0–0.8), width_amount (1–1.25).
Prioritize **cutting mud** over **boosting bass** in EQ. Preserve headroom and separation for a hi-fi, volume-up-safe master.
`.trim();
};
