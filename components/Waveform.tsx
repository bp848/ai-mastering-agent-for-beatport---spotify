
import React from 'react';

interface WaveformProps {
    data: number[];
}

const Waveform: React.FC<WaveformProps> = ({ data }) => {
    const width = 1000;
    const height = 120;
    const barWidth = width / data.length;

    return (
        <div className="relative w-full overflow-hidden rounded-xl">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {data.map((d, i) => {
                    const barHeight = Math.max(2, d * height);
                    const y = (height - barHeight) / 2;
                    return (
                        <rect
                            key={i}
                            x={i * barWidth}
                            y={y}
                            width={barWidth * 0.7}
                            height={barHeight}
                            fill="url(#waveGradient)"
                            rx={1}
                        />
                    );
                })}
            </svg>
            
            {/* Mirror reflection for extra "richness" */}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto opacity-10 mt-1 scale-y-[-1]" preserveAspectRatio="none">
                 {data.map((d, i) => {
                    const barHeight = Math.max(2, d * height * 0.5);
                    return (
                        <rect
                            key={i}
                            x={i * barWidth}
                            y={0}
                            width={barWidth * 0.7}
                            height={barHeight}
                            fill="#10b981"
                            rx={1}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default Waveform;
