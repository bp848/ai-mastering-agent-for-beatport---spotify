import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { getMasteringSuggestionsGemini } from './geminiService';
import { getMasteringSuggestionsOpenAI } from './openaiMastering';

export type AIProvider = 'gemini' | 'openai';

export function isOpenAIAvailable(): boolean {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  return !!key?.trim();
}

function applyAnalysisSafetyGuard(
  params: MasteringParams,
  data: AudioAnalysisData,
): MasteringParams {
  const guarded: MasteringParams = {
    ...params,
    eq_adjustments: [...(params.eq_adjustments ?? [])],
  };

  const peakRisk = Math.max(0, data.truePeak + 0.2) / 0.8; // -0.2dBTP以上で上昇
  const crestRisk = Math.max(0, (9.0 - data.crestFactor) / 3.0);
  const distRisk = Math.max(0, (data.distortionPercent - 0.6) / 1.2);
  const risk = Math.min(1, Math.max(peakRisk, crestRisk, distRisk));

  if (risk > 0) {
    guarded.gain_adjustment_db = Math.min(guarded.gain_adjustment_db, 8 - 4 * risk);
    guarded.limiter_ceiling_db = Math.min(guarded.limiter_ceiling_db, -0.15 - 0.35 * risk);
    guarded.tube_drive_amount = Math.min(guarded.tube_drive_amount, 2.2 - 1.2 * risk);
    guarded.exciter_amount = Math.min(guarded.exciter_amount, 0.12 - 0.07 * risk);
    guarded.low_contour_amount = Math.min(guarded.low_contour_amount, 1.0 - 0.3 * risk);
  }

  return guarded;
}

/**
 * マスタリング用 AI 提案を取得。
 * options.provider が指定されていればそのプロバイダー、未指定なら
 * VITE_OPENAI_API_KEY が設定されていれば OpenAI、なければ Gemini。
 */
export async function getMasteringSuggestions(
  data: AudioAnalysisData,
  target: MasteringTarget,
  language: 'ja' | 'en',
  options?: { provider?: AIProvider }
): Promise<MasteringParams> {
  const provider = options?.provider ?? (isOpenAIAvailable() ? 'openai' : 'gemini');
  const params = provider === 'openai'
    ? await getMasteringSuggestionsOpenAI(data, target, language)
    : await getMasteringSuggestionsGemini(data, target, language);

  return applyAnalysisSafetyGuard(params, data);
}

export const __internal = {
  applyAnalysisSafetyGuard,
};
