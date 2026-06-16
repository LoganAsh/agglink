"use client";
import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = '#f97316', height = 50 }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((v, i) => ({ value: v, idx: i }));
  const gradientId = `sparkGradient-${color.replace('#', '')}`;

  return (
    <div style={{ width: '100%', height }} className="pointer-events-none opacity-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
