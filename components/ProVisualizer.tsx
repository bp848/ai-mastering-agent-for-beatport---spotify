
import React, { useEffect, useRef, useState } from 'react';

interface ProVisualizerProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
}

export const ProVisualizer: React.FC<ProVisualizerProps> = ({ analyserRef, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gainReduction, setGainReduction] = useState(0);

  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current || !isPlaying) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;
    let grCurrent = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      // --- 1. Gain Reduction (simulated from level) ---
      let rms = 0;
      for (let i = 0; i < bufferLength; i += 10) rms += dataArray[i];
      rms = rms / (bufferLength / 10);
      const threshold = 180;
      let targetGR = 0;
      if (rms > threshold) targetGR = Math.min(15, (rms - threshold) / 5);
      grCurrent += (targetGR - grCurrent) * 0.1;
      setGainReduction((prev) => (Math.abs(prev - grCurrent) < 0.5 ? prev : grCurrent));

      // --- 2. Background ---
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // --- 3. Mid/Side Spectrum ---
      const minLog = Math.log(20);
      const maxLog = Math.log(22050);
      const sampleRate = analyser.context.sampleRate || 44100;

      // Side (purple fill, background)
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < w; i += 2) {
        const percent = i / w;
        const freq = Math.exp(minLog + (maxLog - minLog) * percent);
        const index = Math.floor((freq / (sampleRate / 2)) * bufferLength);
        if (index < bufferLength) {
          const val = dataArray[index];
          const sideVal = val * (i > w / 3 ? 0.8 : 0.4);
          const y = h - (sideVal / 255) * h;
          ctx.lineTo(i, y);
        }
      }
      ctx.lineTo(w, h);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fill();

      // Mid (cyan line, foreground)
      ctx.beginPath();
      ctx.moveTo(0, h);
      let vocalPeak = 0;

      for (let i = 0; i < w; i += 2) {
        const percent = i / w;
        const freq = Math.exp(minLog + (maxLog - minLog) * percent);
        const index = Math.floor((freq / (sampleRate / 2)) * bufferLength);
        if (index < bufferLength) {
          const val = dataArray[index];
          const y = h - (val / 255) * h;
          ctx.lineTo(i, y);
          if (freq > 1000 && freq < 3000 && val > vocalPeak) vocalPeak = val;
        }
      }
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // --- 4. Vocal clip warning ---
      if (vocalPeak > 245) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('⚠️ CLIP DETECTED', w - 120, 20);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyserRef, isPlaying]);

  return (
    <div className="relative w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-8 bg-black/40 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[12px] text-zinc-300 font-mono tracking-widest">M/S ANALYZER</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-purple-400 font-mono">SIDE (WIDTH)</span>
          <span className="text-[10px] text-cyan-400 font-mono">MID (VOCAL)</span>
        </div>
      </div>

      <canvas ref={canvasRef} width={800} height={240} className="w-full h-56 block" />

      <div className="absolute bottom-4 right-4 w-32 h-16 bg-black/80 border border-white/10 rounded-lg p-2">
        <p className="text-[8px] text-zinc-500 text-center mb-1">GLUE (GR)</p>
        <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-75 ease-out"
            style={{ width: `${Math.min(100, gainReduction * 5)}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-zinc-600 mt-1 font-mono">
          <span>-12</span>
          <span>-6</span>
          <span>0</span>
        </div>
      </div>
    </div>
  );
};

export default ProVisualizer;
