import React, { useState } from 'react';
import {
  BrickWall,
  Cloud,
  MapPin,
  Trees,
  Waves,
} from 'lucide-react';
import { MapEffectType } from '../types/draft';

interface MapTraitIconProps {
  effect: MapEffectType | string;
  className?: string;
}

const MAP_CONFIGS: Record<
  string,
  {
    path: string;
    label: string;
    fallbackColor: string;
    FallbackIcon: React.ComponentType<{ className?: string }>;
  }
> = {
  standard: {
    path: '/icons/maps/standard.svg',
    label: 'Standard Map',
    fallbackColor: 'text-slate-400',
    FallbackIcon: MapPin,
  },
  broken_walls: {
    path: '/icons/maps/broken-walls.svg',
    label: 'Broken Walls',
    fallbackColor: 'text-orange-400',
    FallbackIcon: BrickWall,
  },
  dangerous_grass: {
    path: '/icons/maps/dangerous-grass.svg',
    label: 'Dangerous Grass',
    fallbackColor: 'text-emerald-400',
    FallbackIcon: Trees,
  },
  flying_cloud: {
    path: '/icons/maps/flying-cloud.svg',
    label: 'Flying Cloud',
    fallbackColor: 'text-sky-300',
    FallbackIcon: Cloud,
  },
  expanding_rivers: {
    path: '/icons/maps/expanding-river.svg',
    label: 'Expanding River',
    fallbackColor: 'text-blue-400',
    FallbackIcon: Waves,
  },
};

export const MapTraitIcon: React.FC<MapTraitIconProps> = ({
  effect,
  className = 'h-4 w-4',
}) => {
  const [hasError, setHasError] = useState(false);
  const cfg = MAP_CONFIGS[effect] || MAP_CONFIGS.standard;
  const { FallbackIcon } = cfg;

  if (hasError) {
    return <FallbackIcon className={`${className} ${cfg.fallbackColor} shrink-0`} />;
  }

  return (
    <img
      src={cfg.path}
      alt={cfg.label}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0 inline-block`}
    />
  );
};

// Backwards compatibility alias
export const MapEffectIcon = MapTraitIcon;

export const getMapEffectColorTheme = (effect: MapEffectType) => {
  switch (effect) {
    case 'broken_walls':
      return {
        text: 'text-amber-300',
        border: 'border-amber-500/50',
        bg: 'bg-amber-950/40',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
        accent: 'amber',
        tagBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'dangerous_grass':
      return {
        text: 'text-emerald-300',
        border: 'border-emerald-500/50',
        bg: 'bg-emerald-950/40',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
        accent: 'emerald',
        tagBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'flying_cloud':
      return {
        text: 'text-sky-300',
        border: 'border-sky-500/50',
        bg: 'bg-sky-950/40',
        glow: 'shadow-[0_0_12px_rgba(56,189,248,0.35)]',
        accent: 'sky',
        tagBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      };
    case 'expanding_rivers':
      return {
        text: 'text-cyan-300',
        border: 'border-cyan-500/50',
        bg: 'bg-cyan-950/40',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.35)]',
        accent: 'cyan',
        tagBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      };
    case 'standard':
    default:
      return {
        text: 'text-slate-300',
        border: 'border-slate-700',
        bg: 'bg-slate-900/60',
        glow: '',
        accent: 'slate',
        tagBg: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
};
