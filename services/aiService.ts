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

  const alreadyHot = data.truePeak > -0.3;
  const lowHeadroom = data.crestFactor < 9.5;
  const distortedInput = data.distortionPercent >= 0.8;
  const brittleTop = data.noiseFloorDb > -45;

  if (alreadyHot || lowHeadroom || distortedInput) {
    guarded.gain_adjustment_db = Math.min(guarded.gain_adjustment_db, 3.5);
    guarded.limiter_ceiling_db = Math.min(guarded.limiter_ceiling_db, -0.6);
    guarded.tube_drive_amount = Math.min(guarded.tube_drive_amount, 0.8);
    guarded.exciter_amount = Math.min(guarded.exciter_amount, 0.04);
    guarded.low_contour_amount = Math.min(guarded.low_contour_amount, 0.7);
  }

  if (brittleTop) {
    guarded.exciter_amount = Math.min(guarded.exciter_amount, 0.03);
    guarded.eq_adjustments.push({
      type: 'highshelf',
      frequency: 9500,
      gain_db: -1.5,
      q: 0.7,
    });
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
