
import React from 'react';
import type { AudioAnalysisData, MasteringTarget } from '../types';

/* ─────────────────────────────────────────────────────────────────
   DiagnosisReport — HUD-style Diagnosis with Donut Score
   ───────────────────────────────────────────────────────────────── */

interface Props {
  data: AudioAnalysisData;
  target: MasteringTarget;
  onExecute: () => void;
  isMastering: boolean;
  language: 'ja' | 'en';
}

/* ── ドーナツチャート (SVG) ────────────────────────────── */
const DonutScore: React.FC<{ percent: number; size?: number }> = ({ percent, size = 140 }) => {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? '#22c55e' : percent >= 40 ? '#f59e0b' : '#ef4444';
  const glowColor = percent >= 70 ? 'rgba(34,197,94,0.3)' : percent >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          className="donut-track"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="donut-fill"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white tabular-nums">{percent}</span>
        <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
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
  const noiseStatus = data.noiseFloorDb < -80 ? 'good' : data.noiseFloorDb < -60 ? 'warn' : 'bad';
  const stereoWidth = data.stereoWidth;
  const bassMonoStatus = stereoWidth < 50 ? 'good' : stereoWidth < 70 ? 'warn' : 'bad';

  // 総合スコア
  const statuses = [loudnessStatus, peakStatus, dynamicStatus, phaseStatus, distortionStatus, noiseStatus, bassMonoStatus];
  const score = statuses.reduce((s, st) => s + (st === 'good' ? 2 : st === 'warn' ? 1 : 0), 0);
  const maxScore = statuses.length * 2;
  const scorePercent = Math.round((score / maxScore) * 100);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Hero: Score + Summary ─────────────────── */}
      <div className="glass-elevated rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Donut Chart */}
          <DonutScore percent={scorePercent} />

          {/* Summary */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h2 className="text-lg font-bold text-white">
              {ja ? '診断レポート' : 'Diagnosis Report'}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {ja
                ? `${target === 'beatport' ? 'Beatport Top' : 'Spotify'} 基準での忖度なし判定 — 7項目を検査`
                : `No-deference assessment for ${target === 'beatport' ? 'Beatport Top' : 'Spotify'} — 7 metrics inspected`}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-zinc-500">{statuses.filter(s => s === 'good').length} Pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-zinc-500">{statuses.filter(s => s === 'warn').length} Warn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-zinc-500">{statuses.filter(s => s === 'bad').length} Fail</span>
              </div>
            </div>
          </div>
        </div>
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
          detail={ja ? (noiseStatus === 'good' ? 'プロ水準のノイズフロア。' : 'ノイズ検出。DCブロッカーで対処。') : (noiseStatus === 'good' ? 'Professional noise floor.' : 'Noise detected. DC blocker will address.')} />
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
