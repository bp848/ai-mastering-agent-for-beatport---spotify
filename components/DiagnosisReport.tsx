
import React from 'react';
import type { AudioAnalysisData, MasteringTarget } from '../types';

/* ─────────────────────────────────────────────────────────────────
   DiagnosisReport
   分析完了後に表示する「ダメ出し」レポート。
   赤 = Bad / 緑 = Good で各指標を判定し、
   ユーザーに「AIマスタリングを実行する」ボタンを押させる。
   ───────────────────────────────────────────────────────────────── */

interface Props {
  data: AudioAnalysisData;
  target: MasteringTarget;
  onExecute: () => void;
  isMastering: boolean;
  language: 'ja' | 'en';
}

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
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
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

  // ステレオ幅から Bass Mono 判定
  const stereoWidth = data.stereoWidth;
  const bassMonoStatus = stereoWidth < 50 ? 'good' : stereoWidth < 70 ? 'warn' : 'bad';

  // 総合スコア（good=2, warn=1, bad=0）
  const statuses = [loudnessStatus, peakStatus, dynamicStatus, phaseStatus, distortionStatus, noiseStatus, bassMonoStatus];
  const score = statuses.reduce((s, st) => s + (st === 'good' ? 2 : st === 'warn' ? 1 : 0), 0);
  const maxScore = statuses.length * 2;
  const scorePercent = Math.round((score / maxScore) * 100);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Header ─────────────────────────────── */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              {ja ? '診断レポート' : 'Diagnosis Report'}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {ja
                ? `${target === 'beatport' ? 'Beatport Top' : 'Spotify'} 基準での忖度なし判定`
                : `No-deference assessment for ${target === 'beatport' ? 'Beatport Top' : 'Spotify'}`}
            </p>
          </div>
          {/* Score Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            scorePercent >= 70 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
            scorePercent >= 40 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className="text-xs font-bold font-mono tabular-nums">{scorePercent}%</span>
            <span className="text-[9px] uppercase tracking-wider">
              {ja ? '適合度' : 'Pass'}
            </span>
          </div>
        </div>

        {/* ── Diagnosis Lines ──────────────────── */}
        <div className="divide-y divide-white/5">
          <DiagLine
            label={ja ? 'ラウドネス (LUFS)' : 'Loudness (LUFS)'}
            status={loudnessStatus}
            value={`${data.lufs.toFixed(1)} LUFS`}
            detail={(() => {
              const absGap = Math.abs(lufsGap);
              if (absGap <= 1) {
                return ja
                  ? `目標 ${targetLufs} LUFS にほぼ適合しています（差分 ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB）。微調整のみ。`
                  : `Nearly at ${targetLufs} LUFS target (${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB gap). Fine-tuning only.`;
              }
              return ja
                ? `目標 ${targetLufs} LUFS まで ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB の${lufsGap > 0 ? 'ブースト' : '削減'}が必要です。`
                : `Need ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB ${lufsGap > 0 ? 'boost' : 'reduction'} to reach ${targetLufs} LUFS target.`;
            })()}
          />
          <DiagLine
            label={ja ? 'トゥルーピーク' : 'True Peak'}
            status={peakStatus}
            value={`${data.truePeak.toFixed(1)} dBTP`}
            detail={
              ja
                ? peakStatus === 'good' ? '-0.1 dBTP 以下: クリッピングの心配なし。' : 'ピークが高すぎます。リミッターで制御します。'
                : peakStatus === 'good' ? 'Below -0.1 dBTP: No clipping risk.' : 'Peak too high. Will be controlled by limiter.'
            }
          />
          <DiagLine
            label={ja ? 'ダイナミックレンジ' : 'Dynamic Range'}
            status={dynamicStatus}
            value={`${data.crestFactor.toFixed(1)} dB`}
            detail={
              ja
                ? dynamicStatus === 'good' ? '良好です。パンチ感が維持されています。'
                : dynamicStatus === 'warn' ? 'やや詰まっています。リミッターを慎重に適用します。'
                : '詰まりすぎています。音が平坦になるリスクがあります。'
                : dynamicStatus === 'good' ? 'Good. Punch is preserved.'
                : dynamicStatus === 'warn' ? 'Slightly compressed. Limiter will be applied carefully.'
                : 'Over-compressed. Risk of flat, lifeless sound.'
            }
          />
          <DiagLine
            label={ja ? '位相相関' : 'Phase Correlation'}
            status={phaseStatus}
            value={data.phaseCorrelation.toFixed(3)}
            detail={
              ja
                ? phaseStatus === 'good' ? '位相は安全です。' : '低域にステレオ位相の問題があります。Bass Mono 処理で修正します。'
                : phaseStatus === 'good' ? 'Phase is safe.' : 'Stereo phase issues in low-end. Bass Mono processing will correct this.'
            }
          />
          <DiagLine
            label={ja ? 'Bass Mono チェック' : 'Bass Mono Check'}
            status={bassMonoStatus}
            value={`${stereoWidth.toFixed(0)}%`}
            detail={
              ja
                ? bassMonoStatus === 'good' ? '低域のステレオ成分は適正です。' : '150 Hz 以下にステレオ成分が多すぎます。モノラル化を適用します。'
                : bassMonoStatus === 'good' ? 'Low-end stereo content is acceptable.' : 'Too much stereo content below 150 Hz. Bass mono processing will be applied.'
            }
          />
          <DiagLine
            label={ja ? '歪みチェック' : 'Distortion Check'}
            status={distortionStatus}
            value={`${data.distortionPercent.toFixed(2)}%`}
            detail={
              ja
                ? distortionStatus === 'good' ? 'クリーンです。' : 'クリッピングの兆候があります。ソフトクリッパーで処理します。'
                : distortionStatus === 'good' ? 'Clean signal.' : 'Clipping detected. Soft clipper will handle this.'
            }
          />
          <DiagLine
            label={ja ? 'ノイズフロア' : 'Noise Floor'}
            status={noiseStatus}
            value={`${data.noiseFloorDb.toFixed(1)} dB`}
            detail={
              ja
                ? noiseStatus === 'good' ? 'プロ水準のノイズフロアです。' : 'ノイズが検出されました。ゲートまたはDCブロッカーで対処します。'
                : noiseStatus === 'good' ? 'Professional noise floor level.' : 'Noise detected. DC blocker and gate will address this.'
            }
          />
        </div>
      </div>

      {/* ── Execute Button ─────────────────────── */}
      <div className="glass rounded-2xl p-5 sm:p-6 text-center space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-zinc-400">
            {(() => {
              const platformLabel = target === 'beatport' ? 'Beatport Top' : 'Spotify';
              const absGap = Math.abs(lufsGap);
              if (absGap <= 1) {
                // 音圧はほぼ最適
                return ja
                  ? `音圧は ${platformLabel} 基準にほぼ適合しています。音質の微調整、アナログサチュレーション、低域の最適化を適用します。`
                  : `Loudness is near ${platformLabel} standard. Fine-tuning, analog saturation, and low-end optimization will be applied.`;
              } else if (lufsGap > 0) {
                // ブーストが必要
                return ja
                  ? `${platformLabel} 用に最適化するには、音圧の +${lufsGap.toFixed(1)} dB ブースト、低域の調整、サチュレーション付与が必要です。`
                  : `To optimize for ${platformLabel}: +${lufsGap.toFixed(1)} dB loudness boost, low-end adjustment, and saturation are required.`;
              } else {
                // 既に音圧過多 → 削減
                return ja
                  ? `${platformLabel} 基準より ${absGap.toFixed(1)} dB ラウドです。音圧を適正値まで削減し、ダイナミクスを回復しつつアナログ質感を付与します。`
                  : `${absGap.toFixed(1)} dB louder than ${platformLabel} standard. Loudness will be reduced to target while restoring dynamics and adding analog character.`;
              }
            })()}
          </p>
          <p className="text-[10px] text-zinc-600">
            {ja ? 'Hybrid-Analog Engine が Tube Saturation, Pultec EQ, M/S Processing, Soft Clipper を適用します。' : 'Hybrid-Analog Engine will apply Tube Saturation, Pultec EQ, M/S Processing, Soft Clipper.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onExecute}
          disabled={isMastering}
          className="w-full sm:w-auto px-10 py-4 min-h-[52px] rounded-2xl bg-cyan-500 text-black font-extrabold text-sm uppercase tracking-wider hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-cyan-500/20"
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
