
import { GoogleGenAI, Type } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams, EQAdjustment } from '../types';

/** AI 出力を安全範囲にクランプし、精度・割れの原因を除去する */
function clampMasteringParams(raw: MasteringParams): MasteringParams {
  const safe: MasteringParams = {
    gain_adjustment_db: Math.max(-3, Math.min(15, Number(raw.gain_adjustment_db) || 0)),
    limiter_ceiling_db: Math.max(-6, Math.min(0, Number(raw.limiter_ceiling_db) ?? -0.1)),
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments.map(sanitizeEq) : [],
    tube_drive_amount: Math.max(0, Math.min(3, Number(raw.tube_drive_amount) ?? 0)),
    exciter_amount: Math.max(0, Math.min(0.15, Number(raw.exciter_amount) ?? 0)),
    low_contour_amount: Math.max(0, Math.min(1, Number(raw.low_contour_amount) ?? 0)),
    width_amount: Math.max(1.0, Math.min(1.4, Number(raw.width_amount) ?? 1)),
  };
  if (raw.target_lufs != null) safe.target_lufs = Number(raw.target_lufs);
  return safe;
}

const VALID_EQ_TYPES: EQAdjustment['type'][] = ['peak', 'lowshelf', 'highshelf', 'lowpass', 'highpass'];

function sanitizeEq(eq: Partial<EQAdjustment>): EQAdjustment {
  const type = VALID_EQ_TYPES.includes(eq.type as EQAdjustment['type']) ? eq.type : 'peak';
  return {
    type: type as EQAdjustment['type'],
    frequency: Math.max(20, Math.min(18000, Number(eq.frequency) || 1000)),
    gain_db: Math.max(-6, Math.min(6, Number(eq.gain_db) ?? 0)),
    q: Math.max(0.3, Math.min(8, Number(eq.q) ?? 1)),
  };
}

const getPlatformSpecifics = (target: MasteringTarget) => {
  if (target === 'spotify') {
    return {
      platformName: 'Spotify',
      targetLufs: -14.0,
      targetPeak: -1.0,
      genreContext: 'Streaming distribution. Target transparent and dynamic sound.'
    };
  }
  // Beatport Top 基準（忖度なし＝チャートで戦うための厳格基準）
  return {
    platformName: 'Beatport Top (Techno/Trance chart-competitive standard)',
    targetLufs: -7.0,
    targetPeak: -0.1,
    genreContext: 'This is for Beatport top chart competitiveness. No deference to the mix—only what the track needs to compete. Peak-Time Techno/Trance: aggressive loudness, punchy sub, clear transients. LUFS must hit -7.0; true peak at -0.1 dBTP.'
  };
};

const getMasteringParamsSchema = () => {
  return {
      type: Type.OBJECT,
      properties: {
        gain_adjustment_db: { type: Type.NUMBER, description: 'Gain value to reach exact target LUFS.' },
        limiter_ceiling_db: { type: Type.NUMBER, description: 'Final limiter ceiling value (dBTP).' },
        eq_adjustments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "Filter type: 'lowshelf', 'highshelf', or 'peak'." },
              frequency: { type: Type.NUMBER, description: "Center frequency in Hz." },
              gain_db: { type: Type.NUMBER, description: "Gain adjustment in dB." },
              q: { type: Type.NUMBER, description: "Q factor." },
            },
            required: ['type', 'frequency', 'gain_db', 'q'],
          },
        },
        // ★ Signature Engine Parameters
        tube_drive_amount:   { type: Type.NUMBER, description: 'Tube saturation drive (0.0–3.0). 0 = bypass if crest factor < 9. 1.0–2.0 for warmth. Avoid >2.5.' },
        exciter_amount:      { type: Type.NUMBER, description: 'High-freq exciter mix (0.0–0.15). Adds shimmer; keep low if highs already present.' },
        low_contour_amount:  { type: Type.NUMBER, description: 'Pultec sub-bass contour (0.0–1.0). 0 = bypass. ~0.5–0.8 tightens kick without mud.' },
        width_amount:        { type: Type.NUMBER, description: 'Stereo width multiplier for side signal (1.0–1.4). Do not exceed 1.25 unless mix is very narrow.' },
      },
      required: [
        'gain_adjustment_db', 'limiter_ceiling_db', 'eq_adjustments',
        'tube_drive_amount', 'exciter_amount', 'low_contour_amount',
        'width_amount',
      ],
    };
}

const generatePrompt = (data: AudioAnalysisData, specifics: ReturnType<typeof getPlatformSpecifics>): string => {
    // 全帯域の分析データを取得
    const subBass = data.frequencyData.find(f => f.name === '20-60')?.level ?? -100;
    const bass = data.frequencyData.find(f => f.name === '60-250')?.level ?? -100;
    const lowMid = data.frequencyData.find(f => f.name === '250-1k')?.level ?? -100;
    const mid = data.frequencyData.find(f => f.name === '1k-4k')?.level ?? -100;
    const highMid = data.frequencyData.find(f => f.name === '4k-8k')?.level ?? -100;
    const high = data.frequencyData.find(f => f.name === '8k-20k')?.level ?? -100;

    // Beatport top基準の理想的な帯域バランス（相対値）
    // 低域は強めだが、中域の明瞭度と高域の空気感も必須
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
Return an array of EQ adjustments prioritizing **cutting mud** over **boosting bass**.
`;
};

export const getMasteringSuggestions = async (data: AudioAnalysisData, target: MasteringTarget, language: 'ja' | 'en'): Promise<MasteringParams> => {
    const specifics = getPlatformSpecifics(target);
    const prompt = generatePrompt(data, specifics);
    const schema = getMasteringParamsSchema();

  try {
    // Fixed: Always create a new GoogleGenAI instance right before the request as per guidelines to avoid stale keys.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fixed: Use gemini-3-pro-preview for complex reasoning tasks as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("error.gemini.invalid_params");
    const parsed = JSON.parse(jsonText) as MasteringParams;
    return clampMasteringParams(parsed);
  } catch (error) {
    console.error("Gemini calculation failed:", error);
    throw new Error("error.gemini.fail");
  }
};

/** 楽曲情報からSNS投稿文を提案（Twitter/X, Instagram用など） */
export interface SnsSuggestionInput {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  releaseDate?: string;
}

export async function getSnsSuggestions(
  track: SnsSuggestionInput,
  language: 'ja' | 'en'
): Promise<string[]> {
  const langNote = language === 'ja'
    ? 'Respond in Japanese. Include 2-3 short variations for Twitter/X (under 140 chars) and 1 for Instagram caption (can be longer).'
    : 'Respond in English. Include 2-3 short variations for Twitter/X (under 280 chars) and 1 for Instagram caption.';

  const prompt = `You are a music marketing copywriter. Given this release info, suggest SNS post text for the artist to promote the track.

Track: ${track.title}
Artist: ${track.artist}
${track.album ? `Album: ${track.album}` : ''}
${track.genre ? `Genre: ${track.genre}` : ''}
${track.releaseDate ? `Release: ${track.releaseDate}` : ''}

${langNote}
Return ONLY a JSON array of strings, each string one post variation. Example: ["First post...", "Second post...", "Instagram caption..."]`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("error.gemini.invalid_params");
    const parsed = JSON.parse(text) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.filter((s): s is string => typeof s === 'string').slice(0, 5);
  } catch (error) {
    console.error("SNS suggestion failed:", error);
    throw new Error("error.gemini.fail");
  }
}
