import { describe, it, expect } from 'vitest';
import { computePeakSafeGain, predictPostGainPeakDb } from '../services/audioService';

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
});

describe('predictPostGainPeakDb', () => {
  it('adds gain delta to measured peak for proactive clipping protection', () => {
    const predicted = predictPostGainPeakDb(-0.5, 0, 1.5);
    expect(predicted).toBeCloseTo(1.0, 6);
  });

  it('works with negative gain changes', () => {
    const predicted = predictPostGainPeakDb(-0.2, 2, 0.5);
    expect(predicted).toBeCloseTo(-1.7, 6);
  });

  it('can be used with computePeakSafeGain to pull back risky gain boosts', () => {
    const currentGain = 0;
    const boostedGain = 2;
    const predictedPeak = predictPostGainPeakDb(-0.4, currentGain, boostedGain);
    const safeGain = computePeakSafeGain(predictedPeak, -0.3, boostedGain);

    expect(predictedPeak).toBeGreaterThan(-0.3);
    expect(safeGain).toBeLessThan(boostedGain);
  });
});
