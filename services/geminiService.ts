import { GoogleGenAI, Type } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams, MasteringIntent } from '../types';
import { getPlatformSpecifics, generateMasteringPrompt } from './masteringPrompts';
import { deriveMasteringParamsFromIntent } from './masteringDerivation';

const normalizeIntent = (raw: Partial<MasteringIntent>): MasteringIntent => {
  const risk = ['low', 'mid', 'high'] as const;
  const bass = ['thin', 'normal', 'thick'] as const;
  const harsh = ['none', 'some', 'strong'] as const;
  const stereo = ['narrow', 'normal', 'wide'] as const;

  return {
    kickRisk: risk.includes(raw.kickRisk as (typeof risk)[number]) ? (raw.kickRisk as (typeof risk)[number]) : 'mid',
    transientRisk: risk.includes(raw.transientRisk as (typeof risk)[number]) ? (raw.transientRisk as (typeof risk)[number]) : 'mid',
    bassDensity: bass.includes(raw.bassDensity as (typeof bass)[number]) ? (raw.bassDensity as (typeof bass)[number]) : 'normal',
    highHarshness: harsh.includes(raw.highHarshness as (typeof harsh)[number]) ? (raw.highHarshness as (typeof harsh)[number]) : 'some',
    stereoNeed: stereo.includes(raw.stereoNeed as (typeof stereo)[number]) ? (raw.stereoNeed as (typeof stereo)[number]) : 'normal',
  };
};

export function clampMasteringParams(raw: MasteringParams): MasteringParams {
  return {
    ...raw,
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments : [],
  };
}

export function applySafetyGuard(params: MasteringParams, analysis: AudioAnalysisData): MasteringParams {
  const safe = { ...params };
  const profile = [
    1 / (Math.abs(analysis.truePeak) + 1),
    1 / (Math.abs(analysis.crestFactor) + 1),
    1 / (Math.abs(analysis.dynamicRange) + 1),
    Math.abs(analysis.distortionPercent),
    1 / (Math.abs(analysis.phaseCorrelation) + 1),
  ];
  const pressure = profile.reduce((sum, value) => sum + value, 0) / (profile.length || 1);

  const tubeDenominator = 1 + pressure;
  const exciterDenominator = 1 + pressure + Math.abs(analysis.distortionPercent);

  safe.tube_drive_amount = safe.tube_drive_amount / tubeDenominator;
  safe.exciter_amount = safe.exciter_amount / exciterDenominator;
  safe.limiter_ceiling_db = safe.limiter_ceiling_db - pressure;

  return safe;
}

const getMasteringIntentSchema = () => ({
  type: Type.OBJECT,
  properties: {
    kickRisk: { type: Type.STRING, enum: ['low', 'mid', 'high'] },
    transientRisk: { type: Type.STRING, enum: ['low', 'mid', 'high'] },
    bassDensity: { type: Type.STRING, enum: ['thin', 'normal', 'thick'] },
    highHarshness: { type: Type.STRING, enum: ['none', 'some', 'strong'] },
    stereoNeed: { type: Type.STRING, enum: ['narrow', 'normal', 'wide'] },
  },
  required: ['kickRisk', 'transientRisk', 'bassDensity', 'highHarshness', 'stereoNeed'],
});

export interface MasteringSuggestionsResult {
  params: MasteringParams;
  rawResponseText: string;
}

export const getMasteringSuggestionsGemini = async (data: AudioAnalysisData, target: MasteringTarget, _language: 'ja' | 'en'): Promise<MasteringSuggestionsResult> => {
  const specifics = getPlatformSpecifics(target);
  const prompt = generateMasteringPrompt(data, specifics);
  const schema = getMasteringIntentSchema();

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
    const parsed = JSON.parse(jsonText) as Partial<MasteringIntent>;
    const intent = normalizeIntent(parsed);
    const derived = deriveMasteringParamsFromIntent(intent, data);
    const safe = applySafetyGuard(clampMasteringParams(derived), data);
    return { params: safe, rawResponseText: jsonText };
  } catch (error) {
    console.error("Gemini calculation failed:", error);
    throw new Error("error.gemini.fail");
  }
};

/** @deprecated Use getMasteringSuggestions from aiService for provider switch. */
export const getMasteringSuggestions = getMasteringSuggestionsGemini;

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
