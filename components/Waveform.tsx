
import React from 'react';

interface WaveformProps {
    data: number[];
}

const Waveform: React.FC<WaveformProps> = ({ data }) => {
    const width = 1200;
    const height = 180;
    const barWidth = width / Math.max(data.length, 1);

    return (
        <div className="relative w-full overflow-hidden rounded-lg">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
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
                            width={Math.max(1, barWidth * 0.75)}
                            height={barHeight}
                            fill="url(#waveGradient)"
                            rx={2}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default Waveform;
