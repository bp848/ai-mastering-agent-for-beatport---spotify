import type { AudioAnalysisData, MasteringTarget } from '../types';
import { getMasteringSuggestionsGemini, type MasteringSuggestionsResult } from './geminiService';

/** Gemini API キーが利用可能か（VITE_GEMINI_API_KEY または GEMINI_API_KEY を Vite が注入） */
export function isGeminiAvailable(): boolean {
  const key = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || (typeof process !== 'undefined' && (process as { env?: { GEMINI_API_KEY?: string } }).env?.GEMINI_API_KEY);
  return !!(typeof key === 'string' && key.trim());
}

/** @deprecated マスタリングは Gemini を使用。互換のため残す */
export function isOpenAIAvailable(): boolean {
  return isGeminiAvailable();
}

/**
 * マスタリング用 AI 提案を取得（Gemini Pro 3）。
 * params と AI が返した生テキスト（rawResponseText）を返す。
 */
export async function getMasteringSuggestions(
  data: AudioAnalysisData,
  target: MasteringTarget,
  language: 'ja' | 'en',
): Promise<MasteringSuggestionsResult> {
  if (!isGeminiAvailable()) throw new Error("error.gemini.no_key");
  return getMasteringSuggestionsGemini(data, target, language);
}
