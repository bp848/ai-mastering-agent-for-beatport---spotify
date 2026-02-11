import { GoogleGenAI } from "@google/genai";
import type { AudioAnalysisData, MasteringTarget, MasteringParams, EQAdjustment } from '../types';
import { getPlatformSpecifics } from './masteringPrompts';
import { resolveMasteringDecision } from './aiDebateService';
import { deriveMasteringParamsFromDecision } from './masteringDerivation';

/** AI 出力を安全範囲にクランプし、精度・割れの原因を除去する（Gemini/OpenAI 共通） */
export function clampMasteringParams(raw: MasteringParams): MasteringParams {
  const safe: MasteringParams = {
    // 音割れの主因は「過大ゲイン」なので上限を強制的に低くする
    gain_adjustment_db: Math.max(-12, Math.min(6, Number(raw.gain_adjustment_db) || 0)),
    // フォールバックで 0dB 近辺に寄せない。共有クランプ側も上限 -0.3 dB に統一
    limiter_ceiling_db: Math.max(-6, Math.min(-0.3, Number(raw.limiter_ceiling_db) ?? -1.0)),
    eq_adjustments: Array.isArray(raw.eq_adjustments) ? raw.eq_adjustments.map(sanitizeEq) : [],
    tube_drive_amount: Math.max(0, Math.min(3, Number(raw.tube_drive_amount) ?? 0)),
    exciter_amount: Math.max(0, Math.min(0.15, Number(raw.exciter_amount) ?? 0)),
    low_contour_amount: Math.max(0, Math.min(1, Number(raw.low_contour_amount) ?? 0)),
    width_amount: Math.max(1.0, Math.min(1.4, Number(raw.width_amount) ?? 1)),
  };
  if (raw.target_lufs != null) safe.target_lufs = Number(raw.target_lufs);
  if (raw.tube_hpf_hz != null) safe.tube_hpf_hz = Number(raw.tube_hpf_hz);
  if (raw.exciter_hpf_hz != null) safe.exciter_hpf_hz = Number(raw.exciter_hpf_hz);
  if (raw.transient_attack_s != null) safe.transient_attack_s = Number(raw.transient_attack_s);
  if (raw.transient_release_s != null) safe.transient_release_s = Number(raw.transient_release_s);
  if (raw.limiter_attack_s != null) safe.limiter_attack_s = Number(raw.limiter_attack_s);
  if (raw.limiter_release_s != null) safe.limiter_release_s = Number(raw.limiter_release_s);
  return safe;
}

/** 危険素材（ピーク過多・低クレスト・高歪み）のときのみリミッター・tube・exciter を強く抑える */
export function applySafetyGuard(
  params: MasteringParams,
  analysis: AudioAnalysisData,
): MasteringParams {
  const peakHot = analysis.truePeak > -1; // dBTP が -1 より上はピーク過多
  const lowCrest = analysis.crestFactor < 9 && analysis.crestFactor > 0;
  const highDistortion = analysis.distortionPercent > 2;
  if (!peakHot && !lowCrest && !highDistortion) return params;

  const out = { ...params };
  if (peakHot || lowCrest || highDistortion) {
    out.limiter_ceiling_db = Math.min(out.limiter_ceiling_db, -0.3);
    out.tube_drive_amount = Math.max(0, (out.tube_drive_amount ?? 0) * 0.6);
    out.exciter_amount = Math.max(0, (out.exciter_amount ?? 0) * 0.5);
  }
  return out;
}

const VALID_EQ_TYPES: EQAdjustment['type'][] = ['peak', 'lowshelf', 'highshelf', 'lowpass', 'highpass'];

function sanitizeEq(eq: Partial<EQAdjustment>): EQAdjustment {
  const type = VALID_EQ_TYPES.includes(eq.type as EQAdjustment['type']) ? eq.type : 'peak';
  return {
    type: type as EQAdjustment['type'],
    frequency: Math.max(20, Math.min(18000, Number(eq.frequency) || 1000)),
    gain_db: Math.max(-6, Math.min(6, Number(eq.gain_db) ?? 0)),
    q: Math.max(0.3, Math.min(8, Number(eq.q) ?? 1)),
  };
}

export interface MasteringSuggestionsResult {
  params: MasteringParams;
  rawResponseText: string;
}

/**
 * 議論レイヤー（Gemini→GPT→合意）で AIDecision を確定し、
 * 分析値＋意図から DSP パラメータを導出 → クランプ → 安全ガード の順で適用する。
 */
export const getMasteringSuggestionsGemini = async (data: AudioAnalysisData, target: MasteringTarget, language: 'ja' | 'en'): Promise<MasteringSuggestionsResult> => {
  try {
    const { decision, rawResponseText } = await resolveMasteringDecision(data, target, language);
    const derived = deriveMasteringParamsFromDecision(decision, data, target);
    const clamped = clampMasteringParams(derived);
    const params = applySafetyGuard(clamped, data);
    return { params, rawResponseText };
  } catch (error) {
    console.error("Gemini mastering failed:", error);
    throw new Error("error.gemini.fail");
  }
};

/** @deprecated Use getMasteringSuggestions from aiService for provider switch. */
export const getMasteringSuggestions = getMasteringSuggestionsGemini;

/** 楽曲情報からSNS投稿文を提案（Twitter/X, Instagram用など） */
export interface SnsSuggestionInput {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  releaseDate?: string;
}

export async function getSnsSuggestions(
  track: SnsSuggestionInput,
  language: 'ja' | 'en'
): Promise<string[]> {
  const langNote = language === 'ja'
    ? 'Respond in Japanese. Include 2-3 short variations for Twitter/X (under 140 chars) and 1 for Instagram caption (can be longer).'
    : 'Respond in English. Include 2-3 short variations for Twitter/X (under 280 chars) and 1 for Instagram caption.';

  const prompt = `You are a music marketing copywriter. Given this release info, suggest SNS post text for the artist to promote the track.

Track: ${track.title}
Artist: ${track.artist}
${track.album ? `Album: ${track.album}` : ''}
${track.genre ? `Genre: ${track.genre}` : ''}
${track.releaseDate ? `Release: ${track.releaseDate}` : ''}

${langNote}
Return ONLY a JSON array of strings, each string one post variation. Example: ["First post...", "Second post...", "Instagram caption..."]`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("error.gemini.invalid_params");
    const parsed = JSON.parse(text) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.filter((s): s is string => typeof s === 'string').slice(0, 5);
  } catch (error) {
    console.error("SNS suggestion failed:", error);
    throw new Error("error.gemini.fail");
  }
}
