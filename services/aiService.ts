import type { AudioAnalysisData, MasteringTarget } from '../types';
import { deriveTransparentMasteringParams } from './masteringDerivation';
import {
  applySafetyGuard,
  clampMasteringParams,
  getMasteringSuggestionsGemini,
  type MasteringSuggestionsResult,
} from './geminiService';

/** Gemini API キーが利用可能か（VITE_GEMINI_API_KEY または GEMINI_API_KEY を Vite が注入） */
export function isGeminiAvailable(): boolean {
  const key =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (typeof process !== 'undefined' &&
      (process as { env?: { GEMINI_API_KEY?: string } }).env?.GEMINI_API_KEY);
  return !!(typeof key === 'string' && key.trim());
}

/** AI マスタリングを有効化するか（未指定時は無効） */
export function isAiMasteringEnabled(): boolean {
  const flag =
    (import.meta.env.VITE_ENABLE_AI_MASTERING as string | undefined) ||
    (typeof process !== 'undefined' &&
      (process as { env?: { ENABLE_AI_MASTERING?: string } }).env?.ENABLE_AI_MASTERING);
  return String(flag).toLowerCase() === 'true';
}

/** @deprecated マスタリングは Gemini を使用。互換のため残す */
export function isOpenAIAvailable(): boolean {
  return isGeminiAvailable();
}

function buildDeterministicResult(data: AudioAnalysisData): MasteringSuggestionsResult {
  const transparent = deriveTransparentMasteringParams(data);
  const params = applySafetyGuard(clampMasteringParams(transparent), data);
  return {
    params,
    rawResponseText: JSON.stringify({ mode: 'deterministic', reason: 'ai_disabled_or_failed' }),
  };
}

/**
 * マスタリング提案を取得。
 * 既定では deterministic（分析値ベース）を返し、AI は明示フラグ時のみ実行。
 */
export async function getMasteringSuggestions(
  data: AudioAnalysisData,
  target: MasteringTarget,
  language: 'ja' | 'en',
): Promise<MasteringSuggestionsResult> {
  if (!isAiMasteringEnabled()) return buildDeterministicResult(data);
  if (!isGeminiAvailable()) throw new Error('error.gemini.no_key');

  try {
    return await getMasteringSuggestionsGemini(data, target, language);
  } catch {
    return buildDeterministicResult(data);
  }
}
