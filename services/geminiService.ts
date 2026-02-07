
import { GoogleGenAI, Type } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';

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
      },
      required: ['gain_adjustment_db', 'limiter_ceiling_db', 'eq_adjustments'],
    };
}

const generatePrompt = (data: AudioAnalysisData, specifics: ReturnType<typeof getPlatformSpecifics>): string => {
    const bassLevel = data.frequencyData.find(f => f.name === '60-250')?.level ?? -20;
    const highLevel = data.frequencyData.find(f => f.name === '8k-20k')?.level ?? -20;

    return `
# ROLE
You are a mastering engineer whose only goal is **Beatport top chart competitiveness**. You give no deference to the mix—you suggest exactly what the track needs to compete. No softening, no "being nice"; only parameters that meet the standard.

# OBJECTIVE
Output DSP parameters so this track meets **${specifics.platformName}**. The analysis below is objective (LUFS, true peak, crest factor, spectrum). Use it strictly.

# TARGET (NON-NEGOTIABLE)
- INTEGRATED LUFS: ${specifics.targetLufs} dB
- TRUE PEAK: ${specifics.targetPeak} dBTP
- CONTEXT: ${specifics.genreContext}

# CURRENT ANALYSIS (USE AS-IS; DO NOT INTERPRET KINDLY)
- Integrated LUFS: ${data.lufs.toFixed(2)}  → gap to target: ${(specifics.targetLufs - data.lufs).toFixed(1)} dB
- True Peak: ${data.truePeak.toFixed(2)} dBTP
- Crest Factor: ${data.crestFactor.toFixed(2)}
- Low-end (60-250 Hz): ${bassLevel.toFixed(1)} dB
- High-end (8k-20k): ${highLevel.toFixed(1)} dB

# RULES (NO DEFERENCE)
1. GAIN: The track must reach ${specifics.targetLufs} LUFS. Add the gain required. Do not under-suggest to "be safe"; the limiter will catch peaks. If the mix is quiet, suggest the full gain needed.
2. LIMITER: Ceiling exactly ${specifics.targetPeak} dBTP.
3. EQ: Suggest what the spectrum actually needs to compete: if low-end is weak, add the shelf/cut needed; if highs are dull, add the air needed. Keep gains and Q within sane bounds (e.g. ±3 dB, Q 0.5–1.5) but do not avoid correction that the analysis clearly calls for.

# OUTPUT
Valid JSON only (schema provided). No commentary—only parameters.
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
    return JSON.parse(jsonText) as MasteringParams;
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
