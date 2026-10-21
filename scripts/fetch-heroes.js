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
const DATA_DIR = path.join(rootDir, 'public', 'data');
const OUTPUT_JSON = path.join(rootDir, 'src', 'data', 'heroes.json');
const META_OUTPUT_JSON = path.join(DATA_DIR, 'mlbb-meta.json');

const OFFICIAL_MAPI_LIST_URL = 'https://mapi.mobilelegends.com/hero/list?language=en';
const OFFICIAL_MAPI_DETAIL_URL = 'https://mapi.mobilelegends.com/hero/detail';
const OFFICIAL_GMS_LIST_URL =
  'https://api.gms.moontontech.com/api/gms/source/2669606/2756564';
const OFFICIAL_GMS_RANK_7D_URL =
  'https://api.gms.moontontech.com/api/gms/source/2669606/2756569';
const OFFICIAL_GMS_RANK_15D_URL =
  'https://api.gms.moontontech.com/api/gms/source/2669606/2756565';
const OFFICIAL_GMS_RANK_ALL_URL =
  'https://api.gms.moontontech.com/api/gms/source/2669606/2756567';

const REQUEST_DELAY_MS = 30;

const KNOWN_BANNER_POSITIONS = {
  fanny: 'right 15%',
  ling: 'center top',
  johnson: 'center 30%',
  benedetta: 'center 15%',
  hayabusa: 'center 10%',
  grock: 'center 25%',
};

// Known magic-scaling heroes outside of the primary Mage role
const KNOWN_MAGIC_HERO_SLUGS = new Set([
  'uranus',
  'kaja',
  'baxia',
  'edith',
  'gloo',
  'johnson',
  'hylos',
  'gatotkaca',
  'belerick',
  'esmeralda',
  'alice',
  'silvanna',
  'guinevere',
  'natan',
  'kimmy',
  'julian',
  'harith',
  'aamon',
  'gusion',
  'karina',
  'zhask',
  'cyclops',
  'chang-e',
]);

// Heroes whose primary hallmark damage output is True Damage
const KNOWN_TRUE_DAMAGE_SLUGS = new Set([
  'karrie',
  'lesley',
  'alpha',
]);

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

function determineDamageType(slug, roles, specialties = []) {
  if (KNOWN_TRUE_DAMAGE_SLUGS.has(slug)) return 'True';
  const roleList = (roles || []).map((r) => String(r).toLowerCase());
  const specText = (specialties || []).join(' ').toLowerCase();
  if (
    roleList.includes('mage') ||
    specText.includes('magic') ||
    KNOWN_MAGIC_HERO_SLUGS.has(slug)
  ) {
    return 'Magic';
  }
  return 'Physical';
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

/**
 * Fetch Official Moonton GMS Competitive Rank Telemetry
 * Queries Mythical Glory+ (bigrank: "9") for:
 *   - match_type: 0 => Enemy matchups (counters & countered_by)
 *   - match_type: 1 => Teammate matchups (synergies)
 */
async function fetchGmsRankTelemetry(url, bigrank = '9') {
  const result = {
    url,
    bigrank,
    enemyMap: new Map(),
    teammateMap: new Map(),
  };

  try {
    const [resEnemy, resTeammate] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSize: 200,
          pageIndex: 1,
          filters: [
            { field: 'bigrank', operator: 'eq', value: bigrank },
            { field: 'match_type', operator: 'eq', value: 0 },
          ],
        }),
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSize: 200,
          pageIndex: 1,
          filters: [
            { field: 'bigrank', operator: 'eq', value: bigrank },
            { field: 'match_type', operator: 'eq', value: 1 },
          ],
        }),
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    const enemyRecords = resEnemy?.data?.records || [];
    const teammateRecords = resTeammate?.data?.records || [];

    for (const rec of enemyRecords) {
      const d = rec?.data;
      const hid = Number(d?.main_heroid);
      if (hid) result.enemyMap.set(hid, d);
    }

    for (const rec of teammateRecords) {
      const d = rec?.data;
      const hid = Number(d?.main_heroid);
      if (hid) result.teammateMap.set(hid, d);
    }
  } catch (err) {
    console.warn(`⚠️ Warning: GMS Rank fetch failed for ${url}:`, err.message);
  }

  return result;
}

