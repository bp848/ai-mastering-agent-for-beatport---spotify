import { describe, expect, it } from 'vitest';
import type { AudioAnalysisData, MasteringParams } from '../types';
import { __internal } from '../services/aiService';

const baseParams: MasteringParams = {
  gain_adjustment_db: 8,
  limiter_ceiling_db: -0.3,
  eq_adjustments: [],
  tube_drive_amount: 2.8,
  exciter_amount: 0.15,
  low_contour_amount: 1,
  width_amount: 1.2,
};

const makeData = (overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData => ({
  lufs: -10,
  truePeak: -0.1,
  dynamicRange: 6,
  crestFactor: 8,
  stereoWidth: 0.8,
  peakRMS: 10,
  bassVolume: 0.5,
  phaseCorrelation: 0.5,
  distortionPercent: 1,
  noiseFloorDb: -55,
  frequencyData: [],
  waveform: [],
  ...overrides,
});

describe('applyAnalysisSafetyGuard', () => {
  it('applies dynamic reduction for severe clipping-risk material', () => {
    const guarded = __internal.applyAnalysisSafetyGuard(
      baseParams,
      makeData({ truePeak: 0.2, crestFactor: 6.5, distortionPercent: 1.8 }),
    );

    expect(guarded.gain_adjustment_db).toBeLessThanOrEqual(4);
    expect(guarded.limiter_ceiling_db).toBeLessThanOrEqual(-0.5);
    expect(guarded.tube_drive_amount).toBeLessThanOrEqual(1.0);
    expect(guarded.exciter_amount).toBeLessThanOrEqual(0.05);
  });

  it('preserves punch for healthy source material', () => {
    const guarded = __internal.applyAnalysisSafetyGuard(
      baseParams,
      makeData({ truePeak: -1.2, crestFactor: 12, distortionPercent: 0.2 }),
    );

    expect(guarded.gain_adjustment_db).toBe(8);
    expect(guarded.limiter_ceiling_db).toBe(-0.3);
    expect(guarded.tube_drive_amount).toBe(2.8);
    expect(guarded.exciter_amount).toBe(0.15);
  });
});
