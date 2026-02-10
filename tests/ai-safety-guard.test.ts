import { describe, it, expect } from 'vitest';
import { applySafetyGuard } from '../services/geminiService';
import type { MasteringParams, AudioAnalysisData } from '../types';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  limiter_ceiling_db: -0.5,
  eq_adjustments: [],
  tube_drive_amount: 1.0,
  exciter_amount: 0.1,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

const baseAnalysis = (overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData =>
  ({
    lufs: -14,
    truePeak: -3,
    crestFactor: 12,
    distortionPercent: 0.5,
    stereoWidth: 60,
    peakRMS: -18,
    bassVolume: -12,
    phaseCorrelation: 0.9,
    noiseFloorDb: -80,
    frequencyData: [],
    waveform: [],
    dynamicRange: 12,
    ...overrides,
  }) as AudioAnalysisData;

describe('applySafetyGuard', () => {
  it('returns params unchanged when material is not dangerous', () => {
    const params = baseParams({ tube_drive_amount: 1, exciter_amount: 0.1 });
    const analysis = baseAnalysis({ truePeak: -3, crestFactor: 12, distortionPercent: 0.5 });
    const out = applySafetyGuard(params, analysis);
    expect(out.tube_drive_amount).toBe(1);
    expect(out.exciter_amount).toBe(0.1);
    expect(out.limiter_ceiling_db).toBe(-0.5);
  });

  it('reduces tube and exciter when peak is hot', () => {
    const params = baseParams({ tube_drive_amount: 2, exciter_amount: 0.12, limiter_ceiling_db: -0.2 });
    const analysis = baseAnalysis({ truePeak: 0 }); // > -1
    const out = applySafetyGuard(params, analysis);
    expect(out.tube_drive_amount).toBeLessThan(2);
    expect(out.exciter_amount).toBeLessThan(0.12);
    expect(out.limiter_ceiling_db).toBe(-0.3); // 危険時は上限 -0.3 にクランプ
  });

  it('reduces when crest factor is low', () => {
    const params = baseParams({ tube_drive_amount: 1.5 });
    const analysis = baseAnalysis({ crestFactor: 6 });
    const out = applySafetyGuard(params, analysis);
    expect(out.tube_drive_amount).toBeLessThan(1.5);
  });

  it('reduces when distortion is high', () => {
    const params = baseParams({ exciter_amount: 0.1 });
    const analysis = baseAnalysis({ distortionPercent: 5 });
    const out = applySafetyGuard(params, analysis);
    expect(out.exciter_amount).toBeLessThan(0.1);
  });
});
