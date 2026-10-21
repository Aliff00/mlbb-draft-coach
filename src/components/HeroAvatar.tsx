import React, { useState } from 'react';
import { Hero, HeroRole } from '../types/draft';
import { getHeroBannerPosition } from '../data/heroBannerPositions';

interface HeroAvatarProps {
  hero: Hero;
  alt?: string;
  className?: string;
  grayscale?: boolean;
  variant?: 'icon' | 'banner';
  style?: React.CSSProperties;
}

// Role-based gradient accents for initials fallback
const ROLE_GRADIENTS: Record<HeroRole, string> = {
  FIGHTER: 'from-amber-600 to-red-700 text-amber-200 border-amber-500/50',
  MAGE: 'from-purple-600 to-indigo-800 text-purple-200 border-purple-500/50',
  MARKSMAN: 'from-yellow-500 to-amber-700 text-yellow-100 border-yellow-500/50',
  ASSASSIN: 'from-rose-600 to-pink-800 text-rose-200 border-rose-500/50',
  TANK: 'from-sky-600 to-blue-800 text-sky-200 border-sky-500/50',
  SUPPORT: 'from-emerald-600 to-teal-800 text-emerald-200 border-emerald-500/50',
};

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  hero,
  alt,
  className = '',
  grayscale = false,
  variant = 'icon',
  style,
}) => {
  const [useFallbackAvatar, setUseFallbackAvatar] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawPrimaryRole = String(hero.role || hero.roles?.[0] || 'FIGHTER').toUpperCase() as HeroRole;
  const roleStyle = ROLE_GRADIENTS[rawPrimaryRole] || ROLE_GRADIENTS.FIGHTER;

  // Extract initials (e.g., "Yu Zhong" -> "YZ", "Miya" -> "MI")
  const initials = hero.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const primarySrc =
    variant === 'banner'
      ? hero.banner || hero.image || hero.avatar
      : hero.avatar || hero.image || hero.banner;

  const imageSrc = useFallbackAvatar ? hero.avatar || hero.image : primarySrc;

  if (hasError || !imageSrc) {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${roleStyle} font-black tracking-wider uppercase select-none ${className}`}
        title={`${hero.name} (${rawPrimaryRole})`}
      >
        <span className="text-xs sm:text-sm drop-shadow-md">{initials}</span>
        <span className="absolute bottom-0.5 inset-x-0 text-[7px] text-center opacity-80 font-bold truncate px-0.5 normal-case">
          {hero.name}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || hero.name}
      loading="lazy"
      onError={() => {
        if (variant === 'banner' && !useFallbackAvatar && hero.avatar && hero.avatar !== primarySrc) {
          setUseFallbackAvatar(true);
        } else {
          setHasError(true);
        }
      }}
      style={{
        ...(variant === 'banner'
          ? { objectPosition: getHeroBannerPosition(hero) }
          : {}),
        ...style,
      }}
      className={`h-full w-full object-cover ${
        grayscale ? 'grayscale contrast-125' : ''
      } ${className}`}
    />
  );
};

