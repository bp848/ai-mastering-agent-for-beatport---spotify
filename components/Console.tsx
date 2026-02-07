import React, { useEffect, useRef } from 'react';
import { TerminalIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface ConsoleProps {
  logs: string[];
}

const Console: React.FC<ConsoleProps> = ({ logs }) => {
  const { t } = useTranslation();
  const consoleEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <section className="mt-8">
      <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 shadow-lg">
        <div className="flex items-center gap-3 p-3 border-b border-gray-700">
          <div className="w-5 h-5 text-gray-400">
            <TerminalIcon />
          </div>
          <h3 className="text-sm font-semibold text-gray-300">{t('console.title')}</h3>
        </div>
        <pre className="p-4 text-xs text-gray-400 font-mono overflow-y-auto h-48 whitespace-pre-wrap break-all">
          {logs.join('\n')}
          <div ref={consoleEndRef} />
        </pre>
      </div>
    </section>
  );
};

export default Console;