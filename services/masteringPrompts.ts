import type { AudioAnalysisData, MasteringTarget } from '../types';

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

/** 議論レイヤー用に分析データを要約テキストにする */
export const formatAnalysisSummary = (data: AudioAnalysisData): string => {
  const bands = (data.frequencyData ?? [])
    .map(f => `${f.name}: ${f.level.toFixed(1)}`)
    .join(', ');
  const dropTime = data.loudestSectionStart ? `${Math.floor(data.loudestSectionStart / 60)}:${(data.loudestSectionStart % 60).toFixed(0).padStart(2, '0')}` : '0:00';
  return `LUFS ${data.lufs?.toFixed(1) ?? '?'}, TruePeak ${data.truePeak?.toFixed(1) ?? '?'}, DropStarts ${dropTime}, DropRMS ${data.loudestSectionRms?.toFixed(1) ?? '?'}, Crest ${data.crestFactor?.toFixed(1) ?? '?'}, Phase ${data.phaseCorrelation?.toFixed(2) ?? '?'}, TransientDensity ${data.transientDensity?.toFixed(1) ?? '?'}, BassMonoComp ${data.bassMonoCompatibility?.toFixed(0) ?? '?'}, DistortionRisk ${data.distortionRiskScore ?? '?'}, BassVol ${data.bassVolume?.toFixed(1) ?? '?'}; Bands: ${bands || 'none'}`;
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

  // Use genre-appropriate guidelines for saturation and width from the veteran's logic
  // but keep the structure of the high-quality prompt in the docs.

  return `
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
- Structure: ${data.sectionInfo ?? 'High-energy segment'} at ${data.loudestSectionStart?.toFixed(2) ?? '0.00'}s.

# FULL SPECTRUM ANALYSIS (Relative Balance)
- Sub-bass (20-60 Hz): ${subBass.toFixed(1)} dB
- Bass (60-250 Hz): ${bass.toFixed(1)} dB
- Low-mid (250-1k Hz): ${lowMid.toFixed(1)} dB ← MUD/BOXY ZONE
- Mid (1k-4k Hz): ${mid.toFixed(1)} dB ← PRESENCE
- High-mid (4k-8k Hz): ${highMid.toFixed(1)} dB ← HARSHNESS ZONE
- High (8k-20k Hz): ${high.toFixed(1)} dB ← AIR

# RULES (QUALITY OVER VOLUME)

1. GAIN & DYNAMICS:
   - Calculate the gain needed to reach ${specifics.targetLufs} LUFS at the loudest section (Drop).
   - Use the limiter ceiling and input gain as you see fit to achieve the target while maintaining fidelity.

2. LIMITER:
   - Ceiling exactly ${specifics.targetPeak} dBTP. STICK to this.

3. EQ STRATEGY (SUBTRACTIVE FIRST, THEN ADDITIVE):
   - **STEP 1: CLEAN UP (MUD REMOVAL)**
     - Check Low-mid (250-1k Hz). If this is higher than target balance, CUT it (-1 to -2dB, Q 1.0) to clear up space. This is the #1 cause of "bad sound."
   - **STEP 2: CONTROL HARSHNESS**
     - Check High-mid (4k-8k Hz). If loud, use a gentle cut rather than boosting highs.
   - **STEP 3: ENHANCE (GENTLE BOOSTS)**
     - Only boost Sub-bass if strictly necessary.
     - Add "Air" (High Shelf > 10kHz) only if the track lacks sheen. Max +2dB.

4. SIGNATURE SOUND (VETERAN ENGINEERING LOGIC):
   - **tube_drive_amount**: Focus on 0.5–2.5 for subtle depth and 3.0–5.0 for harmonic density.
   - **exciter_amount**: Use sparingly. High values (>0.15) can cause ear fatigue.
   - **low_contour_amount**: Essential for Club tracks. Boosts "Chest Thump" while keeping the bottom clear.
   - **width_amount**: If Phase Correlation is < 0.6, do NOT exceed 1.1. If Correlation is > 0.9, you can push to 1.3 for modern immersion.

5. MACRO-DYNAMICS (DYNAMIC AUTOMATION):
   - **input_gain_offset_quiet_db**: Set between -0.5dB and -2.5dB to ensure the drop "explodes."
   - **width_boost_drop_percent**: The drop must feel wider. Set to 110% - 125%.
   - **width_offset_quiet_percent**: Focus the energy in intros. Set to 90% - 100%.

# OUTPUT
Valid JSON only. No commentary.
Return an array of EQ adjustments prioritizing **cutting mud** over **boosting bass**.
{
  "gain_adjustment_db": number,
  "limiter_ceiling_db": number,
  "eq_adjustments": [{ "type": string, "frequency": number, "gain_db": number, "q": number }],
  "tube_drive_amount": number,
  "exciter_amount": number,
  "low_contour_amount": number,
  "width_amount": number,
  "dynamic_automation": {
    "input_gain_offset_quiet_db": number,
    "width_offset_quiet_percent": number,
    "width_boost_drop_percent": number,
    "transition_time_sec": number
  }
}
`.trim();
};
