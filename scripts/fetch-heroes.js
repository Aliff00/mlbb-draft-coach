import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HEROES_DIR = path.join(rootDir, 'public', 'heroes');
const OUTPUT_JSON = path.join(rootDir, 'src', 'data', 'heroes.json');

const OFFICIAL_MAPI_LIST_URL = 'https://mapi.mobilelegends.com/hero/list?language=en';
const OFFICIAL_MAPI_DETAIL_URL = 'https://mapi.mobilelegends.com/hero/detail';
const OFFICIAL_GMS_LIST_URL =
  'https://api.gms.moontontech.com/api/gms/source/2669606/2756564';

const REQUEST_DELAY_MS = 50;

const KNOWN_BANNER_POSITIONS = {
  fanny: 'right 15%',
  ling: 'center top',
  johnson: 'center 30%',
  benedetta: 'center 15%',
  hayabusa: 'center 10%',
  grock: 'center 25%',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRoleLabel(raw) {
  if (!raw) return null;
  const r = String(raw).trim().toUpperCase();
  if (r.includes('TANK')) return 'Tank';
  if (r.includes('FIGHTER') || r.includes('WARRIOR')) return 'Fighter';
  if (r.includes('ASSASSIN')) return 'Assassin';
  if (r.includes('MAGE')) return 'Mage';
  if (r.includes('MARKSMAN') || r.includes('SHOOTER') || r.includes('ARCHER')) return 'Marksman';
  if (r.includes('SUPPORT')) return 'Support';
  return null;
}

function normalizeLaneLabel(raw) {
  if (!raw) return null;
  const l = String(raw).trim().toUpperCase();
  if (l.includes('GOLD')) return 'Gold';
  if (l.includes('EXP')) return 'Exp';
  if (l.includes('MID')) return 'Mid';
  if (l.includes('JUNGLE') || l.includes('JUNGLING')) return 'Jungle';
  if (l.includes('ROAM')) return 'Roam';
  return null;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'https://img.mobilelegends.com/') return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return null;
}

async function hasCwebp() {
  for (const bin of ['/opt/homebrew/bin/cwebp', '/usr/local/bin/cwebp', 'cwebp']) {
    try {
      await execFileAsync(bin, ['-version']);
      return bin;
    } catch {
      // continue
    }
  }
  return null;
}

function isWebpBuffer(buf) {
  return (
    buf.length > 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  );
}

