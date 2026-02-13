import type { AudioAnalysisData, MasteringTarget, MasteringParams, AIDecision, EQAdjustment } from '../types';
import { getPlatformSpecifics } from './masteringPrompts';

function evaluateLowEndDistortionRisk(analysis: AudioAnalysisData, gainDb: number): number {
  const subBass = analysis.frequencyData.find(f => f.name === '20-60')?.level ?? -60;
  const bass = analysis.frequencyData.find(f => f.name === '60-250')?.level ?? -60;
  const crest = analysis.crestFactor ?? 0;
  const phase = analysis.phaseCorrelation ?? 1;
  const dist = analysis.distortionPercent ?? 0;
  const peak = analysis.truePeak ?? -144;

  const diagnosticRisk = Math.max(0, Math.min(6, Math.round(analysis.distortionRiskScore ?? 0)));
  const lowEndCrestDb = analysis.lowEndCrestDb ?? crest;
  const subEnergyRatio = analysis.subEnergyRatio ?? 0;
  const lowEndToLowMidRatio = analysis.lowEndToLowMidRatio ?? 1;
  const bassMonoCompatibility = analysis.bassMonoCompatibility ?? ((phase + 1) * 50);

  const heuristicRisk =
    (peak > -1.2 ? 1 : 0) +
    (crest < 9.5 ? 1 : 0) +
    (dist > 0.8 ? 1 : 0) +
    (phase < 0.2 ? 1 : 0) +
    (subBass > -15 && bass > -12.5 ? 1 : 0) +
    (gainDb > 1.2 ? 1 : 0);

  const detailedRisk =
    (lowEndCrestDb < 8.8 ? 1 : 0) +
    (subEnergyRatio > 0.35 ? 1 : 0) +
    (lowEndToLowMidRatio > 1.7 ? 1 : 0) +
    (bassMonoCompatibility < 58 ? 1 : 0);

  return Math.max(heuristicRisk, diagnosticRisk, detailedRisk);
}

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
  const phase = Math.max(-1, Math.min(1, analysis.phaseCorrelation));
  const dist = Math.max(0, analysis.distortionPercent);

  const subBass = analysis.frequencyData.find(f => f.name === '20-60')?.level ?? -60;
  const high8k = analysis.frequencyData.find(f => f.name === '8k-20k')?.level ?? -60;
  const high4k = analysis.frequencyData.find(f => f.name === '4k-8k')?.level ?? -60;
  const presence = analysis.frequencyData.find(f => f.name === '1k-4k')?.level ?? -60;
  const lowMid = analysis.frequencyData.find(f => f.name === '250-1k')?.level ?? -60;

  const gainDb = specifics.targetLufs - analysis.lufs;
  const gainBounded = Math.max(-5, Math.min(3, gainDb));
  const lowEndDistortionRisk = evaluateLowEndDistortionRisk(analysis, gainBounded);

  const limiterCeiling = specifics.targetPeak;

  const baseTubeDrive =
    decision.saturationNeed === 'none' ? 0 :
    decision.saturationNeed === 'light' ? Math.min(1.2, (dr / 10) * (crest / 12)) :
    Math.min(2, (dr / 8) * 0.5);

  const lowEndCollisionRisk =
    (dist > 0.9 ? 1 : 0) +
    (crest < 8.5 ? 1 : 0) +
    (phase < 0.2 ? 1 : 0) +
    (subBass > -14 && bass > -12 ? 1 : 0) +
    (peak > -0.9 ? 1 : 0);

  const canAddBassHarmonics = lowEndCollisionRisk <= 1 && bass > -16 && dist < 0.6 && phase > 0.35;
  const harmonicLift = canAddBassHarmonics ? Math.min(0.6, (-Math.min(-10, bass) - 10) * 0.05 + 0.2) : 0;
  const tubeDriveRaw = Math.max(0, Math.min(2, baseTubeDrive + harmonicLift));
  const tubeDrive = lowEndDistortionRisk >= 4 ? Math.min(tubeDriveRaw, 0.85) : tubeDriveRaw;

  const exciterRaw =
    decision.highFreqTreatment === 'leave' ? 0 :
    decision.highFreqTreatment === 'polish' ? (high8k > -40 ? 0.02 : (-high8k - 40) / 2000) :
    Math.min(0.15, (-high4k - 30) / 500);
  const exciterAmount = Math.max(0, Math.min(0.12, exciterRaw));

  const lowContourBase = Math.max(0, Math.min(0.8, (bass + 50) / 50 * 0.4 + (decision.kickSafety === 'danger' ? 0.15 : 0)));
  const lowContourRaw = lowEndCollisionRisk >= 3
    ? Math.max(0, lowContourBase - 0.2)
    : Math.min(0.8, lowContourBase + (canAddBassHarmonics ? 0.06 : 0));
  const lowContour = lowEndDistortionRisk >= 4 ? Math.min(lowContourRaw, 0.15) : lowContourRaw;

  const widthAmountRaw =
    decision.stereoIntent === 'narrow' ? 1 :
    decision.stereoIntent === 'wide' ? Math.min(1.4, 1 + (width / 100) * 0.25) :
    Math.min(1.25, 1 + (width / 100) * 0.15);
  const widthAmount = (lowEndCollisionRisk >= 3 || lowEndDistortionRisk >= 4) ? Math.min(widthAmountRaw, 1.05) : widthAmountRaw;

  const lowMonoHz = Math.round(Math.max(120, Math.min(280,
    140 + lowEndCollisionRisk * 25 + (subBass > -16 ? 12 : 0) + (phase < 0.15 ? 20 : 0),
  )));

  const tubeHpfHz = Math.max(20, Math.min(120, 30 + (bass + 60) * 0.5 + crest * 2));
  const exciterHpfHz = Math.max(4000, Math.min(10000, 6000 + (high8k + 50) * 50));

  const transientAttack =
    decision.transientHandling === 'preserve' ? 0.01 :
    decision.transientHandling === 'smooth' ? 0.02 + (1 / (Math.abs(gainBounded) + 1)) * 0.02 :
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
  if (high4k > -32 && decision.highFreqTreatment !== 'lift') {
    eqAdjustments.push({
      type: 'peak',
      frequency: 5000,
      gain_db: Math.max(-2, (high4k + 32) / 40 * -1),
      q: 1.2,
    });
  }
  if (canAddBassHarmonics && lowMid < -24) {
    eqAdjustments.push({
      type: 'peak',
      frequency: 700,
      gain_db: Math.min(1.8, 0.6 + (-24 - lowMid) * 0.04),
      q: 0.9,
    });
  }

  const bassBand = analysis.frequencyData.find(f => f.name === '60-250')?.level ?? -60;
  const lowVsLowMid = bassBand - lowMid;
  if (lowVsLowMid > 10) {
    eqAdjustments.push({
      type: 'lowshelf',
      frequency: 90,
      gain_db: Math.max(-2.5, -0.12 * (lowVsLowMid - 10) - 0.6),
      q: 0.7,
    });
  } else if (lowVsLowMid < -8) {
    eqAdjustments.push({
      type: 'lowshelf',
      frequency: 110,
      gain_db: Math.min(2.2, 0.1 * (-8 - lowVsLowMid) + 0.5),
      q: 0.8,
    });
  }

  const highVsPresence = high8k - presence;
  if (highVsPresence < -10 && decision.highFreqTreatment !== 'leave') {
    eqAdjustments.push({
      type: 'highshelf',
      frequency: 9000,
      gain_db: Math.min(2.4, 0.12 * (-10 - highVsPresence) + 0.5),
      q: 0.7,
    });
  } else if (highVsPresence > 9) {
    eqAdjustments.push({
      type: 'highshelf',
      frequency: 8500,
      gain_db: Math.max(-2.2, -0.1 * (highVsPresence - 9) - 0.4),
      q: 0.7,
    });
  }

  return {
    gain_adjustment_db: Math.round(Math.max(-5, Math.min(3, lowEndDistortionRisk >= 4 ? gainBounded - 0.5 : gainBounded)) * 100) / 100,
    eq_adjustments: eqAdjustments,
    limiter_ceiling_db: limiterCeiling,
    tube_drive_amount: Math.round(tubeDrive * 100) / 100,
    exciter_amount: Math.round(exciterAmount * 100) / 100,
    low_contour_amount: Math.round(lowContour * 100) / 100,
    width_amount: Math.round(widthAmount * 100) / 100,
    target_lufs: specifics.targetLufs,
    tube_hpf_hz: Math.round(tubeHpfHz),
    exciter_hpf_hz: Math.round(exciterHpfHz),
    low_mono_hz: lowMonoHz,
    transient_attack_s: Math.round(transientAttack * 1000) / 1000,
    transient_release_s: Math.round(transientRelease * 1000) / 1000,
    limiter_attack_s: Math.round(limiterAttack * 1000) / 1000,
    limiter_release_s: Math.round(limiterRelease * 1000) / 1000,
  };
}
