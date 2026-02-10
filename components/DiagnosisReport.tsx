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

  if (data.truePeak <= -1.0) score += 10;
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
const DiagnosisReport: React.FC<Props> = ({ data, target, onTargetChange, onExecute, isMastering, language }) => {
  const ja = language === 'ja';
  const targetLufs = target === 'beatport' ? -7.0 : -14.0;
  const lufsGap = targetLufs - data.lufs;
  const [copied, setCopied] = React.useState(false);

  const copyReportToClipboard = useCallback(() => {
    const targetPeak = target === 'beatport' ? '-0.1' : '-1';
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
      {/* ── マスタリング先選択（実行前にここで Beatport / Spotify を選択） ── */}
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-300">
          {ja ? 'マスタリングの配信先' : 'Mastering target'}
        </span>
        <PlatformSelector currentTarget={target} onTargetChange={onTargetChange} />
      </div>

      {/* ── Compact header: small score badge + summary ── */}
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

      {/* ── プロ用サマリ: 指標・現在値・目標・判定（判断材料を一覧で） ── */}
      <div className="glass rounded-2xl p-4 sm:p-5 overflow-x-auto">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
          {ja ? '判断用サマリ（現在値 vs 目標）' : 'Summary for decision (current vs target)'}
        </p>
        <table className="w-full text-left border-collapse min-w-[420px]">
          <thead>
            <tr className="text-[10px] text-zinc-500 border-b border-white/10">
              <th className="py-2 pr-3 font-semibold">{ja ? '指標' : 'Metric'}</th>
              <th className="py-2 pr-3 font-mono font-semibold">{ja ? '現在値' : 'Current'}</th>
              <th className="py-2 pr-3 font-mono font-semibold">{ja ? '目標' : 'Target'}</th>
              <th className="py-2 font-semibold">{ja ? '判定' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? 'ラウドネス' : 'Loudness'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.lufs.toFixed(1)} LUFS</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">{targetLufs} LUFS</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${loudnessStatus === 'good' ? 'bg-green-500' : loudnessStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {loudnessStatus === 'good' ? (ja ? '適合' : 'Pass') : loudnessStatus === 'warn' ? (ja ? '要調整' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? 'トゥルーピーク' : 'True Peak'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.truePeak.toFixed(1)} dBTP</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">{target === 'beatport' ? '-0.1' : '-1'} dBTP</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${peakStatus === 'good' ? 'bg-green-500' : peakStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {peakStatus === 'good' ? (ja ? 'OK' : 'Pass') : peakStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? 'ダイナミクス (Crest)' : 'Dynamics (Crest)'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.crestFactor.toFixed(1)}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">{target === 'beatport' ? '6–10' : '9–15'}</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${dynamicStatus === 'good' ? 'bg-green-500' : dynamicStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {dynamicStatus === 'good' ? (ja ? '良好' : 'Pass') : dynamicStatus === 'warn' ? (ja ? '要確認' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? '位相相関' : 'Phase Corr.'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.phaseCorrelation.toFixed(3)}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">&gt;0.5</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${phaseStatus === 'good' ? 'bg-green-500' : phaseStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {phaseStatus === 'good' ? (ja ? 'OK' : 'Pass') : phaseStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? '歪み (THD近似)' : 'Distortion'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.distortionPercent.toFixed(2)}%</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">&lt;0.1%</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${distortionStatus === 'good' ? 'bg-green-500' : distortionStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {distortionStatus === 'good' ? (ja ? 'クリーン' : 'Pass') : distortionStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-3 text-zinc-300">{ja ? 'ノイズフロア' : 'Noise Floor'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{data.noiseFloorDb.toFixed(1)} dB</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">&lt;-60 dB</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${noiseStatus === 'good' ? 'bg-green-500' : noiseStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {noiseStatus === 'good' ? (ja ? 'OK' : 'Pass') : noiseStatus === 'warn' ? (ja ? '注意' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 text-zinc-300">{ja ? 'ステレオ幅 (低域)' : 'Stereo (low)'}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-white">{stereoWidth.toFixed(0)}%</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-zinc-400">&lt;50%</td>
              <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full ${bassMonoStatus === 'good' ? 'bg-green-500' : bassMonoStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} /> {bassMonoStatus === 'good' ? (ja ? '適正' : 'Pass') : bassMonoStatus === 'warn' ? (ja ? '要確認' : 'Warn') : (ja ? '要対応' : 'Fail')}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[10px] text-zinc-500 mt-3 font-mono">
          {ja ? 'マスタリング後想定: ' : 'Post-master target: '}
          {targetLufs} LUFS 前後、True Peak ≤ {target === 'beatport' ? '-0.1' : '-1'} dBTP（Brickwall でクリップ防止）
        </p>
        <button
          type="button"
          onClick={copyReportToClipboard}
          className="mt-3 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/20 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {copied ? (ja ? 'コピーしました' : 'Copied') : (ja ? 'レポートをコピー（判断・共有用）' : 'Copy report (evidence / share)')}
        </button>
      </div>

      {/* ── 視覚メトリクス（数値だけじゃない・ひと目で判断） ── */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
        <p className="text-[13px] font-bold text-white">
          {ja ? 'ひと目で分かるメトリクス' : 'Metrics at a glance'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MetricGauge
            label={ja ? 'ラウドネス (LUFS)' : 'Loudness (LUFS)'}
            value={data.lufs}
            valueLabel={`${data.lufs.toFixed(1)}`}
            status={loudnessStatus}
            min={target === 'beatport' ? -20 : -24}
            max={target === 'beatport' ? -4 : -8}
            targetValue={targetLufs}
            targetLabel={ja ? `目標 ${targetLufs} LUFS` : `Target ${targetLufs} LUFS`}
          />
          <MetricGauge
            label={ja ? 'トゥルーピーク' : 'True Peak'}
            value={data.truePeak}
            valueLabel={`${data.truePeak.toFixed(1)} dBTP`}
            status={peakStatus}
            min={-6}
            max={target === 'beatport' ? 1 : 0}
            targetValue={target === 'beatport' ? -0.1 : -1}
            targetLabel={ja ? `目標 ${target === 'beatport' ? '-0.1' : '-1'} dBTP` : `Target ${target === 'beatport' ? '-0.1' : '-1'} dBTP`}
          />
          <MetricGauge
            label={ja ? 'ダイナミクス (Crest)' : 'Dynamics (Crest)'}
            value={data.crestFactor}
            valueLabel={`${data.crestFactor.toFixed(1)}`}
            status={dynamicStatus}
            min={2}
            max={15}
            targetValue={target === 'beatport' ? 6.5 : 12}
            targetLabel={ja ? `目安 ${target === 'beatport' ? '6〜10' : '9〜15'}` : `Ref ${target === 'beatport' ? '6-10' : '9-15'}`}
          />
        </div>
        {data.frequencyData?.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <SpectrumBars bands={data.frequencyData} language={ja ? 'ja' : 'en'} />
          </div>
        )}
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
            Tube Sat → Pultec EQ → M/S → Glue Comp → Neuro-Drive → Soft Clip → Limiter → Brickwall (±1)
          </p>
          <p className="text-[9px] text-zinc-500 mt-1">
            {ja ? 'Brickwall: 出力を ±1 に保証。クリップ・割れ防止。' : 'Brickwall: Output guaranteed ±1. No clip/distortion.'}
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
