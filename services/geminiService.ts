
import { GoogleGenAI, Type } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams, EQAdjustment } from '../types';
import { getPlatformSpecifics, generateMasteringPrompt } from './masteringPrompts';

/** AI 出力を安全範囲にクランプし、精度・割れの原因を除去する（Gemini/OpenAI 共通） */
export function clampMasteringParams(raw: MasteringParams): MasteringParams {
  const safe: MasteringParams = {
    // 音割れの主因は「過大ゲイン」なので上限を強制的に低くする
    gain_adjustment_db: Math.round(Math.max(-5, Math.min(3, Number(raw.gain_adjustment_db) || 0)) * 100) / 100,
    // フォールバックで 0dB 近辺に寄せない。共有クランプ側も上限 -0.3 dB に統一
    limiter_ceiling_db: Math.max(-6, Math.min(-0.3, Number(raw.limiter_ceiling_db) ?? -1.0)),
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments.map(sanitizeEq) : [],
    tube_drive_amount: Math.max(0, Math.min(2, Number(raw.tube_drive_amount) ?? 0)),
    exciter_amount: Math.max(0, Math.min(0.12, Number(raw.exciter_amount) ?? 0)),
    low_contour_amount: Math.max(0, Math.min(0.8, Number(raw.low_contour_amount) ?? 0)),
    width_amount: Math.max(1.0, Math.min(1.4, Number(raw.width_amount) ?? 1)),
  };
  if (raw.target_lufs != null) safe.target_lufs = Number(raw.target_lufs);
  if (raw.tube_hpf_hz != null) safe.tube_hpf_hz = Number(raw.tube_hpf_hz);
  if (raw.exciter_hpf_hz != null) safe.exciter_hpf_hz = Number(raw.exciter_hpf_hz);
  if (raw.transient_attack_s != null) safe.transient_attack_s = Number(raw.transient_attack_s);
  if (raw.transient_release_s != null) safe.transient_release_s = Number(raw.transient_release_s);
  if (raw.limiter_attack_s != null) safe.limiter_attack_s = Number(raw.limiter_attack_s);
  if (raw.limiter_release_s != null) safe.limiter_release_s = Number(raw.limiter_release_s);
  if (raw.low_mono_hz != null) safe.low_mono_hz = Math.max(100, Math.min(320, Number(raw.low_mono_hz) || 150));
  return safe;
}

/** 危険素材（ピーク過多・低クレスト・高歪み）のときのみリミッター・tube・exciter を強く抑える */
export function applySafetyGuard(
  params: MasteringParams,
  analysis: AudioAnalysisData,
): MasteringParams {
  const peakHot = analysis.truePeak > -1; // dBTP が -1 より上はピーク過多
  const lowCrest = analysis.crestFactor < 9 && analysis.crestFactor > 0;
  const highDistortion = analysis.distortionPercent > 2;
  if (!peakHot && !lowCrest && !highDistortion) return params;

  const out = { ...params };
  if (peakHot || lowCrest || highDistortion) {
    out.limiter_ceiling_db = Math.min(out.limiter_ceiling_db, -0.3);
    out.tube_drive_amount = Math.max(0, (out.tube_drive_amount ?? 0) * 0.6);
    out.exciter_amount = Math.max(0, (out.exciter_amount ?? 0) * 0.5);
  }
  return out;
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

export interface MasteringSuggestionsResult {
  params: MasteringParams;
  rawResponseText: string;
}

export const getMasteringSuggestionsGemini = async (data: AudioAnalysisData, target: MasteringTarget, _language: 'ja' | 'en'): Promise<MasteringSuggestionsResult> => {
    const specifics = getPlatformSpecifics(target);
    const prompt = generateMasteringPrompt(data, specifics);
    const schema = getMasteringParamsSchema();

  try {
    const apiKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && (process as { env?: { API_KEY?: string; GEMINI_API_KEY?: string } }).env?.API_KEY) || (typeof process !== 'undefined' && (process as { env?: { GEMINI_API_KEY?: string } }).env?.GEMINI_API_KEY) || '';
    const ai = new GoogleGenAI({ apiKey });
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
    const clamped = clampMasteringParams(parsed);
    return { params: applySafetyGuard(clamped, data), rawResponseText: jsonText };
  } catch (error) {
    console.error("Gemini calculation failed:", error);
    throw new Error("error.gemini.fail");
  }
};

/** @deprecated Use getMasteringSuggestions from aiService for provider switch. */
export const getMasteringSuggestions = getMasteringSuggestionsGemini;

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
