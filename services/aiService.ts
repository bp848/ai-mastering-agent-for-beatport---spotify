import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { getMasteringSuggestionsGemini } from './geminiService';
import { getMasteringSuggestionsOpenAI } from './openaiMastering';

export type AIProvider = 'gemini' | 'openai';

export function isOpenAIAvailable(): boolean {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  return !!key?.trim();
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
  if (provider === 'openai') {
    return getMasteringSuggestionsOpenAI(data, target, language);
  }
  return getMasteringSuggestionsGemini(data, target, language);
}
