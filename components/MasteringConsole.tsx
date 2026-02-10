import React, { useEffect, useRef } from 'react';

interface Props {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  /** 親でオーディオグラフが構築済みのとき true。これで analyserRef.current が有効になり描画が始まる */
  graphReady?: boolean;
}

/**
 * FabFilter Pro-Q 3 / Voxengo SPAN 相当の対数スケール精密グリッド付き
 * 周波数アナライザ — 目盛りと数値ラベルでエンジニアリングツールとして使える
 */
export const MasteringConsole: React.FC<Props> = ({ analyserRef, isPlaying, graphReady = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !graphReady || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -70;
    analyser.maxDecibels = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const timeData = new Uint8Array(analyser.fftSize);

    const minLog = Math.log(20);
    const maxLog = Math.log(22050);

    const drawProGrid = () => {
      ctx.lineWidth = 1;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      const freqs = [30, 60, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      const labels: Record<number, string> = {
        30: '30',
        60: '60',
        100: '100',
        200: '200',
        500: '500',
        1000: '1k',
        2000: '2k',
        5000: '5k',
        10000: '10k',
        20000: '20k',
      };

      freqs.forEach((f) => {
        const p = (Math.log(f) - minLog) / (maxLog - minLog);
        const x = p * width;
        ctx.beginPath();
        ctx.strokeStyle =
          f === 1000 || f === 60 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)';
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        if (labels[f]) {
          ctx.fillStyle = '#71717a';
          ctx.fillText(labels[f], x, height - 6);
        }
      });

      const dBs = [0, -6, -12, -24, -36];
      ctx.textAlign = 'right';
      dBs.forEach((db) => {
        let y = 0;
        if (db === 0) y = 10;
        else y = (-db / 60) * height;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillStyle = '#71717a';
        ctx.fillText(`${db}dB`, width - 6, y + 3);
      });
    };

    const dbFloor = analyser.minDecibels;
    const dbCeil = analyser.maxDecibels;
    const dbRange = dbCeil - dbFloor;

    const drawSmoothSpectrum = () => {
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= width; i += 1) {
        const percent = i / width;
        const freq = Math.exp(minLog + (maxLog - minLog) * percent);
        const index = Math.min(Math.floor((freq / 22050) * bufferLength), bufferLength - 1);
        const linear = dataArray[index];
        const db = linear <= 1e-8 ? dbFloor : Math.max(dbFloor, Math.min(dbCeil, 20 * Math.log10(linear)));
        const norm = (db - dbFloor) / dbRange;
        const y = height - norm * height;
        points.push({ x: i, y });
      }
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
      grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const drawVectorScope = () => {
      const cx = width / 2;
      const cy = height / 2;
      const r = 40;
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 128; i++) {
        const v = timeData[i * 2] / 128.0 - 1.0;
        const angle = (i / 64) * Math.PI;
        const radius = r + v * 20;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getFloatFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeData);

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);
      drawProGrid();
      drawSmoothSpectrum();
      drawVectorScope();
    };

    draw();
  }, [analyserRef, isPlaying, graphReady]);

  return (
    <div className="w-full aspect-[21/9] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-3 left-3 flex gap-2 items-center z-10">
        <div
          className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'}`}
        />
        <span className="text-[10px] text-zinc-400 font-mono tracking-widest">
          FREQUENCY ANALYZER <span className="text-zinc-500 font-normal">(dB)</span>
        </span>
      </div>
    </div>
  );
};

export default MasteringConsole;
