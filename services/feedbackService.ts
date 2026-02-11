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
/** 数値が有効でない場合のデフォルト（NaN/undefined 対策） */
const n = (v: number | undefined | null, fallback: number): number =>
  (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;

export const applyFeedbackAdjustment = (
  currentParams: MasteringParams,
  feedback: FeedbackType,
): MasteringParams => {
  const gain = n(currentParams.gain_adjustment_db, 0);
  const tube = n(currentParams.tube_drive_amount, 0);
  const exciter = n(currentParams.exciter_amount, 0);
  const lowContour = n(currentParams.low_contour_amount, 0);
  const width = n(currentParams.width_amount, 1);

  const newParams: MasteringParams = {
    ...currentParams,
    gain_adjustment_db: gain,
    tube_drive_amount: tube,
    exciter_amount: exciter,
    low_contour_amount: lowContour,
    width_amount: width,
    // デフォルト値で -0.1 など「攻めた」TPに寄せない（フィードバック時は安全側へ）
    limiter_ceiling_db: n(currentParams.limiter_ceiling_db, -1.0),
    eq_adjustments: [...(currentParams.eq_adjustments || [])],
  };

  /** 目標 LUFS がある場合のみ微調整（固定ゲイン加算ではなく、目標自体を動かして自己補正に委ねる） */
  const bumpTargetLufs = (delta: number) => {
    if (typeof newParams.target_lufs !== 'number' || !Number.isFinite(newParams.target_lufs)) return;
    // 過激な範囲に飛ばないようにガード
    const next = Math.max(-20, Math.min(-5, newParams.target_lufs + delta));
    newParams.target_lufs = Math.round(next * 100) / 100;
  };

  const getGentleLufsStep = (direction: 'up' | 'down'): number => {
    const currentTarget = n(newParams.target_lufs, -10);
    const tolerance = Math.max(0.2, Math.min(2.0, n(newParams.self_correction_lufs_tolerance_db, 1.0)));
    const toleranceDrivenStep = Math.max(0.2, Math.min(0.8, tolerance * 0.35));
    const configuredStep = n(newParams.self_correction_max_gain_step_db, toleranceDrivenStep);
    const boundedStep = Math.max(0.2, Math.min(0.8, configuredStep));
    const directionWeightedStep = direction === 'up' ? boundedStep : boundedStep * 1.2;
    const loudnessGuardedStep = direction === 'up' && currentTarget >= -8
      ? directionWeightedStep * 0.75
      : directionWeightedStep;
    const roomToLimit = direction === 'up'
      ? Math.max(0, -5 - currentTarget)
      : Math.max(0, currentTarget + 20);
    return Math.min(loudnessGuardedStep, roomToLimit);
  };

  switch (feedback) {
    case 'distortion':
      // 「割れ/歪み」= まずは安全側に寄せる（音圧より品質）
      // キック + ベース同時発音時の歪みを抑えるため、低域の衝突ポイントも軽く整理する。
      bumpTargetLufs(-getGentleLufsStep('down'));
      newParams.tube_drive_amount = Math.max(0, newParams.tube_drive_amount - 1.0);
      newParams.exciter_amount = Math.max(0, newParams.exciter_amount - 0.03);
      newParams.low_contour_amount = Math.max(0, newParams.low_contour_amount - 0.2);
      newParams.limiter_ceiling_db = -1.0;
      newParams.eq_adjustments.push(
        { frequency: 35, gain_db: -1.5, q: 0.7, type: 'lowshelf' },
        { frequency: 120, gain_db: -2.0, q: 1.2, type: 'peak' },
      );
      break;

    case 'muddy':
      newParams.eq_adjustments.push(
        { frequency: 250, gain_db: -3.0, q: 1.5, type: 'peak' },
        { frequency: 8000, gain_db: 2.0, q: 0.7, type: 'highshelf' },
      );
      newParams.exciter_amount = Math.min(0.15, newParams.exciter_amount + 0.05);
      break;

    case 'harsh':
      newParams.eq_adjustments.push(
        { frequency: 4000, gain_db: -2.5, q: 2.0, type: 'peak' },
      );
      newParams.exciter_amount = Math.max(0, newParams.exciter_amount - 0.05);
      break;

    case 'vocals_buried':
      newParams.eq_adjustments.push(
        { frequency: 1500, gain_db: 2.0, q: 1.0, type: 'peak' },
      );
      newParams.width_amount = Math.max(0.8, newParams.width_amount - 0.2);
      break;

    case 'weak_kick':
      newParams.low_contour_amount = Math.min(1.0, newParams.low_contour_amount + 0.3);
      newParams.eq_adjustments.push(
        { frequency: 60, gain_db: 2.0, q: 1.0, type: 'peak' },
      );
      break;

    case 'boomy':
      newParams.low_contour_amount = Math.max(0, newParams.low_contour_amount - 0.3);
      newParams.eq_adjustments.push(
        { frequency: 120, gain_db: -3.0, q: 1.5, type: 'peak' },
      );
      break;

    case 'thin':
      newParams.tube_drive_amount = Math.min(3, newParams.tube_drive_amount + 1.0);
      break;

    case 'narrow':
      newParams.width_amount = Math.min(1.4, newParams.width_amount + 0.3);
      newParams.exciter_amount = Math.min(0.15, newParams.exciter_amount + 0.05);
      break;

    case 'squashed':
      // 「潰れすぎ」= 目標を少し下げて自己補正で追従。ceiling -1.0 dB でレッド張り付き防止
      bumpTargetLufs(-getGentleLufsStep('down'));
      newParams.tube_drive_amount = Math.max(0, newParams.tube_drive_amount - 0.5);
      newParams.exciter_amount = Math.max(0, newParams.exciter_amount - 0.02);
      newParams.limiter_ceiling_db = -1.0;
      break;

    case 'not_loud':
      // 「まだ音圧が足りない」= +1.0 dB 目標アップ。ceiling -1.0 dB でレッド張り付き防止
      bumpTargetLufs(getGentleLufsStep('up'));
      newParams.limiter_ceiling_db = -1.0;
      break;
  }

  return newParams;
};
