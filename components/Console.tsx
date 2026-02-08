import React, { useEffect, useRef } from 'react';
import { TerminalIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

export interface ActionLog {
  phase: string;
  timestamp: string;
  message: string;
  toolCall?: string;
  status?: 'info' | 'success' | 'warning' | 'error';
}

interface ConsoleProps {
  logs: string[] | ActionLog[];
  compact?: boolean;
}

const Console: React.FC<ConsoleProps> = ({ logs, compact = false }) => {
  const { t, language } = useTranslation();
  const isJa = language === 'ja';
  const consoleEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isActionLog = (log: string | ActionLog): log is ActionLog => {
    return typeof log === 'object' && 'phase' in log;
  };

  const formatLog = (log: string | ActionLog): string => {
    if (isActionLog(log)) {
      const statusColor = log.status === 'success' ? 'text-green-400' :
                         log.status === 'warning' ? 'text-amber-400' :
                         log.status === 'error' ? 'text-red-400' : 'text-cyan-400';
      const toolCall = log.toolCall ? ` [Tool: ${log.toolCall}]` : '';
      return `[${log.phase}] ${log.message}${toolCall}`;
    }
    return log;
  };

  return (
    <section className={compact ? '' : 'mt-6'}>
      <div className="bg-black/60 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-3 p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-cyan-400">
              <TerminalIcon />
            </div>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              {isJa ? 'アクション・コンソール（全行程の透明化）' : 'Action Console (Full Process Transparency)'}
            </h3>
          </div>
          <span className="text-[9px] text-zinc-600 font-mono">
            {logs.length} {isJa ? 'エントリ' : 'entries'}
          </span>
        </div>
        <pre className={`p-3 text-[10px] font-mono overflow-y-auto ${compact ? 'h-32' : 'h-64'} whitespace-pre-wrap break-words`}>
          {logs.map((log, i) => {
            const line = formatLog(log);
            const isAction = isActionLog(log);
            const statusColor = isAction && log.status === 'success' ? 'text-green-400' :
                              isAction && log.status === 'warning' ? 'text-amber-400' :
                              isAction && log.status === 'error' ? 'text-red-400' :
                              isAction && log.toolCall ? 'text-cyan-300' : 'text-zinc-300';
            return (
              <div key={i} className={statusColor}>
                {line}
              </div>
            );
          })}
          <div ref={consoleEndRef} />
        </pre>
      </div>
    </section>
  );
};

export default Console;