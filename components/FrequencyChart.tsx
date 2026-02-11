
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
            <div className="bg-black/90 text-white p-4 border border-cyan-400/40 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest mb-2">{label} Hz</p>
                <p className="text-base font-mono font-bold">Level: {payload[0].value.toFixed(1)} dB</p>
            </div>
        );
    }
    return null;
};

const FrequencyChart: React.FC<FrequencyChartProps> = ({ data }) => {
  const getBarColor = (name: string) => {
    if (name.includes('20-60') || name.includes('60-250')) return '#06b6d4';
    if (name.includes('250-1k') || name.includes('1k-4k')) return '#22d3ee';
    return '#67e8f9';
  };

  const height = 280;

  return (
    <div className="w-full" style={{ minWidth: 0, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.1)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#a5f3fc', fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: 'rgba(34,211,238,0.2)', strokeWidth: 2 }}
            tickLine={{ stroke: 'rgba(34,211,238,0.15)' }}
            dy={6}
          />
          <YAxis
            tick={{ fill: '#a5f3fc', fontSize: 12, fontWeight: 600 }}
            domain={[-60, 0]}
            ticks={[-60, -45, -30, -15, 0]}
            tickFormatter={(v) => `${v} dB`}
            axisLine={{ stroke: 'rgba(34,211,238,0.2)', strokeWidth: 2 }}
            tickLine={{ stroke: 'rgba(34,211,238,0.15)' }}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34, 211, 238, 0.1)' }} />
          <Bar dataKey="level" radius={[6, 6, 0, 0]} barSize={36} maxBarSize={52}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} fillOpacity={1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FrequencyChart;
