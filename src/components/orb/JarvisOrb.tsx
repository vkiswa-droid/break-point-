import React, { useEffect, useRef, useState } from 'react';
import { OrbState } from '../../types';

interface JarvisOrbProps {
  state: OrbState;
  audioLevel?: number; // 0 to 100 real audio energy
  onClick?: () => void;
  size?: number;
  isWakeWordDetected?: boolean;
}

export const JarvisOrb: React.FC<JarvisOrbProps> = ({
  state,
  audioLevel = 0,
  onClick,
  size = 320,
  isWakeWordDetected = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wakePulseActive, setWakePulseActive] = useState(false);

  // Trigger brief controlled activation pulse on wake word detection
  useEffect(() => {
    if (isWakeWordDetected || state === 'listening') {
      setWakePulseActive(true);
      const timer = setTimeout(() => setWakePulseActive(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isWakeWordDetected, state]);

  // State-based color scheme tokens
  const stateThemes = {
    idle: {
      primary: '#00f0ff',
      primaryDim: 'rgba(0, 240, 255, 0.16)',
      glow: 'rgba(0, 240, 255, 0.45)',
      secondary: '#0d9488',
      accent: '#38bdf8',
      coreClass: 'animate-core-idle',
      outerSpeed: 'animate-spin-slow',
      innerSpeed: 'animate-spin-reverse-slow',
      label: 'SYSTEM NOMINAL // STANDBY',
      sublabel: 'MONITORING FOR "BREAK POINT"'
    },
    listening: {
      primary: '#34d399',
      primaryDim: 'rgba(52, 211, 153, 0.18)',
      glow: 'rgba(52, 211, 153, 0.55)',
      secondary: '#00f0ff',
      accent: '#6ee7b7',
      coreClass: 'animate-core-listening',
      outerSpeed: 'animate-spin-thinking',
      innerSpeed: 'animate-spin-reverse-thinking',
      label: 'AUDIO INGEST // CAPTURING',
      sublabel: audioLevel > 0 ? `LIVE PCM // ${audioLevel}% ENERGY` : 'LISTENING FOR USER INPUT'
    },
    thinking: {
      primary: '#c084fc',
      primaryDim: 'rgba(192, 132, 252, 0.18)',
      glow: 'rgba(192, 132, 252, 0.55)',
      secondary: '#00f0ff',
      accent: '#a855f7',
      coreClass: 'animate-core-thinking',
      outerSpeed: 'animate-spin-thinking',
      innerSpeed: 'animate-spin-reverse-thinking',
      label: 'NEURAL ROUTER // DELIBERATING',
      sublabel: 'SYNTHESIZING MULTI-AGENT PLAN'
    },
    speaking: {
      primary: '#38bdf8',
      primaryDim: 'rgba(56, 189, 248, 0.18)',
      glow: 'rgba(56, 189, 248, 0.55)',
      secondary: '#0d9488',
      accent: '#2dd4bf',
      coreClass: 'animate-core-speaking',
      outerSpeed: 'animate-spin-slow',
      innerSpeed: 'animate-spin-reverse-slow',
      label: 'VOCAL SYNTHESIS // TRANSMITTING',
      sublabel: 'MODULATING AUDIO RESPONSE'
    },
    alert: {
      primary: '#f87171',
      primaryDim: 'rgba(248, 113, 113, 0.2)',
      glow: 'rgba(239, 68, 68, 0.6)',
      secondary: '#fbbf24',
      accent: '#ef4444',
      coreClass: 'animate-core-alert',
      outerSpeed: 'animate-spin-thinking',
      innerSpeed: 'animate-spin-reverse-slow',
      label: 'SECURITY DIRECTIVE // ALERT',
      sublabel: 'ANOMALY DETECTED IN PIPELINE'
    }
  };

  const theme = stateThemes[state] || stateThemes.idle;

  // Particle & Audio-Reactive Waveform Canvas (Optimized for Low-RAM Windows)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let animationId: number;
    let tick = 0;

    // Light-weight 24-particle orbital system
    const particles = Array.from({ length: 24 }, (_, i) => ({
      orbitRadius: (size * 0.22) + ((i % 3) * (size * 0.08)),
      speed: (0.008 + ((i % 4) * 0.004)) * (i % 2 === 0 ? 1 : -1),
      angle: (i / 24) * Math.PI * 2,
      size: 1 + (i % 3) * 0.6,
      opacity: 0.3 + (i % 5) * 0.14
    }));

    const render = () => {
      // Skip render work if minimized or tab hidden
      if (document.hidden) {
        animationId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      tick += 1;

      // 1. Orbital Micro-Particles
      particles.forEach((p) => {
        const speedMultiplier = state === 'thinking' ? 2.5 : state === 'listening' ? 1.6 : 1.0;
        p.angle += p.speed * speedMultiplier;

        const x = centerX + Math.cos(p.angle) * p.orbitRadius;
        const y = centerY + Math.sin(p.angle) * p.orbitRadius;

        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = p.opacity * (0.6 + Math.sin(tick * 0.05 + p.angle) * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Real Audio-Reactive Perimeter (Only when listening and audioLevel > 0)
      if (state === 'listening' && audioLevel > 0) {
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        const baseRadius = size * 0.36;
        const segments = 48;

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const energyWave = Math.sin(theta * 8 + tick * 0.1) * (audioLevel * 0.18);
          const r = baseRadius + energyWave;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state, audioLevel, size, theme]);

  const center = size / 2;
  const radiusOuter = size * 0.46;
  const radiusMid = size * 0.38;
  const radiusInner = size * 0.28;

  return (
    <div 
      className="flex flex-col items-center justify-center select-none group cursor-pointer relative"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      aria-label={`BREAK POINT Arc Reactor Core - State: ${state}`}
    >
      {/* Reactor Housing & Multi-Ring SVG Stage */}
      <div 
        className="relative flex items-center justify-center transition-transform duration-300 var(--ease-hud) group-hover:scale-[1.02] active:scale-[0.98]"
        style={{ width: size, height: size }}
      >
        {/* Layer 1: Ambient Backdrop Aura */}
        <div 
          className="absolute inset-4 rounded-full blur-3xl opacity-30 transition-all duration-700 pointer-events-none"
          style={{ background: theme.glow }}
        />

        {/* Wake Word Controlled Activation Pulse Ripple */}
        {wakePulseActive && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-cyan-300/80 pointer-events-none animate-ping"
            style={{ animationDuration: '0.85s' }}
          />
        )}

        {/* Layer 2: Master SVG Holographic Rings */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <radialGradient id="reactorCoreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor={theme.primary} stopOpacity="0.9" />
              <stop offset="70%" stopColor={theme.secondary} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.35" />
              <stop offset="60%" stopColor={theme.primary} stopOpacity="0.05" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background Technical Guidelines & Coordinate Crosshairs */}
          <circle
            cx={center}
            cy={center}
            r={radiusOuter + 8}
            fill="none"
            stroke="rgba(0, 240, 255, 0.08)"
            strokeWidth="1"
          />
          <line
            x1={center - radiusOuter - 14}
            y1={center}
            x2={center - radiusOuter - 2}
            y2={center}
            stroke={theme.primary}
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line
            x1={center + radiusOuter + 2}
            y1={center}
            x2={center + radiusOuter + 14}
            y2={center}
            stroke={theme.primary}
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line
            x1={center}
            y1={center - radiusOuter - 14}
            x2={center}
            y2={center - radiusOuter - 2}
            stroke={theme.primary}
            strokeWidth="1.5"
            opacity="0.6"
          />
          <line
            x1={center}
            y1={center + radiusOuter + 2}
            x2={center}
            y2={center + radiusOuter + 14}
            stroke={theme.primary}
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Layer 3: Concentric Orbital Outer Ring (Clockwise) */}
          <g className={`origin-center ${theme.outerSpeed}`}>
            <circle
              cx={center}
              cy={center}
              r={radiusOuter}
              fill="none"
              stroke={theme.primary}
              strokeWidth="1.8"
              strokeDasharray="6 14 2 14 18 10 32 8"
              opacity="0.75"
            />
            {/* Cardinal Degree Segment Notches */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = center + Math.cos(rad) * (radiusOuter - 4);
              const y1 = center + Math.sin(rad) * (radiusOuter - 4);
              const x2 = center + Math.cos(rad) * (radiusOuter + 4);
              const y2 = center + Math.sin(rad) * (radiusOuter + 4);
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={theme.primary}
                  strokeWidth={deg % 90 === 0 ? '2' : '1'}
                  opacity={deg % 90 === 0 ? '0.9' : '0.45'}
                />
              );
            })}
          </g>

          {/* Layer 4: Segmented Electromagnetic Coil Rails (Counter-Clockwise) */}
          <g className={`origin-center ${theme.innerSpeed}`}>
            <circle
              cx={center}
              cy={center}
              r={radiusMid}
              fill="none"
              stroke={theme.secondary}
              strokeWidth="2.2"
              strokeDasharray="24 16 8 16"
              opacity="0.65"
            />
            {/* Fine Radial Ticks */}
            {Array.from({ length: 24 }).map((_, i) => {
              const rad = (i * Math.PI * 2) / 24;
              const x1 = center + Math.cos(rad) * (radiusMid - 3);
              const y1 = center + Math.sin(rad) * (radiusMid - 3);
              const x2 = center + Math.cos(rad) * (radiusMid + 3);
              const y2 = center + Math.sin(rad) * (radiusMid + 3);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={theme.secondary}
                  strokeWidth="1"
                  opacity="0.5"
                />
              );
            })}
          </g>

          {/* Layer 5: Sweeping Radar Arc */}
          <g className="origin-center animate-radar-sweep">
            <path
              d={`M ${center} ${center} L ${center + radiusMid} ${center} A ${radiusMid} ${radiusMid} 0 0 1 ${center + Math.cos(Math.PI / 3) * radiusMid} ${center + Math.sin(Math.PI / 3) * radiusMid} Z`}
              fill="url(#radarSweepGrad)"
            />
          </g>

          {/* Layer 6: Inner Gyro Ring (Static Fine Frame) */}
          <circle
            cx={center}
            cy={center}
            r={radiusInner}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.2"
            strokeDasharray="4 8"
            opacity="0.5"
          />

          {/* Layer 7: Center Energy Nucleus */}
          <circle
            cx={center}
            cy={center}
            r={size * 0.14}
            fill="url(#reactorCoreGrad)"
            className={theme.coreClass}
          />
          <circle
            cx={center}
            cy={center}
            r={size * 0.055}
            fill="#ffffff"
            opacity="0.95"
            className="filter drop-shadow-[0_0_8px_#ffffff]"
          />
        </svg>

        {/* Canvas for Smooth Micro-Particles & Dynamic Audio Waveform */}
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size }}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* Sleek Technical Telemetry Badge */}
      <div className="mt-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/60 border border-breakpoint-panelBorder shadow-sm backdrop-blur-md">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}
          />
          <span 
            className="text-[11px] font-mono font-semibold tracking-wider uppercase"
            style={{ color: theme.primary }}
          >
            {theme.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">
          {theme.sublabel}
        </span>
      </div>
    </div>
  );
};
