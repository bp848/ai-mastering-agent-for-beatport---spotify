
import React from 'react';
import type { MetricStatus } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface MetricCardProps {
  title: string;
  value: string;
  numValue: number;
  status: MetricStatus;
  target: string;
  min?: number;
  max?: number;
}

const statusStyles = {
    good: {
        icon: <CheckCircleIcon />,
        color: 'emerald',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        textColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
    },
    warning: {
        icon: <ExclamationTriangleIcon />,
        color: 'yellow',
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',
        textColor: 'text-yellow-400',
        barColor: 'bg-yellow-500',
    },
    bad: {
        icon: <XCircleIcon />,
        color: 'red',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        textColor: 'text-red-400',
        barColor: 'bg-red-500',
    },
    neutral: {
        icon: null,
        color: 'gray',
        glow: '',
        textColor: 'text-white',
        barColor: 'bg-gray-500',
    }
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, numValue, status, target, min = -20, max = 0 }) => {
  const styles = statusStyles[status];
  const { t } = useTranslation();
  
  // ゲージのパーセンテージ計算
  const percentage = Math.min(100, Math.max(0, ((numValue - min) / (max - min)) * 100));

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#1e1e1e] to-[#141414] p-5 rounded-2xl border border-white/5 ${styles.glow} transition-all duration-500 group`}>
      {/* Background decoration */}
      <div className={`absolute -right-4 -top-4 w-16 h-16 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 ${styles.textColor}`}>
        {styles.icon}
      </div>

      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{title}</p>
        {styles.icon && <div className={`w-4 h-4 ${styles.textColor}`}>{styles.icon}</div>}
      </div>
      
      <div className="mb-4">
        <p className={`text-3xl font-mono font-black tracking-tighter ${styles.textColor}`}>{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9px] text-gray-600 font-bold uppercase">{t('analysis.label.target')}</span>
          <p className="text-[10px] font-mono text-gray-400 font-bold">{target}</p>
        </div>
      </div>

      {/* Visual Gauge */}
      <div className="relative w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`absolute h-full ${styles.barColor} transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
          style={{ width: `${percentage}%` }}
        />
        {/* Subtle markers */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
          {[...Array(5)].map((_, i) => <div key={i} className="w-[1px] h-full bg-white" />)}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
