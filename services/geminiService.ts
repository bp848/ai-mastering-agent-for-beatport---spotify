import { GoogleGenAI } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { deriveMasteringParamsFromDecision } from './masteringDerivation';
import { resolveMasteringDecision } from './aiDebateService';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function clampMasteringParams(raw: MasteringParams): MasteringParams {
  return {
    ...raw,
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments : [],
  };
}

export function applySafetyGuard(params: MasteringParams, analysis: AudioAnalysisData): MasteringParams {
  const safe = { ...params };
  const peakRisk = clamp((analysis.truePeak + 6) / 6, 0, 1);
  const crestRisk = clamp((8 - analysis.crestFactor) / 8, 0, 1);
  const dynamicRisk = clamp((8 - analysis.dynamicRange) / 8, 0, 1);
  const distortionRisk = clamp(Math.abs(analysis.distortionPercent) / 100, 0, 1);
  const phaseRisk = clamp((1 - analysis.phaseCorrelation) / 2, 0, 1);
  const pressure = clamp(
    peakRisk * 0.35 + crestRisk * 0.2 + dynamicRisk * 0.2 + distortionRisk * 0.2 + phaseRisk * 0.05,
    0,
    1,
  );

  const tubeScale = 1 - pressure * 0.45;
  const exciterScale = 1 - pressure * 0.7;

  safe.tube_drive_amount = Math.max(0, safe.tube_drive_amount * tubeScale);
  safe.exciter_amount = Math.max(0, safe.exciter_amount * exciterScale);
  safe.limiter_ceiling_db = clamp(Math.min(safe.limiter_ceiling_db, -0.6 - pressure * 0.8), -2.4, -0.6);

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
