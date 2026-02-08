import type { MasteringParams } from '../types';

export type FeedbackType =
  | 'distortion'
  | 'muddy'
  | 'harsh'
  | 'weak_kick'
  | 'boomy'
  | 'thin'
  | 'narrow'
  | 'vocals_buried'
  | 'squashed'
  | 'not_loud';

export const FEEDBACK_OPTIONS: { id: FeedbackType; label: string; icon: string }[] = [
  { id: 'distortion', label: '音が割れている / 歪んでいる', icon: '⚡️' },
  { id: 'muddy', label: 'こもって聞こえる / 抜けが悪い', icon: '☁️' },
  { id: 'harsh', label: '高音が痛い / キンキンする', icon: '🔪' },
  { id: 'vocals_buried', label: 'ボーカルが埋もれている', icon: '🎤' },
  { id: 'weak_kick', label: 'キック / 低音が弱い', icon: '🥁' },
  { id: 'boomy', label: '低音が強すぎる / 膨らんでいる', icon: '🔊' },
  { id: 'thin', label: '音が細い / 迫力がない', icon: '🍂' },
  { id: 'narrow', label: '広がりがない / 平面的', icon: '↔️' },
  { id: 'squashed', label: '抑揚がない / 潰れすぎ', icon: '🥞' },
  { id: 'not_loud', label: '音圧がまだ足りない', icon: '🚀' },
];

/**
 * ユーザーのフィードバックに基づいてパラメータを「物理的に」補正する。
 * AIの推論し直しではなく、確定的な数値操作で即座に再レンダリングする。
 */
export const applyFeedbackAdjustment = (
  currentParams: MasteringParams,
  feedback: FeedbackType,
): MasteringParams => {
  const newParams: MasteringParams = {
    ...currentParams,
    eq_adjustments: [...(currentParams.eq_adjustments || [])],
  };

  switch (feedback) {
    case 'distortion':
      newParams.gain_adjustment_db -= 2.5;
      newParams.tube_drive_amount = Math.max(0, newParams.tube_drive_amount - 1.0);
      newParams.limiter_ceiling_db = -0.3;
      break;

    case 'muddy':
      newParams.eq_adjustments.push(
        { frequency: 250, gain_db: -3.0, q: 1.5, type: 'peak' },
        { frequency: 8000, gain_db: 2.0, q: 0.7, type: 'highshelf' },
      );
      newParams.exciter_amount = Math.min(0.2, (newParams.exciter_amount ?? 0) + 0.05);
      break;

    case 'harsh':
      newParams.eq_adjustments.push(
        { frequency: 4000, gain_db: -2.5, q: 2.0, type: 'peak' },
      );
      newParams.exciter_amount = Math.max(0, (newParams.exciter_amount ?? 0) - 0.05);
      break;

    case 'vocals_buried':
      newParams.eq_adjustments.push(
        { frequency: 1500, gain_db: 2.0, q: 1.0, type: 'peak' },
      );
      newParams.width_amount = Math.max(0.8, (newParams.width_amount ?? 1.0) - 0.2);
      break;

    case 'weak_kick':
      newParams.low_contour_amount = Math.min(1.0, (newParams.low_contour_amount ?? 0) + 0.3);
      newParams.eq_adjustments.push(
        { frequency: 60, gain_db: 2.0, q: 1.0, type: 'peak' },
      );
      break;

    case 'boomy':
      newParams.low_contour_amount = Math.max(0, (newParams.low_contour_amount ?? 0) - 0.3);
      newParams.eq_adjustments.push(
        { frequency: 120, gain_db: -3.0, q: 1.5, type: 'peak' },
      );
      break;

    case 'thin':
      newParams.tube_drive_amount = Math.min(5, newParams.tube_drive_amount + 1.0);
      newParams.gain_adjustment_db += 1.0;
      break;

    case 'narrow':
      newParams.width_amount = Math.min(1.8, (newParams.width_amount ?? 1.0) + 0.3);
      newParams.exciter_amount = Math.min(0.2, (newParams.exciter_amount ?? 0) + 0.05);
      break;

    case 'squashed':
      newParams.limiter_ceiling_db = -0.1;
      newParams.gain_adjustment_db -= 1.5;
      break;

    case 'not_loud':
      newParams.gain_adjustment_db += 2.0;
      newParams.limiter_ceiling_db = -0.05;
      break;
  }

  return newParams;
};
