import { BET_TYPE, MONEYLINE_FAVORITE_FLOOR } from "@/lib/sports";
import type { ScrapedGame, FadeFlag } from "@/lib/scrapers/covers";

/**
 * Decide whether a scraped game is a fade candidate at the given threshold.
 * Returns a FadeFlag if it qualifies, otherwise null.
 *
 * Rules:
 *   - Game must be pregame.
 *   - Game must be on `today` (game-day-only rule). Future games never flag.
 *   - One side's public % must be >= threshold.
 *   - For moneyline sports, the public side's line must be no shorter than
 *     -MONEYLINE_FAVORITE_FLOOR (i.e., |line| <= 200). No value fading a -500
 *     favorite.
 *
 * `today` is YYYY-MM-DD in the timezone the caller cares about (US Eastern
 * for our use case).
 */
export function evaluateFade(
  game: ScrapedGame,
  thresholdPct: number,
  today: string
): FadeFlag | null {
  if (game.status !== "pregame") return null;
  if (!game.gameDate || game.gameDate !== today) return null;

  const betType = BET_TYPE[game.sport];

  let publicSide: "away" | "home" | null = null;
  let publicPct: number = 0;
  let publicSideLine: number | null = null;

  if (game.awayPublicPct != null && game.awayPublicPct >= thresholdPct) {
    publicSide = "away";
    publicPct = game.awayPublicPct;
    publicSideLine = game.awayLine;
  } else if (game.homePublicPct != null && game.homePublicPct >= thresholdPct) {
    publicSide = "home";
    publicPct = game.homePublicPct;
    publicSideLine = game.homeLine;
  }

  if (!publicSide) return null;

  // Moneyline rules:
  //  1. Public side must be the favorite (negative odds). Public on a dog
  //     is not a fade-the-public setup — there's no line-shading to exploit.
  //  2. The favorite must be no shorter than -MONEYLINE_FAVORITE_FLOOR.
  //     Once the public side is e.g. -300, the public is probably right.
  if (betType === "moneyline") {
    if (publicSideLine == null) return null;
    if (publicSideLine >= 0) return null; // dog or pickem -> not a fade
    if (publicSideLine < -MONEYLINE_FAVORITE_FLOOR) return null; // too heavy
  }

  // We fade the OPPOSITE side from where the public is.
  const fadeSide = publicSide === "away" ? "home" : "away";
  const fadeTeam = fadeSide === "away" ? game.awayTeam : game.homeTeam;
  const fadeLine = fadeSide === "away" ? game.awayLine : game.homeLine;

  return {
    ...game,
    fadeSide,
    publicPct,
    fadeLine,
    fadeTeam,
  };
}

export function flagFades(
  games: ScrapedGame[],
  thresholdPct: number,
  today: string
): FadeFlag[] {
  const flags: FadeFlag[] = [];
  for (const g of games) {
    const flag = evaluateFade(g, thresholdPct, today);
    if (flag) flags.push(flag);
  }
  return flags;
}

/**
 * Returns "today" in US Eastern as YYYY-MM-DD. The site is US-centric
 * (NA sports), so this is the natural reference for "is it game day yet?"
 */
export function todayInEastern(now: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD, which is exactly what we need.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
