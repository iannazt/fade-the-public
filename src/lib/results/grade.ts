import type { SupabaseClient } from "@supabase/supabase-js";
import type { SportKey } from "@/lib/scrapers/covers";
import { fetchEspnFinals, recentDates, type EspnFinal } from "./espn";

type GameRow = {
  id: string;
  sport: SportKey;
  external_id: string;
  away_team: string;
  home_team: string;
  away_line: number | null;
  status: string;
};

/**
 * Heuristic: if |line| >= 100, treat as moneyline. Otherwise treat as spread.
 * NHL on Covers is moneyline, NBA/MLB are spread.
 */
function isMoneyline(line: number | null): boolean {
  return line != null && Math.abs(line) >= 100;
}

/**
 * From the away team's perspective, did they win against the line?
 * - Spread: away covers if (away_score + away_line) > home_score
 * - Moneyline: away wins outright (their line value is irrelevant for outcome)
 */
function awayAtsResult(
  awayScore: number,
  homeScore: number,
  awayLine: number | null
): "win" | "loss" | "push" {
  if (awayLine == null) {
    // No line stored — fall back to outright winner.
    if (awayScore > homeScore) return "win";
    if (awayScore < homeScore) return "loss";
    return "push";
  }
  if (isMoneyline(awayLine)) {
    if (awayScore > homeScore) return "win";
    if (awayScore < homeScore) return "loss";
    return "push";
  }
  const adjusted = awayScore + awayLine;
  if (adjusted > homeScore) return "win";
  if (adjusted < homeScore) return "loss";
  return "push";
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function teamMatches(coversName: string, espnName: string): boolean {
  const c = normalize(coversName);
  const e = normalize(espnName);
  if (!c || !e) return false;
  if (c === e) return true;
  // Substring either direction — Covers "Toronto" vs ESPN "Toronto Raptors";
  // Covers "NY Yankees" vs ESPN "New York Yankees".
  if (e.includes(c) || c.includes(e)) return true;
  // Fallback: token overlap of multi-word names (handles "LA Dodgers" vs "Los Angeles Dodgers")
  const cTokens = new Set(c.split(/\s+/));
  const eTokens = e.split(/\s+/);
  const overlap = eTokens.filter((t) => cTokens.has(t)).length;
  return overlap >= 2;
}

function findMatchingFinal(
  game: GameRow,
  finals: EspnFinal[]
): EspnFinal | null {
  for (const f of finals) {
    if (
      teamMatches(game.away_team, f.awayTeam) &&
      teamMatches(game.home_team, f.homeTeam)
    ) {
      return f;
    }
  }
  return null;
}

export type GradeSummary = {
  checked: number;
  graded: number;
  perSport: Record<string, { checked: number; graded: number; error?: string }>;
};

/**
 * Sweep all games that aren't yet final, look them up in ESPN's recent
 * scoreboards, and insert game_results when found. Updates games.status
 * to 'final' for matched games.
 */
export async function gradeRecentGames(
  supabase: SupabaseClient,
  daysBack: number = 3
): Promise<GradeSummary> {
  // Pull games that don't have a result yet.
  const { data: ungraded, error } = await supabase
    .from("games")
    .select(
      "id, sport, external_id, away_team, home_team, away_line, status, game_results!left(game_id)"
    );

  if (error) throw new Error(`gradeRecentGames query: ${error.message}`);

  const open = (ungraded ?? []).filter(
    (r: GameRow & { game_results?: { game_id: string }[] }) =>
      !(r.game_results && r.game_results.length > 0)
  );

  const sports = Array.from(new Set(open.map((r) => r.sport))) as SportKey[];
  const dates = recentDates(daysBack);
  const finalsBySport: Record<string, EspnFinal[]> = {};
  const perSport: GradeSummary["perSport"] = {};

  for (const sport of sports) {
    const all: EspnFinal[] = [];
    let err: string | undefined;
    for (const date of dates) {
      try {
        const finals = await fetchEspnFinals(sport, date);
        all.push(...finals);
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      }
    }
    finalsBySport[sport] = all;
    perSport[sport] = { checked: 0, graded: 0, error: err };
  }

  let totalGraded = 0;

  for (const game of open as GameRow[]) {
    perSport[game.sport].checked += 1;
    const match = findMatchingFinal(game, finalsBySport[game.sport] ?? []);
    if (!match) continue;

    const ats = awayAtsResult(match.awayScore, match.homeScore, game.away_line);

    const { error: insertErr } = await supabase.from("game_results").upsert(
      {
        game_id: game.id,
        away_score: match.awayScore,
        home_score: match.homeScore,
        away_ats: ats,
        final_at: new Date().toISOString(),
      },
      { onConflict: "game_id" }
    );
    if (insertErr) {
      perSport[game.sport].error = insertErr.message;
      continue;
    }

    await supabase.from("games").update({ status: "final" }).eq("id", game.id);

    perSport[game.sport].graded += 1;
    totalGraded += 1;
  }

  return {
    checked: open.length,
    graded: totalGraded,
    perSport,
  };
}
