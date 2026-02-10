import { describe, it, expect } from 'vitest';
import { clampMasteringParams } from '../services/geminiService';
import type { MasteringParams } from '../types';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  limiter_ceiling_db: -1,
  eq_adjustments: [],
  tube_drive_amount: 0,
  exciter_amount: 0,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

describe('clampMasteringParams', () => {
  it('keeps existing numeric values and always normalizes eq_adjustments as an array', () => {
    const raw = baseParams({ eq_adjustments: undefined as unknown as MasteringParams['eq_adjustments'] });
    const safe = clampMasteringParams(raw);
    expect(Array.isArray(safe.eq_adjustments)).toBe(true);
    expect(safe.gain_adjustment_db).toBe(raw.gain_adjustment_db);
    expect(safe.limiter_ceiling_db).toBe(raw.limiter_ceiling_db);
  });

  it('does not rewrite derived controls', () => {
    const raw = baseParams({
      tube_hpf_hz: 312,
      exciter_hpf_hz: 2410,
      limiter_attack_s: 0.2,
      limiter_release_s: 0.4,
    });
    const safe = clampMasteringParams(raw);
    expect(safe.tube_hpf_hz).toBe(312);
    expect(safe.exciter_hpf_hz).toBe(2410);
    expect(safe.limiter_attack_s).toBe(0.2);
    expect(safe.limiter_release_s).toBe(0.4);
  });
});
