import { describe, expect, it } from 'vitest';
import type { MasteringParams } from '../types';
import { applyFeedbackAdjustment } from './feedbackService';

const baseParams = (): MasteringParams => ({
  gain_adjustment_db: 0,
  eq_adjustments: [],
  limiter_ceiling_db: -1,
  tube_drive_amount: 2,
  exciter_amount: 0.08,
  low_contour_amount: 0.6,
  width_amount: 1,
  target_lufs: -8,
});

describe('applyFeedbackAdjustment', () => {
  it('reduces low-end overload risk when feedback is distortion', () => {
    const adjusted = applyFeedbackAdjustment(baseParams(), 'distortion');

    expect(adjusted.target_lufs).toBeCloseTo(-8.1, 6);
    expect(adjusted.tube_drive_amount).toBeCloseTo(1.95, 6);
    expect(adjusted.exciter_amount).toBeCloseTo(0.06, 6);
    expect(adjusted.low_contour_amount).toBeCloseTo(0.55, 6);
    expect(adjusted.limiter_ceiling_db).toBe(-1);
    expect(adjusted.eq_adjustments).toEqual([
      { frequency: 35, gain_db: -0.5, q: 0.7, type: 'lowshelf' },
      { frequency: 120, gain_db: -0.7, q: 1.2, type: 'peak' },
    ]);
  });

  it('keeps distortion controls clamped at 0 for already-low values', () => {
    const adjusted = applyFeedbackAdjustment(
      {
        ...baseParams(),
        tube_drive_amount: 0.3,
        exciter_amount: 0.01,
        low_contour_amount: 0.1,
      },
      'distortion',
    );

    expect(adjusted.tube_drive_amount).toBeCloseTo(0.25, 6);
    expect(adjusted.exciter_amount).toBe(0);
    expect(adjusted.low_contour_amount).toBeCloseTo(0.05, 6);
  });

  it('boosts loudness target safely when feedback is not_loud', () => {
    const adjusted = applyFeedbackAdjustment(baseParams(), 'not_loud');

    expect(adjusted.target_lufs).toBeCloseTo(-7.92, 6);
    expect(adjusted.limiter_ceiling_db).toBe(-1);
  });

  it('adds focused low-end boost for weak kick', () => {
    const adjusted = applyFeedbackAdjustment(baseParams(), 'weak_kick');

    expect(adjusted.low_contour_amount).toBeCloseTo(0.64, 6);
    expect(adjusted.eq_adjustments.at(-1)).toEqual({ frequency: 60, gain_db: 0.7, q: 1.0, type: 'peak' });
  });

  it('merges repeated EQ moves per band without overstacking', () => {
    const first = applyFeedbackAdjustment(baseParams(), 'distortion');
    const second = applyFeedbackAdjustment(first, 'distortion');
    const third = applyFeedbackAdjustment(second, 'distortion');

    const lowShelf35 = third.eq_adjustments.find((eq) => eq.frequency === 35 && eq.type === 'lowshelf');
    const peak120 = third.eq_adjustments.find((eq) => eq.frequency === 120 && eq.type === 'peak' && eq.q === 1.2);

    expect(lowShelf35?.gain_db).toBeCloseTo(-1.2, 6);
    expect(peak120?.gain_db).toBeCloseTo(-1.2, 6);
    expect(third.eq_adjustments.filter((eq) => eq.frequency === 35 && eq.type === 'lowshelf')).toHaveLength(1);
  });

  it('relaxes squashed feedback without narrowing stereo image', () => {
    const adjusted = applyFeedbackAdjustment({ ...baseParams(), width_amount: 1.02 }, 'squashed');

    expect(adjusted.width_amount).toBeCloseTo(1.03, 6);
    expect(adjusted.low_contour_amount).toBeCloseTo(0.58, 6);
    expect(adjusted.limiter_ceiling_db).toBe(-1);
  });
});
