/**
 * ExportModal — マスタリング結果を映像付きでエクスポート
 * オーディオ + 波形ビジュアライゼーションを WebM 動画として出力
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { renderMasteredBuffer } from '../services/audioService';
import type { AudioAnalysisData, MasteringParams } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** オリジナルオーディオバッファ（マスタリング適用して出力） */
  audioBuffer: AudioBuffer | null;
  /** マスタリングパラメータ */
  masteringParams: MasteringParams | null;
  /** 分析データ */
  analysisData: AudioAnalysisData | null;
  /** 出力ファイル名のベース（拡張子なし） */
  fileName?: string;
  language?: 'ja' | 'en';
}

const W = 1280;
const H = 720;
const FPS = 30;

export default function ExportModal({
  isOpen,
  onClose,
  audioBuffer,
  masteringParams,
  analysisData,
  fileName = 'mastered',
  language: langProp,
}: ExportModalProps) {
  const { t, language: ctxLang } = useTranslation();
  const language = langProp ?? ctxLang;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const labelMastered = t('export.video.label_mastered');
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, buffer: AudioBuffer, timeSec: number, duration: number) => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = '#151515';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += W / 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = 0; y <= H; y += H / 10) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();

      if (!buffer || duration <= 0) return;

      const data = buffer.getChannelData(0);
      const numBins = Math.min(512, Math.floor(W / 4));
      const step = data.length / numBins;
      const playhead = timeSec / duration;

      // Waveform (full track, dimmed)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < numBins; i++) {
        const idx = Math.floor(i * step);
        const v = data[idx] ?? 0;
        const x = (i / numBins) * W;
        const y = H / 2 - (v * (H / 2) * 0.8);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Playhead region highlight
      const headX = playhead * W;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 0, headX, H);

      // Playhead line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headX, 0);
      ctx.lineTo(headX, H);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#888';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `${labelMastered} · ${Math.floor(timeSec / 60)}:${(Math.floor(timeSec % 60)).toString().padStart(2, '0')} / ${Math.floor(duration / 60)}:${(Math.floor(duration % 60)).toString().padStart(2, '0')}`,
        24,
        H - 24
      );
    },
    [labelMastered]
  );

  const startExport = useCallback(async () => {
    if (!audioBuffer || !masteringParams || !analysisData || !canvasRef.current) {
      setError(t('export.video.error.no_data'));
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(5);
      const masteredBuffer = await renderMasteredBuffer(audioBuffer, masteringParams, analysisData);
      setProgress(15);

      const canvas = canvasRef.current;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2d context unavailable');

      const duration = masteredBuffer.duration;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = masteredBuffer;
      source.connect(dest);

      const canvasStream = canvas.captureStream(FPS);
      const mixedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/webm';
      const recorder = new MediaRecorder(mixedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
        audioBitsPerSecond: 192_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error('MediaRecorder error'));
        recorder.start(100);
        source.start(0);

        const startTime = performance.now();
        const totalFrames = Math.ceil(duration * FPS);
        let frame = 0;

        const tick = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          const t = Math.min(elapsed, duration);
          drawFrame(ctx, masteredBuffer, t, duration);
          frame++;
          setProgress(Math.min(100, Math.round((frame / totalFrames) * 100)));

          if (elapsed < duration) {
            requestAnimationFrame(tick);
          } else {
            source.stop();
            recorder.stop();
          }
        };
        tick();
      });

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_mastered.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.video.error.failed'));
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [audioBuffer, masteringParams, analysisData, fileName, drawFrame, t]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0a0a0a] border border-[#333] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#333]">
          <h2 id="export-modal-title" className="text-lg font-bold text-white">
            {t('export.video.title')}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {t('export.video.description')}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[#222]">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-full object-contain"
              style={{ maxHeight: 360 }}
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {isExporting && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-[#222] overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">
                {t('export.video.exporting')} {progress}%
              </p>
            </div>
          )}
        </div>

        <div className="p-6 flex items-center justify-end gap-3 border-t border-[#333]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white border border-[#444] hover:border-[#555] disabled:opacity-50"
          >
            {t('export.video.cancel')}
          </button>
          <button
            type="button"
            onClick={startExport}
            disabled={isExporting || !audioBuffer || !masteringParams || !analysisData}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? t('export.video.exporting') : t('export.video.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
