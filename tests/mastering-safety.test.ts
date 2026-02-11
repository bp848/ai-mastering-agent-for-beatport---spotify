import { describe, it, expect } from 'vitest';
import { clampMasteringParams } from '../services/geminiService';
import type { MasteringParams } from '../types';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  limiter_ceiling_db: -1.0,
  eq_adjustments: [],
  tube_drive_amount: 0,
  exciter_amount: 0,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

describe('clampMasteringParams', () => {
  it('caps gain_adjustment_db at +3 dB and limiter_ceiling_db at -0.3 dB to prevent clipping', () => {
    const raw = baseParams({
      gain_adjustment_db: 12,
      limiter_ceiling_db: 0,
    });
    const safe = clampMasteringParams(raw);
    expect(safe.gain_adjustment_db).toBe(3);
    expect(safe.limiter_ceiling_db).toBe(-0.3);
  });

  it('clamps gain to -5 dB floor and keeps other safety bounds', () => {
    const raw = baseParams({
      gain_adjustment_db: -20,
      limiter_ceiling_db: -2,
      tube_drive_amount: 5,
      exciter_amount: 0.2,
      width_amount: 2,
    });
    const safe = clampMasteringParams(raw);
    expect(safe.gain_adjustment_db).toBe(-5);
    expect(safe.limiter_ceiling_db).toBe(-2);
    expect(safe.tube_drive_amount).toBe(2);
    expect(safe.exciter_amount).toBe(0.12);
    expect(safe.width_amount).toBe(1.4);
  });
});
