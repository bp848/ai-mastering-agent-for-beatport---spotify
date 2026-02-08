
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
        // ★ Signature Engine Parameters
        tube_drive_amount:   { type: Type.NUMBER, description: 'Tube saturation drive (0.0–5.0). 0 = bypass. ~1.0–2.0 for subtle analog warmth; >3.0 for heavy coloring.' },
        exciter_amount:      { type: Type.NUMBER, description: 'High-freq exciter mix (0.0–0.20). Adds "sparkle" harmonics above 6 kHz.' },
        low_contour_amount:  { type: Type.NUMBER, description: 'Pultec sub-bass contour (0.0–1.0). 0 = bypass. ~0.5–0.8 tightens kick without mud.' },
        width_amount:        { type: Type.NUMBER, description: 'Stereo width multiplier for side signal (1.0–1.5). 1.0 = unchanged.' },
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

# FULL SPECTRUM ANALYSIS (ALL BANDS - DO NOT FOCUS ON BASS ALONE)
- Sub-bass (20-60 Hz): ${subBass.toFixed(1)} dB (target: ~${targetProfile.subBass} dB)
- Bass (60-250 Hz): ${bass.toFixed(1)} dB (target: ~${targetProfile.bass} dB)
- Low-mid (250-1k Hz): ${lowMid.toFixed(1)} dB (target: ~${targetProfile.lowMid} dB) ← CLARITY ZONE
- Mid (1k-4k Hz): ${mid.toFixed(1)} dB (target: ~${targetProfile.mid} dB) ← PRESENCE ZONE
- High-mid (4k-8k Hz): ${highMid.toFixed(1)} dB (target: ~${targetProfile.highMid} dB) ← DEFINITION ZONE
- High (8k-20k Hz): ${high.toFixed(1)} dB (target: ~${targetProfile.high} dB) ← AIR ZONE

# RULES (NO DEFERENCE - BALANCED APPROACH)
1. GAIN: The track must reach ${specifics.targetLufs} LUFS. Add the gain required. Do not under-suggest to "be safe"; the limiter will catch peaks. If the mix is quiet, suggest the full gain needed.
   **IMPORTANT**: The system will automatically verify the resulting LUFS via a simulation loop and adjust the gain if needed. You provide the best initial estimate.

2. LIMITER: Ceiling exactly ${specifics.targetPeak} dBTP.

3. EQ (CRITICAL - BALANCED SPECTRUM, NOT JUST BASS BOOST):
   - **DO NOT** simply boost bass. A professional master requires balanced frequency response across ALL bands.
   - Analyze each band's relationship to the target profile above.
   - If sub-bass is weak relative to bass, use a narrow peak filter (not a shelf) to add weight without muddying.
   - If low-mid (250-1k) is recessed, this kills clarity—add presence here with a gentle boost (1-2 dB, Q 0.7-1.0).
   - If mid (1k-4k) is weak, vocals/instruments lose definition—add 1-2 dB here with Q 0.8-1.2.
   - If high-mid (4k-8k) is dull, transients lose punch—add air here with a shelf or peak (1-2 dB max).
   - If high (8k-20k) is missing, the track sounds closed—add a high-shelf starting at 8-10k (1-2 dB max).
   - **If bass is already strong but other bands are weak, prioritize fixing the weak bands first.**
   - Keep gains conservative (±2 dB max per band, Q 0.5–1.5) but address clear imbalances.
   - Use multiple small adjustments across bands rather than one large bass boost.

4. SIGNATURE SOUND (CHARACTER DSP - your artistic judgment):
   - **tube_drive_amount** (0.0–5.0): Analog warmth via tube saturation. For clean mixes: 1.0–1.5. For aggressive Peak-Time Techno: 2.0–3.0. Set 0 only if the mix is already saturated/clipping.
   - **exciter_amount** (0.0–0.20): High-freq harmonics above 6 kHz. If the high band analysis shows dullness, push toward 0.10–0.15. If highs are already present, keep ~0.04–0.06.
   - **low_contour_amount** (0.0–1.0): Sub-bass tightening (Pultec trick). If crest factor is low or the kick lacks weight, increase toward 0.7–1.0. If bass is muddy, lower to 0.3–0.5.
   - **width_amount** (1.0–1.5): Side signal multiplier. If stereo width < 40%: increase toward 1.3–1.5. If width > 70%: keep at 1.0–1.1 to avoid phase issues. Bass mono is fixed at 150 Hz internally.

# OUTPUT
Valid JSON only (schema provided). No commentary—only parameters. Return an array of EQ adjustments that address the FULL spectrum balance, not just bass.
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