async function main() {
  console.log('🚀 Starting Official Moonton MLBB Competitive Data & Artwork Pipeline...');
  await fs.promises.mkdir(HEROES_DIR, { recursive: true });
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
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

  // 2. Fetch Official Moonton GMS Hero Source (contains all 133 heroes + abilities + skills + high-res art)
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
      console.log(`✅ Loaded ${gmsMap.size} heroes from Moonton GMS Hero Source`);
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch GMS list:', err.message);
  }

  // 3. Fetch Official Moonton GMS Competitive Rank & Matchup Telemetry (Mythical Glory+, 7-day default)
  console.log(`📡 Fetching Mythical Glory+ competitive rank & matchup telemetry (7-Day window)...`);
  let rankTelemetry = await fetchGmsRankTelemetry(OFFICIAL_GMS_RANK_7D_URL, '9');
  let selectedWindow = '7d';

  // Fallback to 15-day or all-time if 7-day is empty
  if (rankTelemetry.enemyMap.size === 0) {
    console.log(`🔄 7-day data unavailable, trying 15-day window...`);
    rankTelemetry = await fetchGmsRankTelemetry(OFFICIAL_GMS_RANK_15D_URL, '9');
    selectedWindow = '15d';
  }
  if (rankTelemetry.enemyMap.size === 0) {
    console.log(`🔄 15-day data unavailable, falling back to standard rank telemetry...`);
    rankTelemetry = await fetchGmsRankTelemetry(OFFICIAL_GMS_RANK_ALL_URL, '9');
    selectedWindow = 'latest';
  }
  console.log(
    `✅ Loaded competitive telemetry for ${rankTelemetry.enemyMap.size} heroes (Rank: Mythical Glory+, Window: ${selectedWindow})`
  );

  // Build master list of hero IDs
  const allHeroIds = Array.from(
    new Set([...mapiListMap.keys(), ...gmsMap.keys(), ...rankTelemetry.enemyMap.keys()])
  ).sort((a, b) => a - b);

  console.log(`📋 Total unique official heroes to process: ${allHeroIds.length}`);

  // Pre-build ID -> basic info lookup for resolving counter/synergy IDs
  const heroIdentityById = new Map();
  for (const hid of allHeroIds) {
    const gms = gmsMap.get(hid);
    const mapi = mapiListMap.get(hid);
    const rankEnemy = rankTelemetry.enemyMap.get(hid);
    const name = (
      gms?.hero?.data?.name ||
      rankEnemy?.main_hero?.data?.name ||
      mapi?.name ||
      `Hero ${hid}`
    ).trim();
    const slug = slugify(name);
    heroIdentityById.set(hid, {
      id: hid,
      slug,
      name,
      avatar: `/heroes/${hid}-icon.webp`,
    });
  }

  // 4. Fetch MAPI Hero Details + Download Icons & Banners + Normalize Relationships
  const compiledHeroes = [];
  const metaHeroes = [];
  let iconsDownloaded = 0;
  let bannersDownloaded = 0;

  for (let i = 0; i < allHeroIds.length; i++) {
    const hid = allHeroIds[i];
    const identity = heroIdentityById.get(hid);
    const gms = gmsMap.get(hid);
    const mapiBasic = mapiListMap.get(hid);
    const rankEnemy = rankTelemetry.enemyMap.get(hid);
    const rankTeammate = rankTelemetry.teammateMap.get(hid);

    // Rate-limited detail fetch from mapi.mobilelegends.com/hero/detail
    const mapiDetail = await fetchMapiDetail(hid);
    if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);

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

    // Determine Normalized Damage Type (Physical / Magic / True)
    const damage_type = determineDamageType(slug, roles, specialties);

    // High-Rank Competitive Stats (Mythical Glory+)
    const rawWinRate = rankEnemy?.main_hero_win_rate ?? 0.5;
    const rawPickRate = rankEnemy?.main_hero_appearance_rate ?? 0.01;
    const rawBanRate = rankEnemy?.main_hero_ban_rate ?? 0.0;

    const win_rate = Number((rawWinRate * 100).toFixed(2));
    const pick_rate = Number((rawPickRate * 100).toFixed(2));
    const ban_rate = Number((rawBanRate * 100).toFixed(2));

    // Curated fallback relations from GMS 2756564 / MAPI
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

    const curatedCounters = resolveTargetList(
      gms?.relation?.strong?.target_hero_id,
      mapiDetail?.counters?.counters
    );
    const curatedCounteredBy = resolveTargetList(
      gms?.relation?.weak?.target_hero_id,
      mapiDetail?.counters?.countered
    );
    const curatedSynergies = resolveTargetList(
      gms?.relation?.assist?.target_hero_id,
      mapiDetail?.counters?.best
    );

    // 1. Best Counters (sub_hero from enemy matchup telemetry: heroes this hero counters, positive score)
    const best_counters = [];
    if (Array.isArray(rankEnemy?.sub_hero) && rankEnemy.sub_hero.length > 0) {
      for (const sub of rankEnemy.sub_hero.slice(0, 5)) {
        const tid = Number(sub?.heroid);
        if (!tid) continue;
        const targetMeta = heroIdentityById.get(tid);
        const score = Number(((sub?.increase_win_rate ?? 0) * 100).toFixed(2));
        const wr = Number(((sub?.hero_win_rate ?? rawWinRate) * 100).toFixed(2));
        best_counters.push({
          id: tid,
          name: targetMeta?.name || sub?.hero?.data?.name || `Hero ${tid}`,
          slug: targetMeta?.slug || slugify(sub?.hero?.data?.name || `hero-${tid}`),
          avatar: targetMeta?.avatar || `/heroes/${tid}-icon.webp`,
          counter_score: score,
          win_rate: wr,
        });
      }
    }
    // Fallback if telemetry empty
    if (best_counters.length === 0) {
      for (const rel of curatedCounters.slice(0, 5)) {
        best_counters.push({
          id: rel.id,
          name: rel.name,
          slug: rel.slug,
          avatar: rel.avatar,
          counter_score: 3.5,
          win_rate: 50.0,
        });
      }
    }

    // 2. Countered By (sub_hero_last from enemy matchup telemetry: heroes that counter this hero)
    const countered_by = [];
    if (Array.isArray(rankEnemy?.sub_hero_last) && rankEnemy.sub_hero_last.length > 0) {
      for (const sub of rankEnemy.sub_hero_last.slice(0, 5)) {
        const tid = Number(sub?.heroid);
        if (!tid) continue;
        const targetMeta = heroIdentityById.get(tid);
        const score = Number((Math.abs(sub?.increase_win_rate ?? 0) * 100).toFixed(2));
        const wr = Number(((sub?.hero_win_rate ?? rawWinRate) * 100).toFixed(2));
        countered_by.push({
          id: tid,
          name: targetMeta?.name || sub?.hero?.data?.name || `Hero ${tid}`,
          slug: targetMeta?.slug || slugify(sub?.hero?.data?.name || `hero-${tid}`),
          avatar: targetMeta?.avatar || `/heroes/${tid}-icon.webp`,
          counter_score: score,
          win_rate: wr,
        });
      }
    }
    // Fallback if telemetry empty
    if (countered_by.length === 0) {
      for (const rel of curatedCounteredBy.slice(0, 5)) {
        countered_by.push({
          id: rel.id,
          name: rel.name,
          slug: rel.slug,
          avatar: rel.avatar,
          counter_score: 3.5,
          win_rate: 50.0,
        });
      }
    }

    // 3. Synergies (sub_hero from teammate matchup telemetry: synergistic teammates)
    const synergies = [];
    const teamSubHeroes = rankTeammate?.sub_hero || rankEnemy?.sub_hero;
    if (Array.isArray(teamSubHeroes) && teamSubHeroes.length > 0) {
      for (const sub of teamSubHeroes.slice(0, 5)) {
        const tid = Number(sub?.heroid);
        if (!tid) continue;
        const targetMeta = heroIdentityById.get(tid);
        const score = Number(((sub?.increase_win_rate ?? 0) * 100).toFixed(2));
        const wr = Number(((sub?.hero_win_rate ?? rawWinRate) * 100).toFixed(2));
        synergies.push({
          id: tid,
          name: targetMeta?.name || sub?.hero?.data?.name || `Hero ${tid}`,
          slug: targetMeta?.slug || slugify(sub?.hero?.data?.name || `hero-${tid}`),
          avatar: targetMeta?.avatar || `/heroes/${tid}-icon.webp`,
          synergy_score: score,
          counter_score: score,
          win_rate: wr,
        });
      }
    }
    // Fallback if telemetry empty
    if (synergies.length === 0) {
      for (const rel of curatedSynergies.slice(0, 5)) {
        synergies.push({
          id: rel.id,
          name: rel.name,
          slug: rel.slug,
          avatar: rel.avatar,
          synergy_score: 3.0,
          counter_score: 3.0,
          win_rate: 50.0,
        });
      }
    }

    // Counter tips
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
      rankEnemy?.main_hero?.data?.head,
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
      if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
    }

    if (!fs.existsSync(bannerDest)) {
      const ok = await downloadAndSaveWebp(bannerCandidates, bannerDest, cwebpBin);
      if (ok) bannersDownloaded++;
      if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
    }

    // Lightweight relationship format for existing app components
    const appCounters = best_counters.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      avatar: c.avatar,
    }));
    const appCounteredBy = countered_by.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      avatar: c.avatar,
    }));
    const appSynergies = synergies.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      avatar: c.avatar,
    }));

    // Object for src/data/heroes.json (keeps full backwards compatibility)
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
      damage_type,
      damageType: damage_type,
      winRate: win_rate,
      pickRate: pick_rate,
      banRate: ban_rate,
      avatar: `/heroes/${iconFilename}`,
      banner: `/heroes/${bannerFilename}`,
      ...(KNOWN_BANNER_POSITIONS[slug] ? { bannerPosition: KNOWN_BANNER_POSITIONS[slug] } : {}),
      image: `/heroes/${bannerFilename}`,
      counters: appCounters,
      counteredBy: appCounteredBy,
      synergies: appSynergies,
      best_counters,
      countered_by,
      counterTips,
      skills,
      ratings,
    });

    // Clean normalized object for public/data/mlbb-meta.json
    metaHeroes.push({
      id: hid,
      name,
      slug,
      roles,
      lanes,
      damage_type,
      avatar: `/heroes/${iconFilename}`,
      win_rate,
      pick_rate,
      ban_rate,
      best_counters,
      countered_by,
      synergies,
    });

    if ((i + 1) % 35 === 0 || i + 1 === allHeroIds.length) {
      console.log(`⏳ Processed ${i + 1}/${allHeroIds.length} heroes (${name})...`);
    }
  }

  // Sort alphabetically by hero name for clean presentation
  compiledHeroes.sort((a, b) => a.name.localeCompare(b.name));
  metaHeroes.sort((a, b) => a.name.localeCompare(b.name));

  // Write src/data/heroes.json
  await fs.promises.writeFile(
    OUTPUT_JSON,
    JSON.stringify(compiledHeroes, null, 2),
    'utf-8'
  );

  // Write public/data/mlbb-meta.json
  await fs.promises.writeFile(
    META_OUTPUT_JSON,
    JSON.stringify(metaHeroes, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Saved ${compiledHeroes.length} heroes to src/data/heroes.json`);
  console.log(`✅ Saved ${metaHeroes.length} heroes to public/data/mlbb-meta.json`);
  if (iconsDownloaded > 0 || bannersDownloaded > 0) {
    console.log(
      `🖼️ Downloaded ${iconsDownloaded} new square icons & ${bannersDownloaded} new high-res banners to public/heroes/`
    );
  }

  // Console Summary of fetched fields and data structure
  const damageCounts = metaHeroes.reduce((acc, h) => {
    acc[h.damage_type] = (acc[h.damage_type] || 0) + 1;
    return acc;
  }, {});

  const sampleHero =
    metaHeroes.find((h) => h.slug === 'fanny') ||
    metaHeroes.find((h) => h.slug === 'hirara') ||
    metaHeroes[0];

  console.log('\n' + '='.repeat(64));
  console.log('📊 OFFICIAL MOONTON MLBB COMPETITIVE META SUMMARY');
  console.log('='.repeat(64));
  console.log(`🎯 Competitive Rank Tier : Mythical Glory+ (bigrank: 9)`);
  console.log(`⏱️ Telemetry Time Window : ${selectedWindow.toUpperCase()}`);
  console.log(`👥 Total Official Heroes : ${metaHeroes.length}`);
  console.log(
    `🛡️ Damage Types Breakdown: Physical: ${damageCounts.Physical || 0} | Magic: ${
      damageCounts.Magic || 0
    } | True: ${damageCounts.True || 0}`
  );
  console.log(`📁 Meta JSON Saved To    : public/data/mlbb-meta.json`);
  console.log('-'.repeat(64));
  console.log(`🔍 Sample Hero Inspection [${sampleHero.name}] (ID: ${sampleHero.id}):`);
  console.log(`   • Roles       : ${sampleHero.roles.join(', ')}`);
  console.log(`   • Lanes       : ${sampleHero.lanes.join(', ')}`);
  console.log(`   • Damage Type : ${sampleHero.damage_type}`);
  console.log(
    `   • Rank Metrics: Win Rate: ${sampleHero.win_rate}% | Pick Rate: ${sampleHero.pick_rate}% | Ban Rate: ${sampleHero.ban_rate}%`
  );
  console.log(`   • Best Counters (Top 5):`);
  sampleHero.best_counters.forEach((c, idx) => {
    console.log(
      `     ${idx + 1}. ${c.name.padEnd(14)} [Score: +${c.counter_score.toFixed(
        2
      )}% | WR: ${c.win_rate.toFixed(2)}%]`
    );
  });
  console.log(`   • Countered By (Top 5):`);
  sampleHero.countered_by.forEach((c, idx) => {
    console.log(
      `     ${idx + 1}. ${c.name.padEnd(14)} [Score: -${c.counter_score.toFixed(
        2
      )}% | WR: ${c.win_rate.toFixed(2)}%]`
    );
  });
  console.log(`   • Synergies (Top 5):`);
  sampleHero.synergies.forEach((c, idx) => {
    console.log(
      `     ${idx + 1}. ${c.name.padEnd(14)} [Score: +${c.synergy_score.toFixed(
        2
      )}% | WR: ${c.win_rate.toFixed(2)}%]`
    );
  });
  console.log('='.repeat(64) + '\n');
}

main().catch((err) => {
  console.error('❌ Hero pipeline failed:', err);
  process.exit(1);
});
