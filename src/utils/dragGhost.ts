import React from 'react';
import { Hero } from '../types/draft';

/**
 * Creates and applies a sleek, compact circular drag preview token for heroes.
 *
 * Replaces the clumsy, oversized default drag snapshot with a polished 48x48
 * circular avatar framed in glowing amber with a drop shadow, centered directly
 * on the cursor (24px, 24px) so destination slots (lanes, bans) are clearly visible.
 */
export function setCustomHeroDragImage(e: React.DragEvent, hero: Hero) {
  if (!e.dataTransfer || !e.dataTransfer.setDragImage) return;

  const size = 48; // 48px circle
  const center = size / 2;

  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.top = '0px';
  ghost.style.left = '0px';
  ghost.style.zIndex = '-9999';
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.borderRadius = '9999px';
  ghost.style.overflow = 'hidden';
  ghost.style.border = '2px solid #f59e0b'; // amber-500 ring
  ghost.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.75), 0 4px 10px rgba(0, 0, 0, 0.8)';
  ghost.style.backgroundColor = '#020617';
  ghost.style.pointerEvents = 'none';
  ghost.style.display = 'flex';
  ghost.style.alignItems = 'center';
  ghost.style.justifyContent = 'center';

  const imgSrc = hero.avatar || hero.image || hero.banner;

  if (imgSrc) {
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '9999px';
    img.style.display = 'block';
    ghost.appendChild(img);
  } else {
    const initials = (hero.name || '')
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const span = document.createElement('span');
    span.innerText = initials || '★';
    span.style.color = '#fde68a';
    span.style.fontWeight = 'bold';
    span.style.fontSize = '14px';
    span.style.fontFamily = 'sans-serif';
    ghost.appendChild(span);
  }

  document.body.appendChild(ghost);

  try {
    e.dataTransfer.setDragImage(ghost, center, center);
  } catch (err) {
    console.warn('Custom drag preview unavailable:', err);
  }

  // Cleanup ghost element after drag initiation
  setTimeout(() => {
    ghost.remove();
  }, 100);
}
