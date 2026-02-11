import { GoogleGenAI } from '@google/genai';
import type { AudioAnalysisData, MasteringTarget, AIDecision } from '../types';
import { getPlatformSpecifics, generateGeminiInitialPrompt, generateGptReviewPrompt, generateConsensusPrompt } from './masteringPrompts';

const KICK_SAFETY = ['safe', 'borderline', 'danger'] as const;
const SATURATION_NEED = ['none', 'light', 'moderate'] as const;
const TRANSIENT_HANDLING = ['preserve', 'soften', 'control'] as const;
const HIGH_FREQ_TREATMENT = ['leave', 'polish', 'restrain'] as const;
const STEREO_INTENT = ['monoSafe', 'balanced', 'wide'] as const;

function parseJsonDecision(raw: string): Partial<AIDecision> | null {
  try {
    const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
    return parsed as Partial<AIDecision>;
  } catch {
    return null;
  }
}

/** 生パース結果を正しい AIDecision に正規化する。 */
export function normalizeDecision(partial: Partial<AIDecision> | null): AIDecision {
  if (!partial) {
    return {
      kickSafety: 'safe',
      saturationNeed: 'none',
      transientHandling: 'preserve',
      highFreqTreatment: 'leave',
      stereoIntent: 'balanced',
      confidence: 0.5,
    };
  }
  return {
    kickSafety: KICK_SAFETY.includes(partial.kickSafety as typeof KICK_SAFETY[number]) ? (partial.kickSafety as typeof KICK_SAFETY[number]) : 'safe',
    saturationNeed: SATURATION_NEED.includes(partial.saturationNeed as typeof SATURATION_NEED[number]) ? (partial.saturationNeed as typeof SATURATION_NEED[number]) : 'none',
    transientHandling: TRANSIENT_HANDLING.includes(partial.transientHandling as typeof TRANSIENT_HANDLING[number]) ? (partial.transientHandling as typeof TRANSIENT_HANDLING[number]) : 'preserve',
    highFreqTreatment: HIGH_FREQ_TREATMENT.includes(partial.highFreqTreatment as typeof HIGH_FREQ_TREATMENT[number]) ? (partial.highFreqTreatment as typeof HIGH_FREQ_TREATMENT[number]) : 'leave',
    stereoIntent: STEREO_INTENT.includes(partial.stereoIntent as typeof STEREO_INTENT[number]) ? (partial.stereoIntent as typeof STEREO_INTENT[number]) : 'balanced',
    confidence: typeof partial.confidence === 'number' && partial.confidence >= 0 && partial.confidence <= 1 ? partial.confidence : 0.5,
  };
}

/** 2つの決定を合意形成：不一致の場合はより保守側を優先。 */
export function reconcileDecisions(a: AIDecision, b: AIDecision): AIDecision {
  const kickOrder = { danger: 0, borderline: 1, safe: 2 };
  const satOrder = { moderate: 0, light: 1, none: 2 };
  const transOrder = { control: 0, soften: 1, preserve: 2 };
  const highOrder = { restrain: 0, polish: 1, leave: 2 };
  const wideOrder = { wide: 0, balanced: 1, monoSafe: 2 };

  return {
    kickSafety: kickOrder[a.kickSafety] <= kickOrder[b.kickSafety] ? a.kickSafety : b.kickSafety,
    saturationNeed: satOrder[a.saturationNeed] <= satOrder[b.saturationNeed] ? a.saturationNeed : b.saturationNeed,
    transientHandling: transOrder[a.transientHandling] <= transOrder[b.transientHandling] ? a.transientHandling : b.transientHandling,
    highFreqTreatment: highOrder[a.highFreqTreatment] <= highOrder[b.highFreqTreatment] ? a.highFreqTreatment : b.highFreqTreatment,
    stereoIntent: wideOrder[a.stereoIntent] <= wideOrder[b.stereoIntent] ? a.stereoIntent : b.stereoIntent,
    confidence: (a.confidence + b.confidence) / 2,
  };
}

function getGeminiKey(): string {
  return (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY
    || (typeof process !== 'undefined' && (process as { env?: { GEMINI_API_KEY?: string } }).env?.GEMINI_API_KEY) || '';
}

function getOpenAIKey(): string {
  return (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } }).env?.VITE_OPENAI_API_KEY?.trim() || '';
}

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('error.gemini.no_key');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const text = response.text?.trim();
  if (!text) throw new Error('error.gemini.invalid_params');
  return text;
}

async function callGptText(prompt: string): Promise<string> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('error.openai.no_key');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: (import.meta as unknown as { env?: { VITE_OPENAI_MASTERING_MODEL?: string } }).env?.VITE_OPENAI_MASTERING_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('OpenAI review error', res.status, err);
    throw new Error('error.openai.fail');
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('error.openai.invalid_params');
  return text;
}

/**
 * Gemini 一次評価 → (オプション) GPT レビュー → Gemini 合意 の順で AIDecision を確定する。
 * OpenAI キーが未設定の場合は Gemini 単独で決定する。
 */
export async function resolveMasteringDecision(
  analysis: AudioAnalysisData,
  target: MasteringTarget,
  _language: 'ja' | 'en',
): Promise<{ decision: AIDecision; rawResponseText: string }> {
  const specifics = getPlatformSpecifics(target);
  const initialPrompt = generateGeminiInitialPrompt(analysis, specifics);
  const gemini1 = await callGeminiText(initialPrompt);
  const decision1 = normalizeDecision(parseJsonDecision(gemini1));

  const hasOpenAI = !!getOpenAIKey();
  if (!hasOpenAI) {
    return { decision: decision1, rawResponseText: gemini1 };
  }

  let gptJson: string;
  try {
    const reviewPrompt = generateGptReviewPrompt(analysis, specifics, gemini1);
    gptJson = await callGptText(reviewPrompt);
  } catch (e) {
    console.warn('GPT review failed, using Gemini initial', e);
    return { decision: decision1, rawResponseText: gemini1 };
  }

  const decision2 = normalizeDecision(parseJsonDecision(gptJson));
  const consensusPrompt = generateConsensusPrompt(gemini1, gptJson);
  let consensusJson: string;
  try {
    consensusJson = await callGeminiText(consensusPrompt);
  } catch (e) {
    console.warn('Consensus failed, reconciling locally', e);
    const reconciled = reconcileDecisions(decision1, decision2);
    return { decision: reconciled, rawResponseText: JSON.stringify(reconciled) };
  }

  const consensus = normalizeDecision(parseJsonDecision(consensusJson));
  const final = reconcileDecisions(consensus, decision2);
  return { decision: final, rawResponseText: consensusJson };
}
