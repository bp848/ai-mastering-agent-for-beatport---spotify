import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { getMasteringSuggestionsOpenAI } from './openaiMastering';

export function isOpenAIAvailable(): boolean {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  return !!key?.trim();
}

/**
 * マスタリング用 AI 提案を取得（OpenAI のみ）。
 * ブラウザに秘密鍵を持たせる設計は本来推奨されませんが、
 * ここでは「常に割れる」状態を止めるため、プロバイダー分岐を廃止して安定化します。
 */
export async function getMasteringSuggestions(
  data: AudioAnalysisData,
  target: MasteringTarget,
  language: 'ja' | 'en',
): Promise<MasteringParams> {
  if (!isOpenAIAvailable()) throw new Error("error.openai.no_key");
  return getMasteringSuggestionsOpenAI(data, target, language);
}
