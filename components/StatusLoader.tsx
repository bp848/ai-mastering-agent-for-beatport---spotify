import React, { useState, useEffect } from 'react';

type LoaderMode = 'analysis' | 'mastering';

interface Props {
  mode: LoaderMode;
}

const ANALYSIS_TEXTS = [
  '[INIT] Audio data decoding... (24bit Float)',
  '[FFT] Scanning frequency spectrum & phase...',
  '[DETECT] Detecting low-end stereo & muddiness...',
  '[CALC] Calculating LUFS deviation from target...',
  '[DONE] Diagnosis report generated.',
];

const MASTERING_TEXTS = [
  '[BOOT] Initializing Hybrid-Analog Engine...',
  '[APPLY] Tube Saturation + Pultec EQ processing...',
  '[SPACE] M/S stereo field expansion...',
  '[INJECT] Neuro-Drive Module: injecting energy...',
  '[LIMIT] Soft clipper + transient protection...',
  '[EXPORT] Mastering complete.',
];

const TEXTS: Record<LoaderMode, string[]> = {
  analysis: ANALYSIS_TEXTS,
  mastering: MASTERING_TEXTS,
};

export const StatusLoader: React.FC<Props> = ({ mode }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const messages = TEXTS[mode];

  useEffect(() => {
    setCurrentLine(0);
  }, [mode]);

  useEffect(() => {
    if (currentLine >= messages.length - 1) return;
    const delay = mode === 'analysis' ? 1200 : 1500;
    const timer = setTimeout(() => setCurrentLine((prev) => prev + 1), delay);
    return () => clearTimeout(timer);
  }, [currentLine, mode, messages.length]);

  const color = mode === 'analysis' ? 'text-success' : 'text-primary';
  const borderColor = mode === 'analysis' ? 'border-success' : 'border-primary';

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto py-8 animate-fade-up">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className={`absolute inset-0 border-[3px] border-t-transparent rounded-full animate-spin ${borderColor}`} />
        <div className={`absolute inset-2 border-[3px] border-b-transparent rounded-full animate-spin opacity-30 ${borderColor}`} style={{ animationDuration: '2s' }} />
      </div>

      {/* Terminal */}
      <div className="w-full rounded-xl border border-border overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
          <span className="text-[10px] text-muted-foreground ml-2 font-mono">
            {mode === 'analysis' ? 'ANALYSIS_ENGINE' : 'MASTERING_ENGINE'}
          </span>
        </div>
        <div className="p-4 font-mono text-xs min-h-[7rem] flex flex-col-reverse">
          {messages
            .slice(0, currentLine + 1)
            .reverse()
            .map((msg, i) => (
              <div
                key={msg}
                className={`mb-1 transition-opacity duration-300 ${
                  i === 0 ? `${color} font-semibold` : 'text-muted-foreground/60'
                }`}
              >
                <span className="opacity-40 mr-2">{i === 0 ? '>' : '$'}</span>
                {msg}
              </div>
            ))}
        </div>
      </div>

      {/* Caption */}
      <p className="text-muted-foreground text-xs uppercase tracking-widest animate-pulse font-mono">
        {mode === 'analysis' ? 'SCANNING AUDIO DATA...' : 'PROCESSING AUDIO CHAIN...'}
      </p>
    </div>
  );
};

export default StatusLoader;
