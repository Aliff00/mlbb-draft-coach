import React from 'react';

/**
 * Applies a sleek, compact circular drag preview for heroes.
 *
 * Uses the already-rendered circular avatar element inside the dragged item so that
 * the browser's native drag engine captures a real, painted element that persists in
 * the DOM for the duration of the drag.
 *
 * Centers the cursor directly in the middle of the circular avatar so destination slots
 * (lanes, bans) are 100% visible and easy to drop onto.
 */
export function setCustomHeroDragImage(e: React.DragEvent, targetElement?: HTMLElement | null) {
  if (!e.dataTransfer || !e.dataTransfer.setDragImage) return;

  try {
    const el = targetElement || (e.currentTarget as HTMLElement);
    if (!el) return;

    // Search for the circular avatar container within the dragged element
    const circle = (el.querySelector('.rounded-full') as HTMLElement) || el;
    const rect = circle.getBoundingClientRect();
    const halfWidth = rect.width > 0 ? rect.width / 2 : 24;
    const halfHeight = rect.height > 0 ? rect.height / 2 : 24;

    e.dataTransfer.setDragImage(circle, halfWidth, halfHeight);
  } catch (err) {
    console.warn('Custom drag preview unavailable:', err);
  }
}
