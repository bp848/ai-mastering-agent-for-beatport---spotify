import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import { getPlatformSpecifics, generateMasteringPrompt } from './masteringPrompts';
import { clampMasteringParams } from './geminiService';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function getMasteringSuggestionsOpenAI(
  data: AudioAnalysisData,
  target: MasteringTarget,
  _language: 'ja' | 'en'
): Promise<MasteringParams> {
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
    throw new Error("error.gemini.fail");
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("error.gemini.invalid_params");

  const parsed = JSON.parse(text) as MasteringParams;
  return clampMasteringParams(parsed);
}
