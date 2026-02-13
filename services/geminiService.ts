
import { GoogleGenAI, Type } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams, EQAdjustment } from '../types';
import { getPlatformSpecifics, generateMasteringPrompt } from './masteringPrompts';

/** AI output passed through with minimal safety checks - physical limits only */
export function clampMasteringParams(raw: MasteringParams): MasteringParams {
  const safe: MasteringParams = {
    // GAIN: No arbitrary caps - let AI decide. Only prevent NaN/Infinity.
    gain_adjustment_db: Math.round((Number(raw.gain_adjustment_db) || 0) * 100) / 100,
    // LIMITER CEILING: Physical limit only. AI can go as hot as requested.
    limiter_ceiling_db: Number(raw.limiter_ceiling_db) ?? -1.0,
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments.map(sanitizeEq) : [],
    // TUBE: No clamps - respect AI judgment
    tube_drive_amount: Number(raw.tube_drive_amount) ?? 0,
    // EXCITER: No clamps - respect AI judgment
    exciter_amount: Number(raw.exciter_amount) ?? 0,
    // LOW CONTOUR: No clamps - respect AI judgment
    low_contour_amount: Number(raw.low_contour_amount) ?? 0,
    // WIDTH: No clamps - respect AI judgment
    width_amount: Number(raw.width_amount) ?? 1,
    dynamic_automation: raw.dynamic_automation ? {
      input_gain_offset_quiet_db: Number(raw.dynamic_automation.input_gain_offset_quiet_db) ?? -1.0,
      width_offset_quiet_percent: Number(raw.dynamic_automation.width_offset_quiet_percent) ?? 100,
      width_boost_drop_percent: Number(raw.dynamic_automation.width_boost_drop_percent) ?? 115,
      transition_time_sec: Number(raw.dynamic_automation.transition_time_sec) ?? 1.5,
    } : undefined
  };
  if (raw.target_lufs != null) safe.target_lufs = Number(raw.target_lufs);
  if (raw.tube_hpf_hz != null) safe.tube_hpf_hz = Number(raw.tube_hpf_hz);
  if (raw.exciter_hpf_hz != null) safe.exciter_hpf_hz = Number(raw.exciter_hpf_hz);
  if (raw.transient_attack_s != null) safe.transient_attack_s = Number(raw.transient_attack_s);
  if (raw.transient_release_s != null) safe.transient_release_s = Number(raw.transient_release_s);
  if (raw.limiter_attack_s != null) safe.limiter_attack_s = Number(raw.limiter_attack_s);
  if (raw.limiter_release_s != null) safe.limiter_release_s = Number(raw.limiter_release_s);
  if (raw.low_mono_hz != null) safe.low_mono_hz = Number(raw.low_mono_hz) || 150;
  return safe;
}

/** Safety guard DISABLED - AI judgment is trusted.
 * Previous implementation forced ceiling to -1.0 and reduced tube/exciter on "risky" material.
 * This override has been removed. AI parameters pass through unchanged.
 */
export function applySafetyGuard(
  params: MasteringParams,
  _analysis: AudioAnalysisData,
): MasteringParams {
  // Return params unchanged - no overrides
  return params;
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
      tube_drive_amount: { type: Type.NUMBER, description: 'Tube saturation drive.' },
      exciter_amount: { type: Type.NUMBER, description: 'High-freq exciter mix.' },
      low_contour_amount: { type: Type.NUMBER, description: 'Pultec sub-bass contour level.' },
      width_amount: { type: Type.NUMBER, description: 'Stereo width multiplier for side signal.' },
      dynamic_automation: {
        type: Type.OBJECT,
        properties: {
          input_gain_offset_quiet_db: { type: Type.NUMBER, description: 'Input gain offset for quiet sections (e.g. -1.5).' },
          width_offset_quiet_percent: { type: Type.NUMBER, description: 'Width offset for quiet sections (e.g. 100).' },
          width_boost_drop_percent: { type: Type.NUMBER, description: 'Width boost for drop (e.g. 115).' },
          transition_time_sec: { type: Type.NUMBER, description: 'Transition ramp duration (e.g. 1.5).' },
        },
        required: ['input_gain_offset_quiet_db', 'width_offset_quiet_percent', 'width_boost_drop_percent', 'transition_time_sec'],
      },
    },
    required: [
      'gain_adjustment_db', 'limiter_ceiling_db', 'eq_adjustments',
      'tube_drive_amount', 'exciter_amount', 'low_contour_amount',
      'width_amount', 'dynamic_automation'
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
      model: 'gemini-1.5-pro',
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
      model: 'gemini-1.5-pro',
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
