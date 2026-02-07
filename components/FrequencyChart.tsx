
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
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">{label} Hz</p>
                <p className="text-sm font-mono font-bold">Level: {payload[0].value.toFixed(1)} dB</p>
            </div>
        );
    }
    return null;
};

const FrequencyChart: React.FC<FrequencyChartProps> = ({ data }) => {
  const getBarColor = (name: string) => {
    if (name.includes('20-60') || name.includes('60-250')) return '#22d3ee';
    if (name.includes('250-1k') || name.includes('1k-4k')) return '#67e8f9';
    return '#a78bfa';
  };

  const height = 260;

  return (
    <div className="w-full" style={{ minWidth: 0, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            dy={4}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            domain={[-60, 0]}
            ticks={[-60, -45, -30, -15, 0]}
            tickFormatter={(v) => `${v} dB`}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          <Bar dataKey="level" radius={[4, 4, 0, 0]} barSize={32} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyChart;
