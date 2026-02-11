import React, { useMemo, useCallback } from 'react';
import type { AudioAnalysisData, MasteringTarget } from '../types';
import PlatformSelector from './PlatformSelector';

/* ─────────────────────────────────────────────────────────────────
   DiagnosisReport — Professional diagnosis with CTA
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

const calculateScore = (data: AudioAnalysisData, target: MasteringTarget): number => {
  const targetLufs = target === 'beatport' ? -8.0 : -14.0;
  let score = 0;
  const diffLufs = Math.abs(data.lufs - targetLufs);
  if (diffLufs < 1.0) score += 30; else if (diffLufs < 3.0) score += 25; else if (diffLufs < 6.0) score += 15; else score += 5;
  const dr = data.dynamicRange ?? data.crestFactor ?? 0;
  if (dr >= 8 && dr <= 14) score += 20; else if (dr > 14) score += 15; else score += 10;
  if (data.phaseCorrelation > 0.8) score += 15; else if (data.phaseCorrelation > 0.5) score += 10;
  if (data.stereoWidth < 30) score += 15; else if (data.stereoWidth < 60) score += 10; else score += 5;
  const peakTarget = target === 'beatport' ? -0.3 : -1.0;
  if (data.truePeak <= peakTarget) score += 10; else score += 5;
  if (data.noiseFloorDb < -60) score += 5; else if (data.noiseFloorDb < -40) score += 3;
  if (data.distortionPercent < 1.0) score += 5;
  return Math.min(99, Math.max(10, score));
};

type Status = 'good' | 'warn' | 'bad';

const StatusDot = ({ s }: { s: Status }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
    s === 'good' ? 'bg-success' : s === 'warn' ? 'bg-warning' : 'bg-destructive'
  }`} />
);

const statusLabel = (s: Status, ja: boolean): string => {
  if (s === 'good') return ja ? 'OK' : 'OK';
  if (s === 'warn') return ja ? '要調整' : 'Warn';
  return ja ? '要対応' : 'Fail';
};

interface MetricRowProps {
  label: string;
  current: string;
  target: string;
  status: Status;
  ja: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, current, target, status, ja }) => (
  <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
    <StatusDot s={status} />
    <div className="flex-1 min-w-0">
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
    <span className="text-xs font-mono text-foreground font-semibold tabular-nums w-24 text-right">{current}</span>
    <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">{target}</span>
    <span className={`text-[10px] font-bold w-14 text-right ${
      status === 'good' ? 'text-success' : status === 'warn' ? 'text-warning' : 'text-destructive'
    }`}>
      {statusLabel(status, ja)}
    </span>
  </div>
);

const DiagnosisReport: React.FC<Props> = ({ data, target, onTargetChange, onExecute, onChooseOtherFile, isMastering, language }) => {
  const ja = language === 'ja';
  const targetLufs = target === 'beatport' ? -8.0 : -14.0;
  const lufsGap = targetLufs - data.lufs;
  const [copied, setCopied] = React.useState(false);

  const copyReportToClipboard = useCallback(() => {
    const targetPeak = target === 'beatport' ? '-0.3' : '-1';
    const lines = [
      `Loudness: ${data.lufs.toFixed(1)} LUFS | Target ${targetLufs}`,
      `True Peak: ${data.truePeak.toFixed(1)} dBTP | Target <=${targetPeak}`,
      `Dynamics: ${data.crestFactor.toFixed(1)} | Phase: ${data.phaseCorrelation.toFixed(3)}`,
      `Distortion: ${data.distortionPercent.toFixed(2)}% | Noise: ${data.noiseFloorDb.toFixed(1)}dB`,
      `Stereo: ${data.stereoWidth.toFixed(0)}%`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [data, target, targetLufs]);

  const loudnessStatus: Status = Math.abs(lufsGap) <= 2 ? 'good' : Math.abs(lufsGap) <= 5 ? 'warn' : 'bad';
  const peakStatus: Status = data.truePeak <= (target === 'beatport' ? -0.3 : -1.0) ? 'good' : data.truePeak <= 0 ? 'warn' : 'bad';
  const dynamicStatus: Status = data.crestFactor >= 6 ? 'good' : data.crestFactor >= 3 ? 'warn' : 'bad';
  const phaseStatus: Status = data.phaseCorrelation > 0.5 ? 'good' : data.phaseCorrelation > 0 ? 'warn' : 'bad';
  const distortionStatus: Status = data.distortionPercent < 0.1 ? 'good' : data.distortionPercent < 1 ? 'warn' : 'bad';
  const noiseStatus: Status = data.noiseFloorDb < -60 ? 'good' : data.noiseFloorDb < -40 ? 'warn' : 'bad';
  const stereoStatus: Status = data.stereoWidth < 50 ? 'good' : data.stereoWidth < 70 ? 'warn' : 'bad';

  const statuses = [loudnessStatus, peakStatus, dynamicStatus, phaseStatus, distortionStatus, noiseStatus, stereoStatus];
  const scorePercent = useMemo(() => calculateScore(data, target), [data, target]);
  const scoreColor = scorePercent >= 70 ? 'text-success' : scorePercent >= 40 ? 'text-warning' : 'text-destructive';

  const summaryText = (() => {
    const absGap = Math.abs(lufsGap);
    if (absGap <= 1) return ja ? '音圧はほぼ最適。音質の微調整とアナログ質感を付与します。' : 'Loudness is near optimal. Fine-tuning and analog character will be applied.';
    if (lufsGap > 0) return ja ? `+${lufsGap.toFixed(1)} dBのブースト、低域最適化、サチュレーションを適用します。` : `+${lufsGap.toFixed(1)} dB boost, low-end optimization, and saturation will be applied.`;
    return ja ? `${absGap.toFixed(1)} dBの削減とダイナミクス回復を適用します。` : `${absGap.toFixed(1)} dB reduction with dynamics restoration will be applied.`;
  })();

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header: Target selector + Score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PlatformSelector currentTarget={target} onTargetChange={onTargetChange} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusDot s="good" /><span>{statuses.filter(s => s === 'good').length}</span>
            <StatusDot s="warn" /><span>{statuses.filter(s => s === 'warn').length}</span>
            <StatusDot s="bad" /><span>{statuses.filter(s => s === 'bad').length}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl font-mono font-extrabold text-xl tabular-nums ${scoreColor} border border-border`} style={{ background: 'rgba(255,255,255,0.03)' }}>
            {scorePercent}<span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Main grid: Metrics + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
        {/* Left: Metrics */}
        <div className="rounded-2xl border border-border p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {ja ? '診断サマリ' : 'Diagnosis Summary'}
            </h3>
            <button
              type="button"
              onClick={copyReportToClipboard}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
            >
              {copied ? (ja ? 'Copied' : 'Copied') : (ja ? 'Copy' : 'Copy')}
            </button>
          </div>

          {/* Table header */}
          <div className="flex items-center gap-3 pb-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="w-2.5" />
            <span className="flex-1">{ja ? '項目' : 'Metric'}</span>
            <span className="w-24 text-right">{ja ? '現状' : 'Current'}</span>
            <span className="w-16 text-right">{ja ? '目標' : 'Target'}</span>
            <span className="w-14 text-right">{ja ? '判定' : 'Status'}</span>
          </div>

          <MetricRow label={ja ? 'ラウドネス' : 'Loudness'} current={`${data.lufs.toFixed(1)} LUFS`} target={`${targetLufs}`} status={loudnessStatus} ja={ja} />
          <MetricRow label={ja ? 'トゥルーピーク' : 'True Peak'} current={`${data.truePeak.toFixed(1)} dBTP`} target={target === 'beatport' ? '-0.3' : '-1.0'} status={peakStatus} ja={ja} />
          <MetricRow label={ja ? 'ダイナミクス' : 'Dynamics'} current={data.crestFactor.toFixed(1)} target={target === 'beatport' ? '6-10' : '9-15'} status={dynamicStatus} ja={ja} />
          <MetricRow label={ja ? '位相相関' : 'Phase'} current={data.phaseCorrelation.toFixed(3)} target={'>0.5'} status={phaseStatus} ja={ja} />
          <MetricRow label={ja ? '歪み' : 'Distortion'} current={`${data.distortionPercent.toFixed(2)}%`} target={'<0.1%'} status={distortionStatus} ja={ja} />
          <MetricRow label={ja ? 'ノイズフロア' : 'Noise Floor'} current={`${data.noiseFloorDb.toFixed(1)} dB`} target={'<-60'} status={noiseStatus} ja={ja} />
          <MetricRow label={ja ? 'ステレオ幅' : 'Stereo Width'} current={`${data.stereoWidth.toFixed(0)}%`} target={'<50%'} status={stereoStatus} ja={ja} />

          <p className="text-[9px] text-muted-foreground font-mono mt-3">
            {targetLufs} LUFS, TP{'<='}{target === 'beatport' ? '-0.3' : '-1'} dBTP | Chain: Tube Sat {'>'} Pultec {'>'} M/S {'>'} Glue {'>'} Neuro-Drive {'>'} Limiter
          </p>
        </div>

        {/* Right: CTA */}
        <div className="flex flex-col gap-4">
          {/* Summary card */}
          <div className="rounded-2xl border border-border p-6 flex-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {ja ? 'AI提案' : 'AI Proposal'}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{summaryText}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-4">
              Tube Sat {'>'} Pultec {'>'} M/S {'>'} Glue {'>'} Neuro-Drive {'>'} Limiter {'>'} Brickwall
            </p>
          </div>

          {/* Execute button */}
          <button
            type="button"
            onClick={onExecute}
            disabled={isMastering}
            className={`w-full py-5 min-h-[64px] rounded-2xl font-extrabold text-lg uppercase tracking-widest transition-all active:scale-[0.98] touch-manipulation ${
              isMastering
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'btn-primary text-lg animate-pulse-glow'
            }`}
          >
            {isMastering
              ? (ja ? 'Processing...' : 'Processing...')
              : (ja ? 'AI Mastering' : 'Execute AI Mastering')}
          </button>

          {/* Free badge */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-[10px] font-bold text-success">
              {ja ? '無料 -- 試聴まで課金なし' : 'FREE -- No charge until download'}
            </span>
          </div>

          {onChooseOtherFile && (
            <button
              type="button"
              onClick={onChooseOtherFile}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-center"
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
