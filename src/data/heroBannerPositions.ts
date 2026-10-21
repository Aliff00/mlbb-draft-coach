/**
 * Hero Banner Configuration
 * 
 * - Locked global banner centering: 'center 20%'
 * - Facing direction list (FLIP_HERO_FACING):
 *     Heroes that originally face LEFT in their banner art.
 *     These are automatically inverted on Blue (to face RIGHT) and kept natural on Red (to face LEFT).
 *     All other heroes face RIGHT on Blue and are automatically inverted on Red.
 */

export const DEFAULT_BANNER_POSITION = 'center 20%';

/**
 * FLIP_HERO_FACING
 * 
 * Heroes whose original banner artwork faces LEFT.
 * - On Blue Team (Left): Automatically flipped to face RIGHT (inward).
 * - On Red Team (Right): Kept natural to face LEFT (inward).
 */
export const FLIP_HERO_FACING: string[] = [
  'balmond','saber','nana','franco','bane','bruno','clint','eudora','layla','minotaur','lolita','freya','gord','kagura','chou','sun','alpha','moskov','aurora','roger','harley','irithel','grock','lancelot','zhask','helcurt','jawhead','angela','gusion','valir','uranus','change','kaja','claude','lunox','hanzo','belerick','kimmy','thamuz','harith','minsitthar','badang','x.borg','lylia','baxia','wanwan','silvanna','carmilla','popol and kupa','yu zhong','luo yi','benedetta','khaleed','brody','mathilda','gloo','phoveus','aulus','aamon','yin','melissa','julian','fredrinn','joy','novaria','arlott','chip','suyou','kalea','zetian','obsidia','marcel'
];

/**
 * Normalizes hero lookup keys so any variation matches:
 * "Yi Sun-shin", "yi-sun-shin", "popol&kupa", or "yisunshin".
 */
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a hero's base banner artwork is in the left-facing list.
 */
export function isHeroBaseFacingLeft(hero?: { name?: string; slug?: string } | null): boolean {
  if (!hero) return false;

  const slugNorm = hero.slug ? normalizeKey(hero.slug) : '';
  const nameNorm = hero.name ? normalizeKey(hero.name) : '';

  for (const item of FLIP_HERO_FACING) {
    const itemNorm = normalizeKey(item);
    if ((slugNorm && slugNorm === itemNorm) || (nameNorm && nameNorm === itemNorm)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether the hero banner should be horizontally flipped:
 * - On Blue Team (Left): Heroes should face RIGHT (toward the center battlefield).
 * - On Red Team (Right): Heroes should face LEFT (toward the center battlefield).
 */
export function shouldHeroFlip(
  hero?: { name?: string; slug?: string } | null,
  isBlue = true
): boolean {
  if (!hero) return false;
  const baseFacingLeft = isHeroBaseFacingLeft(hero);
  return isBlue ? baseFacingLeft : !baseFacingLeft;
}

/**
 * Locked universal banner position for all heroes ('center 20%')
 */
export function getHeroBannerPosition(_hero?: any): string {
  return DEFAULT_BANNER_POSITION;
}

// Backwards-compatibility alias
export const HERO_BANNER_POSITIONS = {};
export const HERO_BANNER_CONFIGS = {};
