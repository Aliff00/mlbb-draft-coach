import React, { useState } from 'react';
import { Compass, Crosshair, Footprints, Layers, Shield, Sparkles } from 'lucide-react';
import { LaneRole } from '../types/draft';

interface LaneIconProps {
  lane: LaneRole | string;
  className?: string;
  size?: number | string;
}

const LANE_CONFIGS: Record<
  string,
  {
    path: string;
    label: string;
    fallbackColor: string;
    FallbackIcon: React.ComponentType<{ className?: string }>;
  }
> = {
  ALL: {
    path: '',
    label: 'All Lanes',
    fallbackColor: 'text-amber-400',
    FallbackIcon: Layers,
  },
  GOLD: {
    path: '/icons/lanes/gold.svg',
    label: 'Gold Lane',
    fallbackColor: 'text-amber-400',
    FallbackIcon: Crosshair,
  },
  EXP: {
    path: '/icons/lanes/exp.svg',
    label: 'EXP Lane',
    fallbackColor: 'text-blue-400',
    FallbackIcon: Shield,
  },
  MID: {
    path: '/icons/lanes/mid.svg',
    label: 'Mid Lane',
    fallbackColor: 'text-purple-400',
    FallbackIcon: Sparkles,
  },
  JUNGLE: {
    path: '/icons/lanes/jungle.svg',
    label: 'Jungle',
    fallbackColor: 'text-emerald-400',
    FallbackIcon: Compass,
  },
  ROAM: {
    path: '/icons/lanes/roam.svg',
    label: 'Roam',
    fallbackColor: 'text-cyan-400',
    FallbackIcon: Footprints,
  },
};

function normalizeLaneKey(raw: string): string {
  const upper = String(raw || '').toUpperCase().trim();
  if (upper === 'ALL' || upper.includes('ALL')) return 'ALL';
  if (upper.includes('GOLD')) return 'GOLD';
  if (upper.includes('EXP')) return 'EXP';
  if (upper.includes('MID')) return 'MID';
  if (upper.includes('JUNGLE') || upper.includes('JUNGLING')) return 'JUNGLE';
  if (upper.includes('ROAM')) return 'ROAM';
  return 'EXP';
}

export const LaneIcon: React.FC<LaneIconProps> = ({
  lane,
  className = 'h-4 w-4',
}) => {
  const [hasError, setHasError] = useState(false);
  const key = normalizeLaneKey(lane);
  const cfg = LANE_CONFIGS[key] || LANE_CONFIGS.EXP;
  const { FallbackIcon } = cfg;

  if (!cfg.path || hasError) {
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

