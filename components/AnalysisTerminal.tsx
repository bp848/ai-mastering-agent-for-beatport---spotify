
import React, { useEffect, useRef } from 'react';
import type { ActionLog } from './Console';

/* ─────────────────────────────────────────────────────────────────
   AnalysisTerminal — "Active Terminal" with CRT scanlines
   
   - VST-grade terminal display with scanline overlay
   - Animated header bar with process name + status
   - Status-coded log entries with blinking block cursor
   ───────────────────────────────────────────────────────────────── */

interface Props {
  logs: ActionLog[];
  title?: string;
}

const AnalysisTerminal: React.FC<Props> = ({ logs, title }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden animate-fade-up"
      style={{
        background: '#0a0a0f',
        border: '1px solid rgba(34,197,94,0.15)',
        boxShadow: '0 0 40px rgba(0,255,0,0.04), inset 0 0 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Header Bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-green-900/25" style={{ background: 'rgba(34,197,94,0.04)' }}>
        <div className="w-2 h-2 rounded-full bg-red-500/70" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
        <div className="w-2 h-2 rounded-full bg-green-500/70" />
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-[10px] font-mono text-green-600 uppercase tracking-[0.2em]">
            {title ?? 'AI_CORE_PROCESS_V2.1'}
          </span>
          <span className="text-[9px] font-mono text-green-800">
            //
          </span>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-green-500 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            RUNNING
          </span>
        </div>
        <span className="text-[9px] font-mono text-green-900 tabular-nums">
          {logs.length} ops
        </span>
      </div>

      {/* ── Log Body with scanline overlay ── */}
      <div className="relative">
        {/* Scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Subtle vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
          }}
        />

        <div className="p-4 h-56 sm:h-68 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5 custom-scrollbar relative z-0">
          {logs.map((log, i) => {
            const isLast = i === logs.length - 1;
            const color =
              log.status === 'success' ? 'text-green-400' :
              log.status === 'warning' ? 'text-amber-400' :
              log.status === 'error'   ? 'text-red-400'   :
              log.toolCall             ? 'text-cyan-400'   :
                                         'text-green-500/80';
            const toolTag = log.toolCall
              ? <span className="text-green-700/80 ml-1">[{log.toolCall}]</span>
              : null;

            return (
              <div
                key={i}
                className={`${color} transition-opacity duration-300 ${isLast ? 'opacity-100' : 'opacity-80'}`}
              >
                <span className="text-green-800/60 mr-1.5 text-[10px]">{log.timestamp}</span>
                <span className="text-green-700/70 mr-1 text-[10px]">[{log.phase}]</span>
                {log.message}
                {toolTag}
                {log.status === 'success' && <span className="ml-1.5 text-green-600">✓</span>}
              </div>
            );
          })}
          {/* Block cursor (blinking) */}
          <div className="text-green-500 mt-2 flex items-center gap-1">
            <span className="text-green-700 text-[10px]">{'>'}</span>
            <span
              className="inline-block w-2 h-4 bg-green-500"
              style={{ animation: 'blink-cursor 1s step-end infinite' }}
            />
          </div>
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default AnalysisTerminal;
