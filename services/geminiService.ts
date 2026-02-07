
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
  // Beatport Techno/Trance 基準
  return {
    platformName: 'Beatport (Techno/Trance High-Energy Standard)',
    targetLufs: -7.0, // 極めて高い音圧が必要なクラブ標準
    targetPeak: -0.1, // 最大出力を確保するためのシーリング
    genreContext: 'Competitive Peak-Time Techno/Trance. Focus: Aggressive but clean loudness, punchy kick/sub-bass preservation, and extremely clear transients. Integrated LUFS must strictly target -7.0.'
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
You are a legendary Mastering Engineer for modern Techno and Trance (e.g., Drumcode style, Peak-Time, High-Energy).

# OBJECTIVE
Calculate precise DSP parameters to meet the **${specifics.platformName}** standard.

# TARGET STANDARDS (STRICT)
- TARGET INTEGRATED LUFS: ${specifics.targetLufs} dB
- TARGET TRUE PEAK: ${specifics.targetPeak} dBTP
- CONTEXT: ${specifics.genreContext}

# CURRENT AUDIO ANALYSIS DATA
- Integrated LUFS: ${data.lufs.toFixed(2)}
- True Peak: ${data.truePeak.toFixed(2)}
- Crest Factor: ${data.crestFactor.toFixed(2)}
- Low-end Energy (60-250Hz): ${bassLevel.toFixed(1)} dB
- High-end Energy (8k-20kHz): ${highLevel.toFixed(1)} dB

# MANDATORY INSTRUCTIONS
1. GAIN: Add precise gain to elevate the loudness from ${data.lufs.toFixed(2)} LUFS to exactly ${specifics.targetLufs} LUFS.
2. LIMITER: Set the ceiling to exactly ${specifics.targetPeak} dBTP.
3. EQ: 
   - If Low-end energy is below -25dB, add a Low-shelf boost at 80Hz. 
   - If High-end energy is below -30dB, add a High-shelf boost at 12kHz for "air".
   - If Crest Factor is high (>10), apply more aggressive limiting logic in your gain calculation.
   - For Techno/Trance, ensure sub-bass is clean and highs are crisp.

# OUTPUT
Respond with valid JSON following the provided schema.
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
