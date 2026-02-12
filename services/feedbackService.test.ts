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

    expect(adjusted.target_lufs).toBe(-9);
    expect(adjusted.tube_drive_amount).toBe(1);
    expect(adjusted.exciter_amount).toBeCloseTo(0.05, 6);
    expect(adjusted.low_contour_amount).toBeCloseTo(0.4, 6);
    expect(adjusted.limiter_ceiling_db).toBe(-1);
    expect(adjusted.eq_adjustments).toEqual([
      { frequency: 35, gain_db: -1.5, q: 0.7, type: 'lowshelf' },
      { frequency: 120, gain_db: -2.0, q: 1.2, type: 'peak' },
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

    expect(adjusted.tube_drive_amount).toBe(0);
    expect(adjusted.exciter_amount).toBe(0);
    expect(adjusted.low_contour_amount).toBe(0);
  });

  it('boosts loudness target safely when feedback is not_loud', () => {
    const adjusted = applyFeedbackAdjustment(baseParams(), 'not_loud');

    expect(adjusted.target_lufs).toBe(-7);
    expect(adjusted.limiter_ceiling_db).toBe(-1);
  });

  it('adds focused low-end boost for weak kick', () => {
    const adjusted = applyFeedbackAdjustment(baseParams(), 'weak_kick');

    expect(adjusted.low_contour_amount).toBeCloseTo(0.9, 6);
    expect(adjusted.eq_adjustments.at(-1)).toEqual({ frequency: 60, gain_db: 2.0, q: 1.0, type: 'peak' });
  });
});
