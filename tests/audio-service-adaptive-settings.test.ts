import { describe, expect, it } from 'vitest';
import { resolveAdaptiveMasteringSettings } from '../services/audioService';

describe('resolveAdaptiveMasteringSettings', () => {
  it('uses AI-derived adaptive values when provided', () => {
    const settings = resolveAdaptiveMasteringSettings({
      gain_adjustment_db: 0,
      limiter_ceiling_db: -1,
      eq_adjustments: [],
      tube_drive_amount: 0.9,
      exciter_amount: 0.06,
      low_contour_amount: 0.3,
      width_amount: 1.1,
      tube_hpf_hz: 72,
      exciter_hpf_hz: 8450,
      transient_attack_s: 0.013,
      transient_release_s: 0.31,
      limiter_attack_s: 0.001,
      limiter_release_s: 0.11,
    });

    expect(settings.tubeHpfHz).toBe(72);
    expect(settings.exciterHpfHz).toBe(8450);
    expect(settings.transientAttackS).toBe(0.013);
    expect(settings.transientReleaseS).toBe(0.31);
    expect(settings.limiterAttackS).toBe(0.001);
    expect(settings.limiterReleaseS).toBe(0.11);
  });

  it('falls back safely when values are missing or out of range', () => {
    const settings = resolveAdaptiveMasteringSettings({
      gain_adjustment_db: 0,
      limiter_ceiling_db: -1,
      eq_adjustments: [],
      tube_drive_amount: 0,
      exciter_amount: 0,
      low_contour_amount: 0,
      width_amount: 1,
      tube_hpf_hz: 999,
      exciter_hpf_hz: 100,
      transient_attack_s: 1,
      transient_release_s: 0,
      limiter_attack_s: 1,
      limiter_release_s: 0,
    });

    expect(settings.tubeHpfHz).toBe(140);
    expect(settings.exciterHpfHz).toBe(4000);
    expect(settings.transientAttackS).toBe(0.05);
    expect(settings.transientReleaseS).toBe(0.08);
    expect(settings.limiterAttackS).toBe(0.005);
    expect(settings.limiterReleaseS).toBe(0.05);
  });
});
