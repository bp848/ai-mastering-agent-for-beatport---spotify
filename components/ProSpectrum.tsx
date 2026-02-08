
import React, { useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────
   ProSpectrum — Voxengo SPAN 相当の対数スケールスペクトラムアナライザー
   
   - FFT 8192 → 低域の解像度を確保
   - 20 Hz – 22 kHz 対数スケール
   - グリッド + 周波数ラベル + dB グリッド
   - シアングラデーション塗りつぶし + アウトライン
   ───────────────────────────────────────────────────────────────── */

interface Props {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  /** 比較用: true の場合、色をグレーに変える（オリジナル再生中） */
  isOriginal?: boolean;
}

const MIN_FREQ = 20;
const MAX_FREQ = 22050;
const MIN_LOG = Math.log(MIN_FREQ);
const MAX_LOG = Math.log(MAX_FREQ);

/** 周波数グリッド線とラベル */
const GRID_FREQS = [
  { freq: 30,    label: '30'  },
  { freq: 60,    label: '60'  },
  { freq: 125,   label: '125' },
  { freq: 250,   label: '250' },
  { freq: 500,   label: '500' },
  { freq: 1000,  label: '1k'  },
  { freq: 2000,  label: '2k'  },
  { freq: 4000,  label: '4k'  },
  { freq: 8000,  label: '8k'  },
  { freq: 16000, label: '16k' },
];

/** dB 目盛り */
const DB_TICKS = [
  { ratio: 0.125, label: '-6' },
  { ratio: 0.25,  label: '-12' },
  { ratio: 0.50,  label: '-24' },
  { ratio: 0.75,  label: '-36' },
];

const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // 周波数線
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#52525b';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  for (const { freq, label } of GRID_FREQS) {
    const p = (Math.log(freq) - MIN_LOG) / (MAX_LOG - MIN_LOG);
    const x = Math.round(p * w) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.fillText(label, x, h - 4);
  }

  // dB 水平線
  ctx.textAlign = 'left';
  for (const { ratio, label } of DB_TICKS) {
    const y = Math.round(ratio * h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(label + ' dB', 4, y - 3);
  }
};

export const ProSpectrum: React.FC<Props> = ({ analyserRef, isPlaying, isOriginal = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  const draw = useCallback(() => {
    rafRef.current = requestAnimationFrame(draw);

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    if (!dataRef.current || dataRef.current.length !== bufferLength) {
      dataRef.current = new Uint8Array(bufferLength);
    }
    const dataArray = dataRef.current;
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    const sampleRate = analyser.context.sampleRate || 44100;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    // ── Spectrum Path (Log Scale 20 Hz – 22 kHz) ──
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x < w; x++) {
      const percent = x / w;
      const freq = Math.exp(MIN_LOG + (MAX_LOG - MIN_LOG) * percent);
      const index = Math.round((freq / (sampleRate / 2)) * bufferLength);

      if (index < bufferLength) {
        // 隣接 bin を平均して滑らかに（3-bin 移動平均）
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, index - 1); j <= Math.min(bufferLength - 1, index + 1); j++) {
          sum += dataArray[j];
          count++;
        }
        const value = sum / count;
        const y = h - (value / 255) * h;
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    if (isOriginal) {
      gradient.addColorStop(0, 'rgba(161,161,170,0.05)');
      gradient.addColorStop(1, 'rgba(161,161,170,0.4)');
    } else {
      gradient.addColorStop(0, 'rgba(6,182,212,0.08)');
      gradient.addColorStop(1, 'rgba(6,182,212,0.7)');
    }
    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isOriginal ? '#71717a' : '#22d3ee';
    ctx.stroke();
  }, [analyserRef, isOriginal]);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    // 低域解像度確保: FFT 8192
    const analyser = analyserRef.current;
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.85;

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, analyserRef, draw]);

  // 停止時にキャンバスをクリア
  useEffect(() => {
    if (!isPlaying && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx, canvas.width, canvas.height);
        // Idle message
        ctx.fillStyle = '#3f3f46';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▶ Play to activate spectrum analyzer', canvas.width / 2, canvas.height / 2);
      }
    }
  }, [isPlaying]);

  return (
    <div className="w-full rounded-xl bg-black border border-zinc-800 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
          Spectrum Analyzer
        </span>
        <span className="text-[9px] font-mono text-zinc-600">
          FFT 8192 · Log Scale · 20 Hz – 22 kHz
        </span>
      </div>
      <canvas ref={canvasRef} width={800} height={220} className="w-full h-48 sm:h-56 block" />
    </div>
  );
};

export default ProSpectrum;
