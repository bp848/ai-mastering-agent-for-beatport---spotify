import { describe, it, expect } from 'vitest';
import { computePeakSafeGain } from '../services/audioService';

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
