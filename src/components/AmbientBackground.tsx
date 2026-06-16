import React from 'react';

interface AmbientBackgroundProps {
  variant?: 'orange' | 'purple' | 'cyan' | 'multi';
  intensity?: 'subtle' | 'medium' | 'strong';
}

export default function AmbientBackground({ variant = 'multi', intensity = 'subtle' }: AmbientBackgroundProps) {
  const opacityMap = {
    subtle: { blob: 0.08, grid: 0.025 },
    medium: { blob: 0.15, grid: 0.04 },
    strong: { blob: 0.25, grid: 0.06 },
  };
  const op = opacityMap[intensity];

  const blobs = variant === 'multi' ? (
    <>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-500 rounded-full blur-[120px]" style={{ opacity: op.blob }} />
      <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-purple-500 rounded-full blur-[120px]" style={{ opacity: op.blob * 0.75 }} />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-blue-500 rounded-full blur-[120px]" style={{ opacity: op.blob * 0.75 }} />
    </>
  ) : variant === 'orange' ? (
    <>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-500 rounded-full blur-[120px]" style={{ opacity: op.blob }} />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-500 rounded-full blur-[120px]" style={{ opacity: op.blob * 0.6 }} />
    </>
  ) : variant === 'purple' ? (
    <>
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[120px]" style={{ opacity: op.blob }} />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-pink-500 rounded-full blur-[120px]" style={{ opacity: op.blob * 0.6 }} />
    </>
  ) : (
    <>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500 rounded-full blur-[120px]" style={{ opacity: op.blob }} />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500 rounded-full blur-[120px]" style={{ opacity: op.blob * 0.6 }} />
    </>
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {blobs}
      <div className="absolute inset-0" style={{
        opacity: op.grid,
        backgroundImage: 'linear-gradient(rgba(24,24,27,1) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
    </div>
  );
}
