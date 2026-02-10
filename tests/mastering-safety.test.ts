import { describe, expect, it } from 'vitest';
import { clampMasteringParams } from '../services/geminiService';
import { applyFeedbackAdjustment } from '../services/feedbackService';

describe('mastering safety guardrails', () => {
  it('clamps over-aggressive gain and limiter ceiling', () => {
    const clamped = clampMasteringParams({
      gain_adjustment_db: 15,
      limiter_ceiling_db: 0,
      eq_adjustments: [],
      tube_drive_amount: 1,
      exciter_amount: 0,
      low_contour_amount: 0,
      width_amount: 1,
    });

    expect(clamped.gain_adjustment_db).toBe(6);
    expect(clamped.limiter_ceiling_db).toBe(-0.2);
  });

  it('keeps not_loud feedback from forcing unsafe limiter settings', () => {
    const adjusted = applyFeedbackAdjustment(
      {
        gain_adjustment_db: 2,
        limiter_ceiling_db: -0.3,
        eq_adjustments: [],
        tube_drive_amount: 0,
        exciter_amount: 0,
        low_contour_amount: 0,
        width_amount: 1,
      },
      'not_loud',
    );

    expect(adjusted.gain_adjustment_db).toBe(3);
    expect(adjusted.limiter_ceiling_db).toBe(-0.2);
  });
});
