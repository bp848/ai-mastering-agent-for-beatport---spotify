import type { AIDecision, AudioAnalysisData, MasteringParams } from '../types';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const bandLevel = (analysis: AudioAnalysisData, name: string): number =>
  analysis.frequencyData.find((f) => f.name === name)?.level ?? analysis.bassVolume;

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const spread = (values: number[]): number => {
  if (values.length === 0) return 1;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) || 1;
};

const normalizeByPopulation = (value: number, population: number[]): number => {
  const mean = average(population);
  const std = spread(population);
  return (value - mean) / std;
};

const weightFor = <T extends string>(value: T, order: readonly T[]): number => {
  const index = Math.max(0, order.indexOf(value));
  return index / Math.max(1, order.length - 1);
};

const normalize01 = (value: number, min: number, max: number): number => {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
};

export function deriveTransparentMasteringParams(analysis: AudioAnalysisData): MasteringParams {
  return {
    gain_adjustment_db: 0,
    limiter_ceiling_db: Math.min(-0.8, analysis.truePeak - 0.3),
    eq_adjustments: [],
    tube_drive_amount: 0,
    exciter_amount: 0,
    low_contour_amount: 0,
    width_amount: 1,
    tube_hpf_hz: 30,
    exciter_hpf_hz: 6000,
    transient_attack_s: 0.02,
    transient_release_s: 0.25,
    limiter_attack_s: 0.001,
    limiter_release_s: 0.12,
    target_lufs: analysis.lufs,
  };
}

export function deriveMasteringParamsFromDecision(
  decision: AIDecision,
  analysis: AudioAnalysisData,
): MasteringParams {
  if (decision.confidence < 0.45) {
    return deriveTransparentMasteringParams(analysis);
  }

  const harmonicBands = [
    bandLevel(analysis, '250-1k'),
    bandLevel(analysis, '1k-4k'),
    bandLevel(analysis, '4k-8k'),
    bandLevel(analysis, '8k-20k'),
  ];
  const harmonicCenter = average(harmonicBands);
  const bassNorm = normalizeByPopulation(analysis.bassVolume + bandLevel(analysis, '20-60'), [analysis.bassVolume, ...harmonicBands]);

  const kickWeight = weightFor(decision.kickSafety, ['safe', 'borderline', 'danger']);
  const satWeight = weightFor(decision.saturationNeed, ['none', 'light', 'moderate']);
  const transientWeight = weightFor(decision.transientHandling, ['preserve', 'soften', 'control']);
  const harshWeight = weightFor(decision.highFreqTreatment, ['leave', 'polish', 'restrain']);
  const stereoWeight = weightFor(decision.stereoIntent, ['monoSafe', 'balanced', 'wide']);

  const targetLufs = -14 + (decision.confidence - 0.5);
  const gainAdjustment = clamp(targetLufs - analysis.lufs, -2, 2);
  const limiterCeiling = clamp(analysis.truePeak - (0.2 + transientWeight * 0.6), -3, -0.8);

  const lowContour = clamp((satWeight + bassNorm) / 2, 0, 1);
  const width = clamp(1 + stereoWeight * (analysis.stereoWidth / (Math.abs(analysis.stereoWidth) + Math.abs(analysis.phaseCorrelation * 100) + 1)), 0.5, 2);

  const eq_adjustments = [
    {
      type: 'peak' as const,
      frequency: 120 + normalize01(Math.abs(analysis.bassVolume), 0, 30) * 200,
      gain_db: clamp((harmonicCenter - bandLevel(analysis, '250-1k')) * 0.4, -1.5, 1.5),
      q: clamp(0.7 + normalize01(analysis.dynamicRange, 4, 16) * 0.6, 0.6, 1.3),
    },
    {
      type: 'peak' as const,
      frequency: 2500 + normalize01(Math.abs(bandLevel(analysis, '4k-8k')), 0, 40) * 4000,
      gain_db: clamp((harmonicCenter - bandLevel(analysis, '4k-8k')) * 0.35, -1.5, 1.5),
      q: clamp(0.8 + normalize01(analysis.crestFactor, 4, 18) * 0.5, 0.7, 1.3),
    },
  ];

  const tubeDrive = clamp(0.1 + satWeight * 0.8 + normalize01(analysis.dynamicRange, 4, 16) * 0.4, 0, 1.2);
  const exciterAmount = clamp((1 - harshWeight) * 0.1 + normalize01(analysis.stereoWidth, 0, 100) * 0.05, 0, 0.15);

  const transientAttack = clamp(0.006 + transientWeight * 0.02, 0.006, 0.03);
  const transientRelease = clamp(0.12 + normalize01(analysis.dynamicRange, 4, 16) * 0.2, 0.12, 0.32);

  return {
    gain_adjustment_db: gainAdjustment,
    limiter_ceiling_db: limiterCeiling,
    eq_adjustments,
    tube_drive_amount: tubeDrive,
    exciter_amount: exciterAmount,
    low_contour_amount: lowContour,
    width_amount: width,
    tube_hpf_hz: clamp(30 + normalize01(analysis.bassVolume, -36, -6) * 70, 20, 120),
    exciter_hpf_hz: clamp(5500 + normalize01(bandLevel(analysis, '8k-20k'), -36, -6) * 3500, 4000, 12000),
    transient_attack_s: transientAttack,
    transient_release_s: transientRelease,
    limiter_attack_s: clamp(transientAttack * 0.4, 0.001, 0.01),
    limiter_release_s: clamp(transientRelease * (1 + satWeight * 0.2), 0.08, 0.24),
    target_lufs: targetLufs,
  };
}
