import { describe, it, expect } from 'vitest';
import { computePeakSafeGain, predictPostGainPeakDb } from '../services/audioService';

describe('predictPostGainPeakDb', () => {
  it('adds gain delta (candidate - current) to measured peak', () => {
    expect(predictPostGainPeakDb(-2, 0, 3)).toBe(1);
    expect(predictPostGainPeakDb(-0.5, 0, 0.5)).toBe(0);
  });

  it('predicts lower peak when candidate gain is less than current', () => {
    expect(predictPostGainPeakDb(-1, 0, -0.5)).toBe(-1.5);
  });
});

describe('computePeakSafeGain', () => {
  it('returns current gain when measured peak is below target', () => {
    const gain = computePeakSafeGain(-2, -0.3, 3);
    expect(gain).toBe(3);
  });

  it('reduces gain when measured peak exceeds target', () => {
    // measured -0.1 dB, target -0.3 dB → overflow 0.2 + 0.1 headroom = 0.3 dB cut
    const gain = computePeakSafeGain(-0.1, -0.3, 2);
    expect(gain).toBeLessThan(2);
    expect(gain).toBeCloseTo(2 - 0.3, 2);
  });

  it('respects maxCutDb cap', () => {
    const gain = computePeakSafeGain(2, -0.3, 5, { maxCutDb: 2 });
    expect(gain).toBe(5 - 2);
  });

  it('does not cut when within margin', () => {
    const gain = computePeakSafeGain(-0.35, -0.3, 1, { marginDb: 0.05 });
    expect(gain).toBe(1);
  });

  it('pulls back gain when predicted peak would exceed target (dangerous boost)', () => {
    // 実測 -1 dB、current 0 / candidate 2 だと予測ピークは 1 dB → 目標 -0.3 を超えるのでゲインを削る
    const predictedPeak = predictPostGainPeakDb(-1, 0, 2);
    expect(predictedPeak).toBe(1);
    const gain = computePeakSafeGain(predictedPeak, -0.3, 2, { headroomDb: 0.1 });
    expect(gain).toBeLessThan(2);
    expect(gain).toBeLessThanOrEqual(-0.3 - 0.1 + 2); //  overflow 1 - (-0.3) + 0.1 = 1.4 dB cut → gain = 2 - 1.4 = 0.6
    expect(gain).toBeCloseTo(0.6, 1);
  });
});
