import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScrapedGame } from "./covers";

export type PersistSummary = {
  gamesUpserted: number;
  flagsInserted: number;
};

/**
 * Upsert games on (sport, external_id). Returns a map of external_id → row uuid
 * so callers can reference each game when inserting fade_flags.
 */
export async function upsertGames(
  supabase: SupabaseClient,
  games: ScrapedGame[]
): Promise<Map<string, string>> {
  if (games.length === 0) return new Map();

  const rows = games.map((g) => ({
    sport: g.sport,
    external_id: g.externalId,
    matchup_url: g.matchupUrl || null,
    status: g.status,
    away_team: g.awayTeam,
    home_team: g.homeTeam,
    away_line: g.awayLine,
    home_line: g.homeLine,
    away_public_pct: g.awayPublicPct,
    home_public_pct: g.homePublicPct,
    starts_at_text: g.startsAtText,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("games")
    .upsert(rows, { onConflict: "sport,external_id" })
    .select("id, sport, external_id");

  if (error) throw new Error(`upsertGames: ${error.message}`);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(`${row.sport}:${row.external_id}`, row.id);
  }
  return map;
}

/**
 * Insert a fade_flag for each pregame game whose public-side % crosses the
 * threshold. Idempotent — the unique constraint on
 * (game_id, fade_side, threshold_at_flag) prevents duplicate flags when the
 * scraper runs multiple times.
 */
export async function recordFadeFlags(
  supabase: SupabaseClient,
  games: ScrapedGame[],
  thresholdPct: number,
  gameIdMap: Map<string, string>
): Promise<number> {
  type FlagRow = {
    game_id: string;
    fade_side: "away" | "home";
    fade_team: string;
    fade_line: number | null;
    public_pct: number;
    threshold_at_flag: number;
  };

  const flags: FlagRow[] = [];
  for (const g of games) {
    if (g.status !== "pregame") continue;
    const gameId = gameIdMap.get(`${g.sport}:${g.externalId}`);
    if (!gameId) continue;

    if (g.awayPublicPct != null && g.awayPublicPct >= thresholdPct) {
      flags.push({
        game_id: gameId,
        fade_side: "home",
        fade_team: g.homeTeam,
        fade_line: g.homeLine,
        public_pct: g.awayPublicPct,
        threshold_at_flag: thresholdPct,
      });
    } else if (g.homePublicPct != null && g.homePublicPct >= thresholdPct) {
      flags.push({
        game_id: gameId,
        fade_side: "away",
        fade_team: g.awayTeam,
        fade_line: g.awayLine,
        public_pct: g.homePublicPct,
        threshold_at_flag: thresholdPct,
      });
    }
  }

  if (flags.length === 0) return 0;

  // ignoreDuplicates: true so we don't error on re-runs of the same scrape.
  const { data, error } = await supabase
    .from("fade_flags")
    .upsert(flags, {
      onConflict: "game_id,fade_side,threshold_at_flag",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw new Error(`recordFadeFlags: ${error.message}`);

  return data?.length ?? 0;
}
