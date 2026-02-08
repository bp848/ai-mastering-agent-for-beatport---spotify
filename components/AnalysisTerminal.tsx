
import React, { useEffect, useRef } from 'react';
import type { ActionLog } from './Console';

/* ─────────────────────────────────────────────────────────────────
   AnalysisTerminal
   ハッカー映画風のリアルタイムターミナルUI。
   分析・マスタリング処理中に actionLogs をストリーミング表示する。
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
    <div className="w-full bg-black border border-green-900/40 rounded-xl shadow-[0_0_30px_rgba(0,255,0,0.06)] overflow-hidden animate-fade-up">
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-900/30 bg-green-950/20">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-[10px] font-mono text-green-700 uppercase tracking-widest">
          {title ?? 'AI_ENGINE_CORE_V2.1'}
        </span>
        <span className="ml-auto text-[9px] font-mono text-green-900 tabular-nums">
          {logs.length} ops
        </span>
      </div>

      {/* Log Body */}
      <div className="p-4 h-52 sm:h-64 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5 custom-scrollbar">
        {logs.map((log, i) => {
          const color =
            log.status === 'success' ? 'text-green-400' :
            log.status === 'warning' ? 'text-amber-400' :
            log.status === 'error'   ? 'text-red-400'   :
            log.toolCall             ? 'text-cyan-400'   :
                                       'text-green-500/80';
          const toolTag = log.toolCall
            ? <span className="text-green-700 ml-1">[{log.toolCall}]</span>
            : null;

          return (
            <div key={i} className={`${color} ${i === logs.length - 1 ? 'animate-pulse' : ''}`}>
              <span className="text-green-800 mr-1.5">{log.timestamp}</span>
              <span className="text-green-700 mr-1">[{log.phase}]</span>
              {log.message}
              {toolTag}
            </div>
          );
        })}
        {/* Blinking cursor */}
        <div className="text-green-500 mt-1">
          <span className="animate-pulse">{'>'} _</span>
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default AnalysisTerminal;
