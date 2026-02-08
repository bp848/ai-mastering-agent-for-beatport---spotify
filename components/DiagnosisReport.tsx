import React, { useMemo } from 'react';
import type { AudioAnalysisData, MasteringTarget } from '../types';

/* ─────────────────────────────────────────────────────────────────
   DiagnosisReport — Dynamic scoring + relaxed thresholds (Authority)
   ───────────────────────────────────────────────────────────────── */

interface Props {
  data: AudioAnalysisData;
  target: MasteringTarget;
  onExecute: () => void;
  isMastering: boolean;
  language: 'ja' | 'en';
}

/** 動的スコア計算（重み付け + 揺らぎで納得感のある数字に） */
const calculateScore = (data: AudioAnalysisData, target: MasteringTarget): number => {
  const targetLufs = target === 'beatport' ? -8.0 : -14.0;
  let score = 0;

  const diffLufs = Math.abs(data.lufs - targetLufs);
  if (diffLufs < 1.0) score += 30;
  else if (diffLufs < 3.0) score += 25;
  else if (diffLufs < 6.0) score += 15;
  else score += 5;

  const dr = data.dynamicRange ?? data.crestFactor ?? 0;
  if (dr >= 8 && dr <= 14) score += 20;
  else if (dr > 14) score += 15;
  else score += 10;

  if (data.phaseCorrelation > 0.8) score += 15;
  else if (data.phaseCorrelation > 0.5) score += 10;
  else score += 0;

  if (data.stereoWidth < 30) score += 15;
  else if (data.stereoWidth < 60) score += 10;
  else score += 5;

  if (data.truePeak <= -1.0) score += 10;
  else score += 5;

  if (data.noiseFloorDb < -60) score += 5;
  else if (data.noiseFloorDb < -40) score += 3;
  else score += 0;

  if (data.distortionPercent < 1.0) score += 5;
  else score += 0;

  const variance = Math.floor(Math.random() * 3) - 1;
  return Math.min(99, Math.max(10, score + variance));
};

/** ノイズフロア判定（-60dB 以下を優秀とする） */
const getNoiseStatus = (db: number): 'good' | 'warn' | 'bad' => {
  if (db < -60) return 'good';
  if (db < -40) return 'warn';
  return 'bad';
};

/* ── 個別の診断行 ─────────────────────────────────────── */
interface DiagLineProps {
  label: string;
  status: 'good' | 'warn' | 'bad';
  detail: string;
  value?: string;
}

