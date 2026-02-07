
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import type { FrequencyData } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface FrequencyChartProps {
  data: FrequencyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    const { t } = useTranslation();
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a] text-white p-3 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{label} Hz</p>
                <p className="text-sm font-mono font-bold">Level: {payload[0].value.toFixed(1)} dB</p>
            </div>
        );
    }
    return null;
};

const FrequencyChart: React.FC<FrequencyChartProps> = ({ data }) => {
  const { t } = useTranslation();
  
  // 色のグラデーション設定
  const getBarColor = (name: string) => {
    if (name.includes('20-60') || name.includes('60-250')) return '#10b981'; // Bass
    if (name.includes('250-1k') || name.includes('1k-4k')) return '#3b82f6'; // Mids
    return '#a855f7'; // Highs
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#4a4a4a', fontWeight: 'bold' }} 
          fontSize={9} 
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis 
          tick={{ fill: '#4a4a4a', fontWeight: 'bold' }} 
          fontSize={9} 
          domain={[-60, 0]} 
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
        <Bar dataKey="level" radius={[4, 4, 0, 0]} filter="url(#glow)">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default FrequencyChart;
