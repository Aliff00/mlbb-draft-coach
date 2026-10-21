import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const LANES_DIR = path.join(rootDir, 'public', 'icons', 'lanes');
const MAPS_DIR = path.join(rootDir, 'public', 'icons', 'maps');

// 1. Official Moonton Lane SVGs from GMS CDN
const OFFICIAL_LANE_URLS = {
  'gold.svg': 'https://akmweb.youngjoygame.com/web/gms/image/91f817c656908a83c2e24eecb3b70986.svg',
  'exp.svg': 'https://akmweb.youngjoygame.com/web/gms/image/6a246099f7eb83a8856306d8b4c84fc2.svg',
  'mid.svg': 'https://akmweb.youngjoygame.com/web/gms/image/facab1eacb218d767b5acb80304bfafd.svg',
  'jungle.svg': 'https://akmweb.youngjoygame.com/web/gms/image/de611167c7310681135f0b4198137bfa.svg',
  'roam.svg': 'https://akmweb.youngjoygame.com/web/gms/image/a3dbb075b4d8186c29f02f7d47da236a.svg',
};

// 2. High-Quality Vector SVGs for Map Traits
const MAP_TRAIT_SVGS = {
  'standard.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="#0b1329"/>
  <path d="M24 6L40 15V33L24 42L8 33V15L24 6Z" stroke="#94a3b8" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24 16L32 20.5V29.5L24 34L16 29.5V20.5L24 16Z" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
  <circle cx="24" cy="25" r="3.5" fill="#e2e8f0"/>
  <path d="M8 15L24 25L40 15M24 25V42" stroke="#475569" stroke-width="2"/>
</svg>`,

  'broken-walls.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="#241208"/>
  <path d="M8 12H20V22H8V12ZM24 12H40V22H24V12ZM8 26H16V36H8V26ZM32 26H40V36H32V26Z" fill="#78350f" stroke="#f97316" stroke-width="2.2" stroke-linejoin="round"/>
  <!-- Crack / Breached Corridor -->
  <path d="M18 24L22 30L26 23L30 38" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="22" cy="30" r="1.5" fill="#fff"/>
  <path d="M19 14L22 19L27 15" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  'dangerous-grass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="#061c12"/>
  <!-- Bush & Ambush Grass Blades -->
  <path d="M12 38C12 28 17 20 22 14C23 22 25 28 27 38" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
  <path d="M24 38C24 24 29 12 36 8C35 18 35 28 32 38" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <path d="M6 38C7 30 11 24 16 20C15 27 15 33 14 38" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M30 38C32 30 37 24 42 22C39 29 38 34 37 38" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="22" cy="14" r="2" fill="#6ee7b7"/>
  <circle cx="36" cy="8" r="2.5" fill="#a7f3d0"/>
</svg>`,

  'flying-cloud.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="#081829"/>
  <!-- Speed Wind Streams -->
  <path d="M6 16H24M10 22H32M8 28H20" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Launchpad Cloud -->
  <path d="M22 34H37C40.3137 34 43 31.3137 43 28C43 24.85 40.57 22.26 37.45 22.03C36.93 16.92 32.61 13 27.35 13C23.47 13 20.09 15.13 18.3 18.32C17.72 18.11 17.1 18 16.45 18C13.44 18 11 20.44 11 23.45C11 23.95 11.07 24.43 11.2 24.89C9.33 25.68 8 27.54 8 29.7C8 32.08 9.92 34 12.3 34H22Z" fill="#0369a1" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
  <!-- Speed Arrow -->
  <path d="M28 26L34 22L28 18" stroke="#e0f2fe" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  'expanding-river.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10" fill="#041a2f"/>
  <!-- Accelerating River Waves -->
  <path d="M6 14C12 11 18 17 24 14C30 11 36 17 42 14" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
  <path d="M6 24C12 21 18 27 24 24C30 21 36 27 42 24" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M6 34C12 31 18 37 24 34C30 31 36 37 42 34" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
  <!-- Current Flow Arrows -->
  <path d="M36 21L41 24L36 27" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="18" cy="27" r="1.5" fill="#a5f3fc"/>
</svg>`,
};

async function main() {
  console.log('🚀 Downloading and setting up official MLBB Lane & Map Trait icons...');
  await fs.promises.mkdir(LANES_DIR, { recursive: true });
  await fs.promises.mkdir(MAPS_DIR, { recursive: true });

  // 1. Download official Lane icons
  for (const [filename, url] of Object.entries(OFFICIAL_LANE_URLS)) {
    const dest = path.join(LANES_DIR, filename);
    try {
      const res = await fetch(url);
      if (res.ok) {
        let svgContent = await res.text();
        // Tighten viewBox to eliminate empty sprite margins so graphic touches container borders
        svgContent = svgContent.replace(/viewBox="0 0 100 100"/, 'viewBox="25 25 50 50"');
        await fs.promises.writeFile(dest, svgContent, 'utf-8');
        console.log(`✅ Saved lane icon: public/icons/lanes/${filename}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to download ${filename} from ${url}:`, err.message);
    }
  }

  // 2. Write official Map Trait icons
  for (const [filename, svgContent] of Object.entries(MAP_TRAIT_SVGS)) {
    const dest = path.join(MAPS_DIR, filename);
    await fs.promises.writeFile(dest, svgContent.trim(), 'utf-8');
    console.log(`✅ Saved map icon: public/icons/maps/${filename}`);
  }

  console.log('🎉 All icons successfully installed in public/icons/lanes and public/icons/maps!');
}

main().catch((err) => {
  console.error('❌ Failed to fetch icons:', err);
  process.exit(1);
});