async function downloadAndSaveWebp(urls, destPath, cwebpBin) {
  for (const rawUrl of urls) {
    const url = formatUrl(rawUrl);
    if (!url) continue;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://www.mobilelegends.com/',
        },
      });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 500) continue;

      if (isWebpBuffer(buffer) || !cwebpBin) {
        await fs.promises.writeFile(destPath, buffer);
        return true;
      }

      const tmpSrc = path.join(
        os.tmpdir(),
        `mlbb-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      try {
        await fs.promises.writeFile(tmpSrc, buffer);
        await execFileAsync(cwebpBin, ['-quiet', '-q', '85', tmpSrc, '-o', destPath]);
        return true;
      } catch {
        await fs.promises.writeFile(destPath, buffer);
        return true;
      } finally {
        await fs.promises.unlink(tmpSrc).catch(() => {});
      }
    } catch {
      // try next candidate URL
    }
  }
  return false;
}

async function fetchMapiDetail(heroId) {
  try {
    const res = await fetch(`${OFFICIAL_MAPI_DETAIL_URL}?id=${heroId}&language=en`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.data || !json.data.name) return null;
    return json.data;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Official Moonton MLBB Hero Data & Artwork Pipeline...');
  await fs.promises.mkdir(HEROES_DIR, { recursive: true });
  const cwebpBin = await hasCwebp();

  // 1. Fetch Official MAPI Hero Roster
  const mapiListMap = new Map();
  try {
    console.log(`📡 Fetching hero roster from ${OFFICIAL_MAPI_LIST_URL}...`);
    const res = await fetch(OFFICIAL_MAPI_LIST_URL);
    if (res.ok) {
      const json = await res.json();
      const rows = json?.data || [];
      for (const item of rows) {
        const hid = Number(item.heroid);
        if (hid && item.name) {
          mapiListMap.set(hid, {
            id: hid,
            name: String(item.name).trim(),
            key: formatUrl(item.key),
          });
        }
      }
      console.log(`✅ Loaded ${mapiListMap.size} heroes from mapi.mobilelegends.com/hero/list`);
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch MAPI list:', err.message);
  }

  // 2. Fetch Official Moonton GMS Hero Source (contains all 133 heroes + relationships + high-res art)
  const gmsMap = new Map();
  try {
    console.log(`📡 Fetching full hero metadata from Moonton GMS (${OFFICIAL_GMS_LIST_URL})...`);
    const res = await fetch(OFFICIAL_GMS_LIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSize: 200, pageIndex: 1 }),
    });
    if (res.ok) {
      const json = await res.json();
      const records = json?.data?.records || [];
      for (const rec of records) {
        const d = rec?.data;
        const hid = Number(d?.hero_id || d?.hero?.data?.heroid);
        if (hid) {
          gmsMap.set(hid, d);
        }
      }
      console.log(`✅ Loaded ${gmsMap.size} heroes from Moonton GMS API`);
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch GMS list:', err.message);
  }

  // Build master list of hero IDs
  const allHeroIds = Array.from(
    new Set([...mapiListMap.keys(), ...gmsMap.keys()])
  ).sort((a, b) => a - b);

  console.log(`📋 Total unique official heroes to process: ${allHeroIds.length}`);

  // Pre-build ID -> basic info lookup for resolving counter/synergy IDs
  const heroIdentityById = new Map();
  for (const hid of allHeroIds) {
    const gms = gmsMap.get(hid);
    const mapi = mapiListMap.get(hid);
    const name = (gms?.hero?.data?.name || mapi?.name || `Hero ${hid}`).trim();
    const slug = slugify(name);
    heroIdentityById.set(hid, {
      id: hid,
      slug,
      name,
      avatar: `/heroes/${hid}-icon.webp`,
    });
  }

  // 3. Fetch MAPI Hero Details + Download Icons & Banners with rate-limiting
  const compiledHeroes = [];
  let iconsDownloaded = 0;
  let bannersDownloaded = 0;

  for (let i = 0; i < allHeroIds.length; i++) {
    const hid = allHeroIds[i];
    const identity = heroIdentityById.get(hid);
    const gms = gmsMap.get(hid);
    const mapiBasic = mapiListMap.get(hid);

    // Rate-limited detail fetch from mapi.mobilelegends.com/hero/detail
    const mapiDetail = await fetchMapiDetail(hid);
    await sleep(REQUEST_DELAY_MS);

    const hd = gms?.hero?.data || {};
    const name = identity.name;
    const slug = identity.slug;

    // Extract Roles
    const rawRoles = [
      ...(Array.isArray(hd.sortlabel) ? hd.sortlabel : []),
      mapiDetail?.type,
    ].filter(Boolean);
    const roles = Array.from(
      new Set(rawRoles.map(normalizeRoleLabel).filter(Boolean))
    );
    if (roles.length === 0) roles.push('Fighter');

    // Extract Lanes
    const rawLanes = Array.isArray(hd.roadsortlabel) ? hd.roadsortlabel.filter(Boolean) : [];
    const lanes = Array.from(
      new Set(rawLanes.map(normalizeLaneLabel).filter(Boolean))
    );
    if (lanes.length === 0) {
      // Fallback lane inference from primary role
      const primary = roles[0];
      if (primary === 'Marksman') lanes.push('Gold');
      else if (primary === 'Mage') lanes.push('Mid');
      else if (primary === 'Assassin') lanes.push('Jungle');
      else if (primary === 'Support' || primary === 'Tank') lanes.push('Roam');
      else lanes.push('Exp');
    }

    // Extract Specialties
    const specialties = Array.isArray(hd.speciality)
      ? hd.speciality.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const specialty = specialties.length > 0 ? specialties.join(' / ') : roles.join(' / ');
    const lane = lanes.map((l) => `${l} Lane`).join(' / ');

    // Extract Relationships: Counters (strong), Countered By (weak), Synergies (assist)
    const resolveTargetList = (idArray, mapiFallbackObj) => {
      const ids = Array.isArray(idArray)
        ? idArray.map((n) => Number(n)).filter((n) => n > 0 && heroIdentityById.has(n))
        : [];
      if (ids.length === 0 && mapiFallbackObj?.heroid) {
        const fallbackId = Number(mapiFallbackObj.heroid);
        if (fallbackId > 0 && heroIdentityById.has(fallbackId)) {
          ids.push(fallbackId);
        }
      }
      const uniqueIds = Array.from(new Set(ids));
      return uniqueIds.map((targetId) => heroIdentityById.get(targetId));
    };

    const counters = resolveTargetList(
      gms?.relation?.strong?.target_hero_id,
      mapiDetail?.counters?.counters
    );
    const counteredBy = resolveTargetList(
      gms?.relation?.weak?.target_hero_id,
      mapiDetail?.counters?.countered
    );
    const synergies = resolveTargetList(
      gms?.relation?.assist?.target_hero_id,
      mapiDetail?.counters?.best
    );

    const counterTips = {
      counters: stripHtml(
        gms?.relation?.strong?.desc || mapiDetail?.counters?.counters?.restrain_hero_tips || ''
      ),
      counteredBy: stripHtml(
        gms?.relation?.weak?.desc || mapiDetail?.counters?.countered?.by_restrain_tips || ''
      ),
      synergies: stripHtml(
        gms?.relation?.assist?.desc || mapiDetail?.counters?.best?.best_mate_tips || ''
      ),
    };

    // Extract Skills Summary
    const gmsSkillGroup = Array.isArray(hd.heroskilllist) && hd.heroskilllist[0]?.skilllist;
    const mapiSkills = mapiDetail?.skill?.skill;
    const skills = [];

    if (Array.isArray(gmsSkillGroup) && gmsSkillGroup.length > 0) {
      for (const sk of gmsSkillGroup) {
        if (!sk?.skillname) continue;
        skills.push({
          name: String(sk.skillname).trim(),
          tags: Array.isArray(sk.skilltag)
            ? sk.skilltag.map((t) => t?.tagname).filter(Boolean)
            : [],
          description: stripHtml(sk.skilldesc),
        });
      }
    } else if (Array.isArray(mapiSkills) && mapiSkills.length > 0) {
      for (const sk of mapiSkills) {
        if (!sk?.name) continue;
        skills.push({
          name: String(sk.name).trim(),
          tags: [],
          description: stripHtml(sk.des),
        });
      }
    }

    // Extract Ratings / Difficulty
    const ability = Array.isArray(hd.abilityshow) ? hd.abilityshow : [];
    const ratings = {
      durability: Number(ability[0] || mapiDetail?.alive || 50),
      offense: Number(ability[1] || mapiDetail?.phy || 50),
      control: Number(ability[2] || mapiDetail?.mag || 50),
      difficulty: Number(hd.difficulty || ability[3] || mapiDetail?.diff || 50),
    };

    // Download Official Square Icon & High-Res Vertical/Cover Banner
    const iconFilename = `${hid}-icon.webp`;
    const bannerFilename = `${hid}-banner.webp`;
    const iconDest = path.join(HEROES_DIR, iconFilename);
    const bannerDest = path.join(HEROES_DIR, bannerFilename);

    const iconCandidates = [
      gms?.head,
      hd.head,
      mapiBasic?.key,
      hd.squarehead,
    ].filter(Boolean);

    const bannerCandidates = [
      gms?.head_big,
      hd.painting,
      gms?.painting,
      mapiDetail?.cover_picture,
      mapiDetail?.gallery_picture,
      gms?.head,
    ].filter(Boolean);

    if (!fs.existsSync(iconDest)) {
      const ok = await downloadAndSaveWebp(iconCandidates, iconDest, cwebpBin);
      if (ok) iconsDownloaded++;
      await sleep(REQUEST_DELAY_MS);
    }

    if (!fs.existsSync(bannerDest)) {
      const ok = await downloadAndSaveWebp(bannerCandidates, bannerDest, cwebpBin);
      if (ok) bannersDownloaded++;
      await sleep(REQUEST_DELAY_MS);
    }

    compiledHeroes.push({
      id: hid,
      slug,
      name,
      role: roles[0].toUpperCase(),
      roles,
      lanes,
      specialties,
      specialty,
      lane,
      avatar: `/heroes/${iconFilename}`,
      banner: `/heroes/${bannerFilename}`,
      ...(KNOWN_BANNER_POSITIONS[slug] ? { bannerPosition: KNOWN_BANNER_POSITIONS[slug] } : {}),
      image: `/heroes/${bannerFilename}`,
      counters,
      counteredBy,
      synergies,
      counterTips,
      skills,
      ratings,
    });

    if ((i + 1) % 25 === 0 || i + 1 === allHeroIds.length) {
      console.log(
        `⏳ Processed ${i + 1}/${allHeroIds.length} heroes (${name})...`
      );
    }
  }

  // Sort alphabetically by hero name for clean UI presentation
  compiledHeroes.sort((a, b) => a.name.localeCompare(b.name));

  await fs.promises.writeFile(
    OUTPUT_JSON,
    JSON.stringify(compiledHeroes, null, 2),
    'utf-8'
  );

  console.log(`✅ Saved ${compiledHeroes.length} complete heroes to src/data/heroes.json`);
  console.log(
    `🖼️ Downloaded ${iconsDownloaded} new square icons & ${bannersDownloaded} new high-res banners to public/heroes/`
  );
}

main().catch((err) => {
  console.error('❌ Hero pipeline failed:', err);
  process.exit(1);
});
