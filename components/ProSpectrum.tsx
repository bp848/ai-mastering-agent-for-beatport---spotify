
import React, { useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────
   ProSpectrum — Cyberpunk-grade Log-Scale Spectrum Analyzer
   
   - FFT 8192, 20 Hz – 22 kHz log scale
   - Cyberpunk gradient fill (top opaque → bottom transparent)
   - White glow peak line (1px + shadow)
   - Ultra-thin grid lines (0.5px) for instrument-grade precision
   ───────────────────────────────────────────────────────────────── */

interface Props {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  isOriginal?: boolean;
}

const MIN_FREQ = 20;
const MAX_FREQ = 22050;
const MIN_LOG = Math.log(MIN_FREQ);
const MAX_LOG = Math.log(MAX_FREQ);

const DB_FLOOR = -90;
const DB_CEIL  =   0;
const DB_RANGE = DB_CEIL - DB_FLOOR;

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

const DB_TICKS = [-10, -20, -30, -40, -50, -60, -70, -80].map(db => ({
  ratio: (DB_CEIL - db) / DB_RANGE,
  label: String(db),
}));

const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // Ultra-thin grid for instrument feel
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = '#1a1a1f';
  ctx.fillStyle = '#3f3f46';
  ctx.font = '9px "JetBrains Mono", monospace';
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

  // dB lines
  ctx.textAlign = 'left';

  // 0 dBFS reference line (brighter)
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(w, 0.5);
  ctx.stroke();
  ctx.fillStyle = '#52525b';
  ctx.fillText('0 dBFS', 4, 10);

  ctx.strokeStyle = '#1a1a1f';
  ctx.fillStyle = '#3f3f46';
  ctx.lineWidth = 0.5;
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

    // Background — rich black
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    // ── Build spectrum path ──
    const points: { x: number; y: number }[] = [];
    for (let x = 0; x < w; x++) {
      const percent = x / w;
      const freq = Math.exp(MIN_LOG + (MAX_LOG - MIN_LOG) * percent);
      const index = Math.round((freq / (sampleRate / 2)) * bufferLength);

      if (index < bufferLength) {
        // 5-bin weighted average for smoother curves
        let sum = 0, weight = 0;
        for (let j = Math.max(0, index - 2); j <= Math.min(bufferLength - 1, index + 2); j++) {
          const w2 = 1.0 - Math.abs(j - index) * 0.3;
          sum += dataArray[j] * w2;
          weight += w2;
        }
        const value = sum / weight;
        const y = h - (value / 255) * h;
        points.push({ x, y });
      }
    }

    if (points.length === 0) return;

    // ── Gradient fill (top opaque → bottom transparent) ──
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);

    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isOriginal) {
      fillGrad.addColorStop(0, 'rgba(161,161,170,0.25)');
      fillGrad.addColorStop(0.4, 'rgba(161,161,170,0.08)');
      fillGrad.addColorStop(1, 'rgba(161,161,170,0.0)');
    } else {
      fillGrad.addColorStop(0, 'rgba(6,182,212,0.5)');
      fillGrad.addColorStop(0.3, 'rgba(6,182,212,0.15)');
      fillGrad.addColorStop(0.7, 'rgba(6,182,212,0.03)');
      fillGrad.addColorStop(1, 'rgba(6,182,212,0.0)');
    }
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // ── Peak line (white, thin, glowing) ──
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineWidth = 1;
    if (isOriginal) {
      ctx.strokeStyle = 'rgba(161,161,170,0.6)';
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#22d3ee';
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Secondary glow line (cyan, wider, behind) ──
    if (!isOriginal) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) ctx.moveTo(points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(34,211,238,0.3)';
      ctx.stroke();
    }
  }, [analyserRef, isOriginal]);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const analyser = analyserRef.current;
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.85;
    analyser.minDecibels = DB_FLOOR;
    analyser.maxDecibels = DB_CEIL;
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, analyserRef, draw]);

  useEffect(() => {
    if (!isPlaying && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#08080c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx, canvas.width, canvas.height);
        ctx.fillStyle = '#27272a';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▶ Play to activate spectrum analyzer', canvas.width / 2, canvas.height / 2);
      }
    }
  }, [isPlaying]);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/40 bg-zinc-950/80">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
          Spectrum Analyzer
        </span>
        <span className="text-[9px] font-mono text-zinc-700">
          FFT 8192 · Log Scale · 20 Hz – 22 kHz
        </span>
      </div>
      <div style={{ border: '1px solid #27272a' }}>
        <canvas ref={canvasRef} width={800} height={240} className="w-full h-52 sm:h-60 block" />
      </div>
    </div>
  );
};

export default ProSpectrum;
