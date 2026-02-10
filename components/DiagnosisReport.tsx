import React, { useMemo, useCallback } from 'react';
import type { AudioAnalysisData, MasteringTarget } from '../types';
import PlatformSelector from './PlatformSelector';

/* ─────────────────────────────────────────────────────────────────
   DiagnosisReport — Dynamic scoring + relaxed thresholds (Authority)
   ───────────────────────────────────────────────────────────────── */

interface Props {
  data: AudioAnalysisData;
  target: MasteringTarget;
  onTargetChange: (t: MasteringTarget) => void;
  onExecute: () => void;
  onChooseOtherFile?: () => void;
  isMastering: boolean;
  language: 'ja' | 'en';
}

/** スコア計算（分析データのみから決定的に算出。同一曲は常に同じ結果） */
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

  const peakTarget = target === 'beatport' ? -0.3 : -1.0;
  if (data.truePeak <= peakTarget) score += 10;
  else score += 5;

  if (data.noiseFloorDb < -60) score += 5;
  else if (data.noiseFloorDb < -40) score += 3;
  else score += 0;

  if (data.distortionPercent < 1.0) score += 5;
  else score += 0;

  return Math.min(99, Math.max(10, score));
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

/** 視覚ゲージ: 現在値をスライダー状のバーで表示（目標がひと目で分かる） */
const MetricGauge: React.FC<{
  label: string;
  value: number;
  valueLabel: string;
  status: 'good' | 'warn' | 'bad';
  min: number;
  max: number;
  targetValue: number;
  targetLabel: string;
}> = ({ label, value, valueLabel, status, min, max, targetValue, targetLabel }) => {
  const range = max - min;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const targetPct = Math.max(0, Math.min(100, ((targetValue - min) / range) * 100));
  const barColor = status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        <span className={`text-sm font-bold font-mono tabular-nums ${statusColors[status].text}`}>{valueLabel}</span>
      </div>
      <div className="relative h-4 rounded-full bg-zinc-800 overflow-hidden">
        {/* 目標ゾーン（薄い縦線） */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/40 -translate-x-1/2"
          style={{ left: `${targetPct}%` }}
          title={targetLabel}
        />
        {/* 現在値マーカー（太め） */}
        <div
          className={`absolute top-0 w-2 h-full rounded-full ${barColor} shadow-lg -translate-x-1/2 z-10`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <p className="text-[9px] text-zinc-500 font-mono">{targetLabel}</p>
    </div>
  );
};

/** 周波数帯域を横棒で一覧表示（バランスが一目で分かる） */
const SpectrumBars: React.FC<{ bands: { name: string; level: number }[]; language: string }> = ({ bands, language }) => {
  if (!bands.length) return null;
  const maxDb = 0;
  const minDb = -48;
  const range = maxDb - minDb;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-zinc-400">
        {language === 'ja' ? '周波数バランス（一目でチェック）' : 'Frequency balance (at a glance)'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {bands.map((b) => {
          const level = Math.max(minDb, Math.min(maxDb, b.level));
          const pct = ((level - minDb) / range) * 100;
          const isLow = level < -18;
          const isHigh = level > -6;
          const barColor = isLow ? 'bg-amber-500/60' : isHigh ? 'bg-cyan-500/60' : 'bg-green-500/50';
          return (
            <div key={b.name} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500 font-mono">{b.name}</span>
                <span className="text-zinc-400 font-mono tabular-nums">{b.level.toFixed(0)} dB</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── メインコンポーネント ────────────────────────────── */
const DiagnosisReport: React.FC<Props> = ({ data, target, onTargetChange, onExecute, onChooseOtherFile, isMastering, language }) => {
  const ja = language === 'ja';
  const targetLufs = target === 'beatport' ? -8.0 : -14.0;
  const lufsGap = targetLufs - data.lufs;
  const [copied, setCopied] = React.useState(false);

  const copyReportToClipboard = useCallback(() => {
    const targetPeak = target === 'beatport' ? '-0.3' : '-1';
    const lines = [
      ja ? '=== 診断レポート（判断用） ===' : '=== Diagnosis Report (for decision) ===',
      `${ja ? 'ラウドネス' : 'Loudness'}: ${data.lufs.toFixed(1)} LUFS | ${ja ? '目標' : 'Target'} ${targetLufs} LUFS | ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB`,
      `${ja ? 'トゥルーピーク' : 'True Peak'}: ${data.truePeak.toFixed(1)} dBTP | ${ja ? '目標' : 'Target'} ≤${targetPeak} dBTP`,
      `${ja ? 'ダイナミクス' : 'Dynamics'}: ${data.crestFactor.toFixed(1)} (Crest)`,
      `${ja ? '位相相関' : 'Phase'}: ${data.phaseCorrelation.toFixed(3)}`,
      `${ja ? '歪み' : 'Distortion'}: ${data.distortionPercent.toFixed(2)}%`,
      `${ja ? 'ノイズフロア' : 'Noise Floor'}: ${data.noiseFloorDb.toFixed(1)} dB`,
      `${ja ? 'ステレオ幅' : 'Stereo'}: ${data.stereoWidth.toFixed(0)}%`,
      '',
      `${ja ? 'マスタリング後想定' : 'Post-master target'}: ${targetLufs} LUFS, True Peak ≤${targetPeak} dBTP (Brickwall)`,
      `Chain: Tube Sat → Pultec EQ → M/S → Glue Comp → Neuro-Drive → Soft Clip → Limiter → Brickwall (±1)`,
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [data, target, ja, lufsGap]);

  // ── 各指標の判定 ──
  const loudnessStatus = Math.abs(lufsGap) <= 2 ? 'good' : Math.abs(lufsGap) <= 5 ? 'warn' : 'bad';
  const peakStatus = data.truePeak <= (target === 'beatport' ? -0.3 : -1.0) ? 'good' : data.truePeak <= 0 ? 'warn' : 'bad';
  const dynamicStatus = data.crestFactor >= 6 ? 'good' : data.crestFactor >= 3 ? 'warn' : 'bad';
  const phaseStatus = data.phaseCorrelation > 0.5 ? 'good' : data.phaseCorrelation > 0 ? 'warn' : 'bad';
  const distortionStatus = data.distortionPercent < 0.1 ? 'good' : data.distortionPercent < 1 ? 'warn' : 'bad';
  const noiseStatus = getNoiseStatus(data.noiseFloorDb);
  const stereoWidth = data.stereoWidth;
  const bassMonoStatus = stereoWidth < 50 ? 'good' : stereoWidth < 70 ? 'warn' : 'bad';

  const statuses = [loudnessStatus, peakStatus, dynamicStatus, phaseStatus, distortionStatus, noiseStatus, bassMonoStatus];
  const scorePercent = useMemo(() => calculateScore(data, target), [data, target]);

  const scoreColor = scorePercent >= 70 ? 'text-green-400' : scorePercent >= 40 ? 'text-amber-400' : 'text-red-400';

  const summaryText = (() => {
    const absGap = Math.abs(lufsGap);
    if (absGap <= 1) {
      return ja
        ? '音圧はほぼ最適です。音質の微調整とアナログ質感を付与します。'
        : 'Loudness is near optimal. Fine-tuning and analog character will be applied.';
    }
    if (lufsGap > 0) {
      return ja
        ? `+${lufsGap.toFixed(1)} dB のブースト、低域最適化、サチュレーションを適用します。`
        : `+${lufsGap.toFixed(1)} dB boost, low-end optimization, and saturation will be applied.`;
    }
    return ja
      ? `${absGap.toFixed(1)} dB の削減とダイナミクス回復を適用します。`
      : `${absGap.toFixed(1)} dB reduction with dynamics restoration will be applied.`;
  })();

  const StatusDot = ({ s }: { s: 'good' | 'warn' | 'bad' }) => (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${s === 'good' ? 'bg-green-500' : s === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-7rem)] animate-fade-up">
      {/* 1行: 配信先 + スコア + 判定数 */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">
            {ja ? 'マスタリングの配信先' : 'Mastering target'}
          </span>
          <PlatformSelector currentTarget={target} onTargetChange={onTargetChange} />
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <StatusDot s="good" /><span>{statuses.filter(s => s === 'good').length}</span>
            <StatusDot s="warn" /><span>{statuses.filter(s => s === 'warn').length}</span>
            <StatusDot s="bad" /><span>{statuses.filter(s => s === 'bad').length}</span>
          </span>
          <span className={`min-w-[2.5rem] px-2.5 py-1 rounded-lg font-mono font-bold text-base tabular-nums ${scoreColor} bg-white/5 border border-white/10`}>
            {scorePercent}%
          </span>
        </div>
      </div>

      {/* メイン: 左=コンパクト表 / 右=CTA（全画面でスクロールなし） */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr,minmax(300px,380px)] gap-4 min-h-0">
        {/* 左: 判断用サマリ表（コンパクト・見やすいグリッド） */}
        <div className="glass rounded-xl p-4 overflow-auto min-h-0 flex flex-col">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            {ja ? '診断サマリ' : 'Diagnosis summary'}
          </p>
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-white/10 sticky top-0 bg-[#0a0a0b]">
                  <th className="py-1.5 pr-2 font-semibold">{ja ? '項目' : 'Item'}</th>
                  <th className="py-1.5 pr-2 font-mono">{ja ? '現状' : 'Current'}</th>
                  <th className="py-1.5 pr-2 font-mono">{ja ? '目標' : 'Target'}</th>
                  <th className="py-1.5 w-16">{ja ? '判定' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? 'ラウドネス' : 'Loudness'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.lufs.toFixed(1)} LUFS</td><td className="py-1.5 pr-2 font-mono text-zinc-400">{targetLufs}</td><td className="py-1.5"><StatusDot s={loudnessStatus} /> {loudnessStatus === 'good' ? (ja ? '適合' : 'OK') : loudnessStatus === 'warn' ? (ja ? '要調整' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? 'トゥルーピーク' : 'True Peak'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.truePeak.toFixed(1)} dBTP</td><td className="py-1.5 pr-2 font-mono text-zinc-400">{target === 'beatport' ? '-0.3' : '-1'}</td><td className="py-1.5"><StatusDot s={peakStatus} /> {peakStatus === 'good' ? (ja ? 'OK' : 'OK') : peakStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? 'ダイナミクス' : 'Dynamics'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.crestFactor.toFixed(1)}</td><td className="py-1.5 pr-2 font-mono text-zinc-400">{target === 'beatport' ? '6–10' : '9–15'}</td><td className="py-1.5"><StatusDot s={dynamicStatus} /> {dynamicStatus === 'good' ? (ja ? '良好' : 'OK') : dynamicStatus === 'warn' ? (ja ? '要確認' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? '位相相関' : 'Phase'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.phaseCorrelation.toFixed(3)}</td><td className="py-1.5 pr-2 font-mono text-zinc-400">&gt;0.5</td><td className="py-1.5"><StatusDot s={phaseStatus} /> {phaseStatus === 'good' ? (ja ? 'OK' : 'OK') : phaseStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? '歪み' : 'Distortion'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.distortionPercent.toFixed(2)}%</td><td className="py-1.5 pr-2 font-mono text-zinc-400">&lt;0.1%</td><td className="py-1.5"><StatusDot s={distortionStatus} /> {distortionStatus === 'good' ? (ja ? 'クリーン' : 'OK') : distortionStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr className="border-b border-white/5"><td className="py-1.5 pr-2 text-zinc-300">{ja ? 'ノイズフロア' : 'Noise Floor'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{data.noiseFloorDb.toFixed(1)} dB</td><td className="py-1.5 pr-2 font-mono text-zinc-400">&lt;-60</td><td className="py-1.5"><StatusDot s={noiseStatus} /> {noiseStatus === 'good' ? (ja ? 'OK' : 'OK') : noiseStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
                <tr><td className="py-1.5 pr-2 text-zinc-300">{ja ? 'ステレオ幅' : 'Stereo'}</td><td className="py-1.5 pr-2 font-mono tabular-nums text-white">{stereoWidth.toFixed(0)}%</td><td className="py-1.5 pr-2 font-mono text-zinc-400">&lt;50%</td><td className="py-1.5"><StatusDot s={bassMonoStatus} /> {bassMonoStatus === 'good' ? (ja ? '適正' : 'OK') : bassMonoStatus === 'warn' ? (ja ? '要確認' : 'Warn') : (ja ? '要対応' : 'Fail')}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 shrink-0">
            <p className="text-[9px] text-zinc-500 font-mono truncate">
              {targetLufs} LUFS, TP≤{target === 'beatport' ? '-0.3' : '-1'} dBTP
            </p>
            <button type="button" onClick={copyReportToClipboard} className="shrink-0 px-2 py-1 rounded text-[10px] font-medium border border-white/20 text-zinc-400 hover:text-white hover:bg-white/5">
              {copied ? (ja ? 'コピー済' : 'Copied') : (ja ? 'コピー' : 'Copy')}
            </button>
          </div>
        </div>

        {/* 右: CTA ブロック（常に目立つ・押しやすい） */}
        <div className="flex flex-col gap-4 shrink-0 lg:min-h-0">
          <div className="glass rounded-xl p-4 flex-1 flex flex-col justify-center">
            <p className="text-sm text-zinc-300 leading-relaxed">
              {summaryText}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono mt-2">
              Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall
            </p>
          </div>
          <button
            type="button"
            onClick={onExecute}
            disabled={isMastering}
            className={`w-full py-5 min-h-[64px] rounded-2xl font-extrabold text-lg uppercase tracking-widest transition-all active:scale-[0.98] touch-manipulation ${
              isMastering
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_32px_rgba(34,211,238,0.5)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] border-2 border-cyan-400/50'
            }`}
          >
            {isMastering
              ? (ja ? 'マスタリング実行中...' : 'Mastering...')
              : (ja ? 'AI マスタリングを実行する' : 'Execute AI Mastering')}
          </button>
          {onChooseOtherFile && (
            <button
              type="button"
              onClick={onChooseOtherFile}
              className="text-xs text-zinc-500 hover:text-white underline underline-offset-2"
            >
              {ja ? '別のファイルを選ぶ' : 'Choose another file'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosisReport;