const statusColors = {
  good: { dot: 'bg-green-500', ring: 'ring-green-500/30', text: 'text-green-400' },
  warn: { dot: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-400' },
  bad:  { dot: 'bg-red-500',   ring: 'ring-red-500/30',   text: 'text-red-400'   },
};

const DiagLine: React.FC<DiagLineProps> = ({ label, status, detail, value }) => {
  const c = statusColors[status];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${c.dot} ring-2 ${c.ring} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold text-white">{label}</span>
          {value && <span className={`text-xs font-mono tabular-nums ${c.text}`}>{value}</span>}
        </div>
        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
};

/* ── メインコンポーネント ────────────────────────────── */
const DiagnosisReport: React.FC<Props> = ({ data, target, onExecute, isMastering, language }) => {
  const ja = language === 'ja';
  const targetLufs = target === 'beatport' ? -7.0 : -14.0;
  const lufsGap = targetLufs - data.lufs;

  // ── 各指標の判定 ──
  const loudnessStatus = Math.abs(lufsGap) <= 2 ? 'good' : Math.abs(lufsGap) <= 5 ? 'warn' : 'bad';
  const peakStatus = data.truePeak <= -0.1 ? 'good' : data.truePeak <= 0 ? 'warn' : 'bad';
  const dynamicStatus = data.crestFactor >= 6 ? 'good' : data.crestFactor >= 3 ? 'warn' : 'bad';
  const phaseStatus = data.phaseCorrelation > 0.5 ? 'good' : data.phaseCorrelation > 0 ? 'warn' : 'bad';
  const distortionStatus = data.distortionPercent < 0.1 ? 'good' : data.distortionPercent < 1 ? 'warn' : 'bad';
  const noiseStatus = getNoiseStatus(data.noiseFloorDb);
  const stereoWidth = data.stereoWidth;
  const bassMonoStatus = stereoWidth < 50 ? 'good' : stereoWidth < 70 ? 'warn' : 'bad';

  const statuses = [loudnessStatus, peakStatus, dynamicStatus, phaseStatus, distortionStatus, noiseStatus, bassMonoStatus];
  const scorePercent = useMemo(() => calculateScore(data, target), [data, target]);

  const scoreColor = scorePercent >= 70 ? 'text-green-400' : scorePercent >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Compact header: small score badge + summary (no huge donut) ── */}
      <div className="glass-elevated rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white">
              {ja ? '診断レポート' : 'Diagnosis Report'}
            </h2>
            <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg font-mono font-bold text-lg tabular-nums ${scoreColor} bg-white/5 border border-white/10`}>
              {scorePercent}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-green-500" />{statuses.filter(s => s === 'good').length} Pass
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />{statuses.filter(s => s === 'warn').length} Warn
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />{statuses.filter(s => s === 'bad').length} Fail
            </span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          {ja
            ? `${target === 'beatport' ? 'Beatport Top' : 'Spotify'} 基準 — 7項目を検査`
            : `${target === 'beatport' ? 'Beatport Top' : 'Spotify'} — 7 metrics inspected`}
        </p>
      </div>

      {/* ── Diagnosis Lines ──────────────────────── */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <DiagLine
          label={ja ? 'ラウドネス (LUFS)' : 'Loudness (LUFS)'}
          status={loudnessStatus}
          value={`${data.lufs.toFixed(1)} LUFS`}
          detail={(() => {
            const absGap = Math.abs(lufsGap);
            if (absGap <= 1) {
              return ja
                ? `目標 ${targetLufs} LUFS にほぼ適合（差分 ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB）。微調整のみ。`
                : `Nearly at ${targetLufs} LUFS target (${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB gap). Fine-tuning only.`;
            }
            return ja
              ? `目標 ${targetLufs} LUFS まで ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB の${lufsGap > 0 ? 'ブースト' : '削減'}が必要。`
              : `Need ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB ${lufsGap > 0 ? 'boost' : 'reduction'} to reach ${targetLufs} LUFS target.`;
          })()}
        />
        <DiagLine label={ja ? 'トゥルーピーク' : 'True Peak'} status={peakStatus} value={`${data.truePeak.toFixed(1)} dBTP`}
          detail={ja ? (peakStatus === 'good' ? '-0.1 dBTP 以下: クリッピングの心配なし。' : 'ピークが高すぎます。リミッターで制御します。') : (peakStatus === 'good' ? 'Below -0.1 dBTP: No clipping risk.' : 'Peak too high. Will be controlled by limiter.')} />
        <DiagLine label={ja ? 'ダイナミックレンジ' : 'Dynamic Range'} status={dynamicStatus} value={`${data.crestFactor.toFixed(1)} dB`}
          detail={ja ? (dynamicStatus === 'good' ? '良好。パンチ感が維持されています。' : dynamicStatus === 'warn' ? 'やや詰まっています。リミッターを慎重に適用。' : '詰まりすぎ。音が平坦になるリスク。') : (dynamicStatus === 'good' ? 'Good. Punch is preserved.' : dynamicStatus === 'warn' ? 'Slightly compressed. Limiter applied carefully.' : 'Over-compressed. Risk of flat sound.')} />
        <DiagLine label={ja ? '位相相関' : 'Phase Correlation'} status={phaseStatus} value={data.phaseCorrelation.toFixed(3)}
          detail={ja ? (phaseStatus === 'good' ? '位相は安全です。' : '低域にステレオ位相問題。Bass Mono 処理で修正。') : (phaseStatus === 'good' ? 'Phase is safe.' : 'Stereo phase issues in low-end. Bass Mono will correct.')} />
        <DiagLine label={ja ? 'Bass Mono チェック' : 'Bass Mono Check'} status={bassMonoStatus} value={`${stereoWidth.toFixed(0)}%`}
          detail={ja ? (bassMonoStatus === 'good' ? '低域ステレオ成分は適正。' : '150Hz以下にステレオ成分が多すぎます。') : (bassMonoStatus === 'good' ? 'Low-end stereo content is acceptable.' : 'Too much stereo below 150Hz.')} />
        <DiagLine label={ja ? '歪みチェック' : 'Distortion Check'} status={distortionStatus} value={`${data.distortionPercent.toFixed(2)}%`}
          detail={ja ? (distortionStatus === 'good' ? 'クリーンです。' : 'クリッピングの兆候。ソフトクリッパーで処理。') : (distortionStatus === 'good' ? 'Clean signal.' : 'Clipping detected. Soft clipper will handle.')} />
        <DiagLine label={ja ? 'ノイズフロア' : 'Noise Floor'} status={noiseStatus} value={`${data.noiseFloorDb.toFixed(1)} dB`}
          detail={ja ? (noiseStatus === 'good' ? 'クリーンです。' : noiseStatus === 'warn' ? 'アナログノイズ検出。除去を推奨。' : 'ノイズが多すぎます。') : (noiseStatus === 'good' ? 'Clean.' : noiseStatus === 'warn' ? 'Analog noise detected. Removal recommended.' : 'Too much noise.')} />
      </div>

      {/* ── Execute Button (Glowing CTA) ──────────── */}
      <div className="glass-elevated rounded-2xl p-6 sm:p-8 text-center space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-zinc-300">
            {(() => {
              const absGap = Math.abs(lufsGap);
              if (absGap <= 1) {
                return ja
                  ? '音圧はほぼ最適です。音質の微調整とアナログ質感を付与します。'
                  : 'Loudness is near optimal. Fine-tuning and analog character will be applied.';
              } else if (lufsGap > 0) {
                return ja
                  ? `+${lufsGap.toFixed(1)} dB のブースト、低域最適化、サチュレーションを適用します。`
                  : `+${lufsGap.toFixed(1)} dB boost, low-end optimization, and saturation will be applied.`;
              } else {
                return ja
                  ? `${absGap.toFixed(1)} dB の削減とダイナミクス回復を適用します。`
                  : `${absGap.toFixed(1)} dB reduction with dynamics restoration will be applied.`;
              }
            })()}
          </p>
          <p className="text-[10px] text-zinc-600 font-mono">
            Tube Sat → Pultec EQ → M/S → Glue Comp → Neuro-Drive → Soft Clip → Limiter
          </p>
        </div>

        <button
          type="button"
          onClick={onExecute}
          disabled={isMastering}
          className={`w-full sm:w-auto px-12 py-5 min-h-[56px] rounded-2xl font-extrabold text-base uppercase tracking-wider transition-all active:scale-[0.98] touch-manipulation ${
            isMastering
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse-glow'
          }`}
        >
          {isMastering
            ? (ja ? 'マスタリング実行中...' : 'Mastering in progress...')
            : (ja ? 'AI マスタリングを実行する' : 'Execute AI Mastering')}
        </button>
      </div>
    </div>
  );
};

export default DiagnosisReport;
