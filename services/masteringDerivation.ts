import type { AudioAnalysisData, MasteringTarget, MasteringParams, AIDecision, EQAdjustment } from '../types';
import { getPlatformSpecifics } from './masteringPrompts';

/**
 * AIDecision + AudioAnalysisData から DSP 用 MasteringParams を導出する。
 * 固定数値は極力使わず、分析値と意図カテゴリから算出する。
 */
export function deriveMasteringParamsFromDecision(
  decision: AIDecision,
  analysis: AudioAnalysisData,
  target: MasteringTarget,
): MasteringParams {
  const specifics = getPlatformSpecifics(target);
  const dr = Math.max(0.1, analysis.dynamicRange ?? analysis.crestFactor ?? 6);
  const crest = Math.max(0.1, analysis.crestFactor);
  const bass = analysis.bassVolume;
  const peak = analysis.truePeak;
  const width = Math.max(0.1, Math.min(100, analysis.stereoWidth));
  const phase = Math.max(0, analysis.phaseCorrelation);
  const dist = analysis.distortionPercent;

  const high8k = analysis.frequencyData.find(f => f.name === '8k-20k')?.level ?? -60;
  const high4k = analysis.frequencyData.find(f => f.name === '4k-8k')?.level ?? -60;
  const lowMid = analysis.frequencyData.find(f => f.name === '250-1k')?.level ?? -60;

  const gainDb = specifics.targetLufs - analysis.lufs;
  const gainBounded = Math.max(-12, Math.min(6, gainDb));

  const limiterCeiling = specifics.targetPeak;

  const tubeDrive =
    decision.saturationNeed === 'none' ? 0 :
    decision.saturationNeed === 'light' ? Math.min(2, (dr / 10) * (crest / 12)) :
    Math.min(3, (dr / 8) * 0.7);

  const exciterRaw =
    decision.highFreqTreatment === 'leave' ? 0 :
    decision.highFreqTreatment === 'polish' ? (high8k > -40 ? 0.02 : (-high8k - 40) / 2000) :
    Math.min(0.15, (-high4k - 30) / 500);
  const exciterAmount = Math.max(0, Math.min(0.2, exciterRaw));

  const lowContour = Math.max(0, Math.min(1, (bass + 50) / 50 * 0.5 + (decision.kickSafety === 'danger' ? 0.2 : 0)));

  const widthAmount =
    decision.stereoIntent === 'monoSafe' ? 1 :
    decision.stereoIntent === 'wide' ? Math.min(1.4, 1 + (width / 100) * 0.25) :
    Math.min(1.25, 1 + (width / 100) * 0.15);

  const tubeHpfHz = Math.max(20, Math.min(120, 30 + (bass + 60) * 0.5 + crest * 2));
  const exciterHpfHz = Math.max(4000, Math.min(10000, 6000 + (high8k + 50) * 50));

  const transientAttack =
    decision.transientHandling === 'preserve' ? 0.01 :
    decision.transientHandling === 'soften' ? 0.02 + (1 / (Math.abs(gainBounded) + 1)) * 0.02 :
    0.03 + (1 / (Math.abs(gainBounded) + 1)) * 0.03;
  const transientRelease = Math.max(0.1, Math.min(0.5, (lowContour + exciterAmount + 1) / (Math.abs(gainBounded) + 1) * 0.15));

  const limiterAttack = Math.max(0.0005, Math.min(0.003, (widthAmount / (Math.abs(tubeDrive) + Math.abs(gainBounded) + 1)) * 0.002));
  const limiterRelease = Math.max(0.05, Math.min(0.2, (lowContour + exciterAmount + widthAmount) / (Math.abs(gainBounded) + 1) * 0.08));

  const eqAdjustments: EQAdjustment[] = [];
  if (lowMid > -35 && lowMid > (bass + 5)) {
    eqAdjustments.push({
      type: 'peak',
      frequency: 400,
      gain_db: Math.max(-3, -0.5 * (lowMid + 35) / 20),
      q: 1,
    });
  }
  if (high4k > -32 && decision.highFreqTreatment === 'restrain') {
    eqAdjustments.push({
      type: 'peak',
      frequency: 5000,
      gain_db: Math.max(-2, (high4k + 32) / 40 * -1),
      q: 1.2,
    });
  }

  return {
    gain_adjustment_db: Math.round(gainBounded * 20) / 20,
    eq_adjustments: eqAdjustments,
    limiter_ceiling_db: limiterCeiling,
    tube_drive_amount: Math.round(tubeDrive * 100) / 100,
    exciter_amount: Math.round(exciterAmount * 100) / 100,
    low_contour_amount: Math.round(lowContour * 100) / 100,
    width_amount: Math.round(widthAmount * 100) / 100,
    target_lufs: specifics.targetLufs,
    tube_hpf_hz: Math.round(tubeHpfHz),
    exciter_hpf_hz: Math.round(exciterHpfHz),
    transient_attack_s: Math.round(transientAttack * 1000) / 1000,
    transient_release_s: Math.round(transientRelease * 1000) / 1000,
    limiter_attack_s: Math.round(limiterAttack * 1000) / 1000,
    limiter_release_s: Math.round(limiterRelease * 1000) / 1000,
  };
}
