import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  amplitude?: number; // 0 to 100
  barCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  amplitude = 30,
  barCount = 18
}) => {
  return (
    <div className="flex items-center gap-1 h-8 px-3">
      {Array.from({ length: barCount }).map((_, i) => {
        const height = isActive
          ? Math.max(4, Math.sin((i / barCount) * Math.PI) * (amplitude * 0.3) + Math.random() * 8)
          : 3;

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              isActive
                ? 'bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_6px_#00f0ff]'
                : 'bg-zinc-700'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
