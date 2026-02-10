import type { AudioAnalysisData, MasteringTarget, MasteringParams, MasteringIntent } from '../types';
import { getPlatformSpecifics, generateMasteringPrompt } from './masteringPrompts';
import { applySafetyGuard, clampMasteringParams } from './geminiService';
import { deriveMasteringParamsFromIntent } from './masteringDerivation';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface MasteringSuggestionsResult {
  params: MasteringParams;
  rawResponseText: string;
}

const normalizeIntent = (raw: Partial<MasteringIntent>): MasteringIntent => {
  const kickRisk = raw.kickRisk === 'low' || raw.kickRisk === 'mid' || raw.kickRisk === 'high' ? raw.kickRisk : 'mid';
  const transientRisk = raw.transientRisk === 'low' || raw.transientRisk === 'mid' || raw.transientRisk === 'high' ? raw.transientRisk : 'mid';
  const bassDensity = raw.bassDensity === 'thin' || raw.bassDensity === 'normal' || raw.bassDensity === 'thick' ? raw.bassDensity : 'normal';
  const highHarshness = raw.highHarshness === 'none' || raw.highHarshness === 'some' || raw.highHarshness === 'strong' ? raw.highHarshness : 'some';
  const stereoNeed = raw.stereoNeed === 'narrow' || raw.stereoNeed === 'normal' || raw.stereoNeed === 'wide' ? raw.stereoNeed : 'normal';

  return { kickRisk, transientRisk, bassDensity, highHarshness, stereoNeed };
};

export async function getMasteringSuggestionsOpenAI(
  data: AudioAnalysisData,
  target: MasteringTarget,
  _language: 'ja' | 'en'
): Promise<MasteringSuggestionsResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey?.trim()) throw new Error("error.openai.no_key");

  const specifics = getPlatformSpecifics(target);
  const prompt = generateMasteringPrompt(data, specifics);
  const model = (import.meta.env.VITE_OPENAI_MASTERING_MODEL as string) || 'gpt-4o';

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('OpenAI API error:', res.status, err);
    throw new Error("error.openai.fail");
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("error.openai.invalid_params");

  const parsed = JSON.parse(text) as Partial<MasteringIntent>;
  const intent = normalizeIntent(parsed);
  const derived = deriveMasteringParamsFromIntent(intent, data);
  const clamped = clampMasteringParams(derived);
  return { params: applySafetyGuard(clamped, data), rawResponseText: text };
}
