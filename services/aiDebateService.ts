import { GoogleGenAI, Type } from '@google/genai';
import type { AIDecision, AudioAnalysisData, MasteringTarget } from '../types';
import {
  generateConsensusPrompt,
  generateGeminiInitialPrompt,
  generateGptReviewPrompt,
  getPlatformSpecifics,
} from './masteringPrompts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const decisionSchema = {
  type: Type.OBJECT,
  properties: {
    kickSafety: { type: Type.STRING, enum: ['safe', 'borderline', 'danger'] },
    saturationNeed: { type: Type.STRING, enum: ['none', 'light', 'moderate'] },
    transientHandling: { type: Type.STRING, enum: ['preserve', 'soften', 'control'] },
    highFreqTreatment: { type: Type.STRING, enum: ['leave', 'polish', 'restrain'] },
    stereoIntent: { type: Type.STRING, enum: ['monoSafe', 'balanced', 'wide'] },
    confidence: { type: Type.NUMBER },
  },
  required: ['kickSafety', 'saturationNeed', 'transientHandling', 'highFreqTreatment', 'stereoIntent', 'confidence'],
};

const kickOrder: AIDecision['kickSafety'][] = ['safe', 'borderline', 'danger'];
const satOrder: AIDecision['saturationNeed'][] = ['none', 'light', 'moderate'];
const transientOrder: AIDecision['transientHandling'][] = ['preserve', 'soften', 'control'];
const highOrder: AIDecision['highFreqTreatment'][] = ['leave', 'polish', 'restrain'];
const stereoOrder: AIDecision['stereoIntent'][] = ['monoSafe', 'balanced', 'wide'];

const asIndex = <T extends string>(value: T, order: readonly T[]): number => Math.max(0, order.indexOf(value));
const pickByWeight = <T extends string>(left: T, right: T, order: readonly T[], leftWeight: number, rightWeight: number): T => {
  const weighted = (asIndex(left, order) * leftWeight + asIndex(right, order) * rightWeight) / (leftWeight + rightWeight || 1);
  const rounded = Math.round(weighted);
  return order[Math.min(order.length - 1, Math.max(0, rounded))];
};

export const normalizeDecision = (raw: Partial<AIDecision>): AIDecision => {
  const kickSafety = kickOrder.includes(raw.kickSafety as AIDecision['kickSafety']) ? raw.kickSafety as AIDecision['kickSafety'] : 'borderline';
  const saturationNeed = satOrder.includes(raw.saturationNeed as AIDecision['saturationNeed']) ? raw.saturationNeed as AIDecision['saturationNeed'] : 'light';
  const transientHandling = transientOrder.includes(raw.transientHandling as AIDecision['transientHandling']) ? raw.transientHandling as AIDecision['transientHandling'] : 'soften';
  const highFreqTreatment = highOrder.includes(raw.highFreqTreatment as AIDecision['highFreqTreatment']) ? raw.highFreqTreatment as AIDecision['highFreqTreatment'] : 'polish';
  const stereoIntent = stereoOrder.includes(raw.stereoIntent as AIDecision['stereoIntent']) ? raw.stereoIntent as AIDecision['stereoIntent'] : 'balanced';
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0.5));
  return { kickSafety, saturationNeed, transientHandling, highFreqTreatment, stereoIntent, confidence };
};

export const reconcileDecisions = (geminiDecision: AIDecision, gptDecision: AIDecision): AIDecision => {
  const gw = Math.max(0.000001, geminiDecision.confidence);
  const ow = Math.max(0.000001, gptDecision.confidence);
  return {
    kickSafety: pickByWeight(geminiDecision.kickSafety, gptDecision.kickSafety, kickOrder, gw, ow),
    saturationNeed: pickByWeight(geminiDecision.saturationNeed, gptDecision.saturationNeed, satOrder, gw, ow),
    transientHandling: pickByWeight(geminiDecision.transientHandling, gptDecision.transientHandling, transientOrder, gw, ow),
    highFreqTreatment: pickByWeight(geminiDecision.highFreqTreatment, gptDecision.highFreqTreatment, highOrder, gw, ow),
    stereoIntent: pickByWeight(geminiDecision.stereoIntent, gptDecision.stereoIntent, stereoOrder, gw, ow),
    confidence: (geminiDecision.confidence + gptDecision.confidence) / 2,
  };
};

const getGeminiApiKey = (): string =>
  (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY
  || (typeof process !== 'undefined' && (process as { env?: { API_KEY?: string; GEMINI_API_KEY?: string } }).env?.API_KEY)
  || (typeof process !== 'undefined' && (process as { env?: { GEMINI_API_KEY?: string } }).env?.GEMINI_API_KEY)
  || '';

const getOpenAiApiKey = (): string =>
  (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } }).env?.VITE_OPENAI_API_KEY
  || '';

const runGeminiDecision = async (prompt: string): Promise<AIDecision> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey.trim()) throw new Error('error.gemini.no_key');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: decisionSchema,
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error('error.gemini.invalid_params');
  return normalizeDecision(JSON.parse(text) as Partial<AIDecision>);
};

const runOpenAiDecision = async (prompt: string): Promise<AIDecision> => {
  const apiKey = getOpenAiApiKey();
  if (!apiKey.trim()) throw new Error('error.openai.no_key');
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: (import.meta as unknown as { env?: { VITE_OPENAI_MASTERING_MODEL?: string } }).env?.VITE_OPENAI_MASTERING_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error('error.openai.fail');
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('error.openai.invalid_params');
  return normalizeDecision(JSON.parse(text) as Partial<AIDecision>);
};

export async function resolveMasteringDecision(
  data: AudioAnalysisData,
  target: MasteringTarget,
): Promise<{ decision: AIDecision; trace: { gemini: AIDecision; gpt?: AIDecision; consensus?: AIDecision } }> {
  const specifics = getPlatformSpecifics(target);
  const geminiPrompt = generateGeminiInitialPrompt(data, specifics);
  const geminiDecision = await runGeminiDecision(geminiPrompt);

  const openAiKey = getOpenAiApiKey();
  if (!openAiKey.trim()) {
    return { decision: geminiDecision, trace: { gemini: geminiDecision } };
  }

  try {
    const gptPrompt = generateGptReviewPrompt(data, specifics, geminiDecision);
    const gptDecision = await runOpenAiDecision(gptPrompt);
    const consensusPrompt = generateConsensusPrompt(specifics, geminiDecision, gptDecision);
    const consensus = await runGeminiDecision(consensusPrompt);
    return { decision: consensus, trace: { gemini: geminiDecision, gpt: gptDecision, consensus } };
  } catch {
    return { decision: geminiDecision, trace: { gemini: geminiDecision } };
  }
}
