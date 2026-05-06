/**
 * Per-sport metadata. The Covers.com path tells us where to scrape; the
 * `betType` tells the History/Upcoming math which math to use; the
 * `displayName` is shown in the UI.
 *
 * Spread sports are flagged at threshold without a juice floor (assume -110).
 * Moneyline sports get an extra rule: only flag a fade when the favorite's
 * odds are -200 or shorter (i.e., |line| <= 200) — fading a -500 favorite
 * has no value even if 70% of the public is on it.
 */
export type SportKey = "nba" | "mlb" | "nhl" | "nfl" | "ncaaf" | "ncaab";

export type BetType = "spread" | "moneyline";

export const SPORTS: ReadonlyArray<SportKey> = [
  "nba",
  "mlb",
  "nhl",
  "nfl",
  "ncaaf",
  "ncaab",
];

export const SPORT_LABEL: Record<SportKey, string> = {
  nba: "NBA",
  mlb: "MLB",
  nhl: "NHL",
  nfl: "NFL",
  ncaaf: "NCAAF",
  ncaab: "NCAAB",
};

export const COVERS_PATH: Record<SportKey, string> = {
  nba: "/sports/nba/matchups",
  mlb: "/sports/mlb/matchups",
  nhl: "/sports/nhl/matchups",
  nfl: "/sports/nfl/matchups",
  ncaaf: "/sports/ncaaf/matchups",
  ncaab: "/sports/ncaab/matchups",
};

export const BET_TYPE: Record<SportKey, BetType> = {
  nba: "spread",
  nfl: "spread",
  ncaaf: "spread",
  ncaab: "spread",
  mlb: "moneyline",
  nhl: "moneyline",
};

/** Maximum |line| at which we'll flag a moneyline fade. */
export const MONEYLINE_FAVORITE_FLOOR = 200;

export function isSportKey(value: string): value is SportKey {
  return (SPORTS as readonly string[]).includes(value);
}
