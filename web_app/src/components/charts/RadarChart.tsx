'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface TeamStats {
  attack: number;
  defense: number;
  midfield: number;
  form: number;
  setpieces: number;
}

interface RadarChartProps {
  homeStats: TeamStats;
  awayStats: TeamStats;
  theme: 'cinematic' | 'neon' | 'stadium';
}

const CATEGORIES = [
  { key: 'attack', label: 'Attack', angle: -90 },
  { key: 'defense', label: 'Defence', angle: -18 },
  { key: 'setpieces', label: 'Set Pieces', angle: 54 },
  { key: 'form', label: 'Form', angle: 126 },
  { key: 'midfield', label: 'Midfield', angle: 198 },
];

const themeColors = {
  cinematic: {
    home: '#d4af37',
    away: '#6366f1',
    grid: 'rgba(212, 175, 55, 0.2)',
    text: 'rgba(255, 255, 255, 0.7)',
  },
  neon: {
    home: '#00ff88',
    away: '#00d4ff',
    grid: 'rgba(0, 255, 136, 0.15)',
    text: 'rgba(255, 255, 255, 0.6)',
  },
  stadium: {
    home: '#6366f1',
    away: '#f472b6',
    grid: 'rgba(99, 102, 241, 0.2)',
    text: 'rgba(255, 255, 255, 0.7)',
  },
};

export function RadarChart({ homeStats, awayStats, theme }: RadarChartProps) {
  const colors = themeColors[theme];
  const centerX = 120;
  const centerY = 100;
  const maxRadius = 80;

  // Calculate polygon points
  const calculatePoints = (stats: TeamStats, radius: number) => {
    return CATEGORIES.map(({ key, angle }) => {
      const value = stats[key as keyof TeamStats] / 100;
      const rad = (angle * Math.PI) / 180;
      const r = radius * value;
      return {
        x: centerX + r * Math.cos(rad),
        y: centerY + r * Math.sin(rad),
      };
    });
  };

  const homePoints = useMemo(() => calculatePoints(homeStats, maxRadius), [homeStats]);
  const awayPoints = useMemo(() => calculatePoints(awayStats, maxRadius), [awayStats]);

  const pointsToPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid rings
  const gridRings = [0.25, 0.5, 0.75, 1];

  // Label positions
  const labelPositions = CATEGORIES.map(({ label, angle }) => {
    const rad = (angle * Math.PI) / 180;
    const r = maxRadius + 20;
    return {
      label,
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad),
    };
  });

  return (
    <svg viewBox="0 0 240 200" className="w-full h-full">
      {/* Grid */}
      {gridRings.map((scale, i) => {
        const points = CATEGORIES.map(({ angle }) => {
          const rad = (angle * Math.PI) / 180;
          const r = maxRadius * scale;
          return `${centerX + r * Math.cos(rad)},${centerY + r * Math.sin(rad)}`;
        }).join(' ');

        return (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke={colors.grid}
            strokeWidth="1"
          />
        );
      })}

      {/* Grid lines from center */}
      {CATEGORIES.map(({ angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + maxRadius * Math.cos(rad)}
            y2={centerY + maxRadius * Math.sin(rad)}
            stroke={colors.grid}
            strokeWidth="1"
          />
        );
      })}

      {/* Away team polygon (rendered first, behind) */}
      <motion.path
        d={pointsToPath(awayPoints)}
        fill={`${colors.away}30`}
        stroke={colors.away}
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      />

      {/* Home team polygon (on top) */}
      <motion.path
        d={pointsToPath(homePoints)}
        fill={`${colors.home}30`}
        stroke={colors.home}
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      />

      {/* Data points - Home */}
      {homePoints.map((point, i) => (
        <motion.circle
          key={`home-${i}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={colors.home}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
        />
      ))}

      {/* Data points - Away */}
      {awayPoints.map((point, i) => (
        <motion.circle
          key={`away-${i}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={colors.away}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
        />
      ))}

      {/* Labels */}
      {labelPositions.map(({ label, x, y }, i) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize="9"
          fontWeight="500"
        >
          {label.toUpperCase()}
        </text>
      ))}

      {/* Center hexagon glow */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="6"
        fill={theme === 'neon' ? colors.home : colors.grid}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}
