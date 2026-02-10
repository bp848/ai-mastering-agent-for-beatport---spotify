import { GoogleGenAI } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { deriveMasteringParamsFromDecision } from './masteringDerivation';
import { resolveMasteringDecision } from './aiDebateService';

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

export interface MasteringSuggestionsResult {
  params: MasteringParams;
  rawResponseText: string;
}

export const getMasteringSuggestionsGemini = async (data: AudioAnalysisData, target: MasteringTarget, _language: 'ja' | 'en'): Promise<MasteringSuggestionsResult> => {
  try {
    const result = await resolveMasteringDecision(data, target);
    const derived = deriveMasteringParamsFromDecision(result.decision, data);
    const safe = applySafetyGuard(clampMasteringParams(derived), data);
    return { params: safe, rawResponseText: JSON.stringify(result.trace) };
  } catch (error) {
    console.error("Gemini calculation failed:", error);
    throw new Error("error.gemini.fail");
  }
};

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
