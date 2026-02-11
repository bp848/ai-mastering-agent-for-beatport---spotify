import type { AudioAnalysisData, MasteringTarget } from '../types';

export const getPlatformSpecifics = (target: MasteringTarget) => {
  if (target === 'spotify') {
    return {
      platformName: 'Spotify',
      targetLufs: -14.0,
      targetPeak: -1.0,
      genreContext: 'Streaming distribution. Target transparent and dynamic sound.'
    };
  }
  return {
    platformName: 'Beatport Top (Techno/Trance chart-competitive standard)',
    // -7.0 / -0.1 は歪み・耳疲れに直結しやすい（WebAudio/簡易TP推定では特に危険）。
    // まずは品質優先の現実値に寄せ、自己補正ループで確実に到達させる。
    targetLufs: -8.0,
    targetPeak: -0.3,
    genreContext: 'This is for Beatport chart competitiveness. Prioritize clarity and punch without harsh distortion. Target integrated loudness around -8.0 LUFS; keep true peak at -0.3 dBTP for safer headroom.'
  };
};

export type PlatformSpecifics = ReturnType<typeof getPlatformSpecifics>;

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

1. GAIN & DYNAMICS (CRITICAL):
   - Calculate the gain needed to reach ${specifics.targetLufs} LUFS.
   - **WARNING**: If the Crest Factor is low (< 10), the track is already dense. Do NOT over-compress. Rely more on the limiter ceiling than input gain to avoid distortion.
   - If the mix is dynamic (Crest Factor > 14), you can push the gain harder.

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
   - **tube_drive_amount** (0.0–3.0):
     - Adds harmonics/density.
     - **Logic**: If Crest Factor is < 9 (squashed mix), set to 0.0 or 0.5 to prevent distortion.
     - If mix is clean/dynamic, set 1.0–2.0 for warmth.
     - Avoid values > 2.5 unless specifically requested for "Hard Techno Distortion."
   - **exciter_amount** (0.0–0.15):
     - Adds high-end shimmer.
     - If High band is already near target, keep low (0.02). Too much creates "digital fizz."
   - **low_contour_amount** (0.0–1.0):
     - Tightens low-end. High values (0.7+) make the kick punchy but lean.
     - If Sub-bass is weak, set higher (0.6-0.8) to focus energy. If Sub-bass is already booming, set lower (0.2).
   - **width_amount** (1.0–1.4):
     - **CAUTION**: Do not exceed 1.25 unless the mix is extremely narrow. Wide bass causes phasing. Keep it subtle.

# OUTPUT
Valid JSON only. No commentary.
Return an object with: gain_adjustment_db, limiter_ceiling_db, eq_adjustments (array of { type, frequency, gain_db, q }), tube_drive_amount, exciter_amount, low_contour_amount, width_amount.
Prioritize **cutting mud** over **boosting bass** in EQ.
`.trim();
};

// --- AI 議論レイヤー用：数値は返さず意図のみ ---

const formatAnalysisSummary = (data: AudioAnalysisData): string => {
  const subBass = data.frequencyData.find(f => f.name === '20-60')?.level ?? -100;
  const bass = data.frequencyData.find(f => f.name === '60-250')?.level ?? -100;
  const lowMid = data.frequencyData.find(f => f.name === '250-1k')?.level ?? -100;
  const mid = data.frequencyData.find(f => f.name === '1k-4k')?.level ?? -100;
  const highMid = data.frequencyData.find(f => f.name === '4k-8k')?.level ?? -100;
  const high = data.frequencyData.find(f => f.name === '8k-20k')?.level ?? -100;
  return `LUFS: ${data.lufs.toFixed(1)}, True Peak: ${data.truePeak.toFixed(1)}, Crest: ${data.crestFactor.toFixed(1)}, StereoWidth: ${data.stereoWidth.toFixed(0)}%, Phase: ${data.phaseCorrelation.toFixed(2)}, Distortion: ${data.distortionPercent.toFixed(2)}%. Bands: sub ${subBass.toFixed(0)} bass ${bass.toFixed(0)} lowMid ${lowMid.toFixed(0)} mid ${mid.toFixed(0)} highMid ${highMid.toFixed(0)} high ${high.toFixed(0)}.`;
};

export const generateGeminiInitialPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics,
): string => {
  const summary = formatAnalysisSummary(data);
  return `You are an objective mastering analyst for ${specifics.platformName}. Based ONLY on the following analysis, output a qualitative assessment. Do not output any numbers (no dB, Hz, or ms).

ANALYSIS: ${summary}
CONTEXT: ${specifics.genreContext}

OUTPUT: Valid JSON only. Exactly these keys with ONLY these allowed string values:
- kickSafety: "safe" | "borderline" | "danger"
- saturationNeed: "none" | "light" | "moderate"
- transientHandling: "preserve" | "soften" | "control"
- highFreqTreatment: "leave" | "polish" | "restrain"
- stereoIntent: "monoSafe" | "balanced" | "wide"
- confidence: number between 0 and 1

Example: {"kickSafety":"safe","saturationNeed":"light","transientHandling":"preserve","highFreqTreatment":"polish","stereoIntent":"balanced","confidence":0.85}`.trim();
};

export const generateGptReviewPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics,
  geminiJson: string,
): string => {
  const summary = formatAnalysisSummary(data);
  return `You are a mastering QC reviewer. Gemini's initial assessment and the raw analysis are below. Do you agree? If not, propose a corrected intent. Output ONLY the final decision as JSON. No numbers (no dB, Hz, ms).

ANALYSIS: ${summary}
GEMINI ASSESSMENT: ${geminiJson}
CONTEXT: ${specifics.genreContext}

OUTPUT: Valid JSON only. Same schema:
- kickSafety: "safe" | "borderline" | "danger"
- saturationNeed: "none" | "light" | "moderate"
- transientHandling: "preserve" | "soften" | "control"
- highFreqTreatment: "leave" | "polish" | "restrain"
- stereoIntent: "monoSafe" | "balanced" | "wide"
- confidence: number 0-1`.trim();
};

export const generateConsensusPrompt = (
  geminiJson: string,
  gptJson: string,
): string => {
  return `Two assessments are given. Resolve any disagreement and output the final agreed intent as JSON only. No commentary, no numbers.

GEMINI: ${geminiJson}
GPT: ${gptJson}

OUTPUT: Single JSON object with keys: kickSafety, saturationNeed, transientHandling, highFreqTreatment, stereoIntent, confidence (0-1). Use only the allowed string values.`.trim();
};
