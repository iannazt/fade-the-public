import type { SportKey } from "@/lib/scrapers/covers";

export type EspnFinal = {
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
};

const ESPN_PATH: Record<SportKey, string> = {
  nba: "basketball/nba",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
};

type Competitor = {
  homeAway: "home" | "away";
  score: string;
  team: { displayName: string; shortDisplayName?: string; abbreviation?: string };
};

type Event = {
  competitions: Array<{
    status: { type: { completed: boolean } };
    competitors: Competitor[];
  }>;
};

/**
 * Fetch ESPN's scoreboard JSON for a sport on a given date (YYYYMMDD).
 * Returns only events that have completed (final score available).
 */
export async function fetchEspnFinals(
  sport: SportKey,
  yyyymmdd: string,
  fetchImpl: typeof fetch = fetch
): Promise<EspnFinal[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATH[sport]}/scoreboard?dates=${yyyymmdd}`;
  const res = await fetchImpl(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ESPN ${sport} ${yyyymmdd}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { events?: Event[] };
  const finals: EspnFinal[] = [];
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    if (!comp.status?.type?.completed) continue;
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const home = comp.competitors.find((c) => c.homeAway === "home");
    if (!away || !home) continue;
    const aScore = Number(away.score);
    const hScore = Number(home.score);
    if (!Number.isFinite(aScore) || !Number.isFinite(hScore)) continue;
    finals.push({
      awayTeam: away.team.displayName,
      homeTeam: home.team.displayName,
      awayScore: aScore,
      homeScore: hScore,
    });
  }
  return finals;
}

/**
 * Format a Date as YYYYMMDD using the local timezone of the runtime.
 */
export function formatYyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Generate the last N daily strings (today, yesterday, ...) so we can
 * sweep recent games that may have just gone final.
 */
export function recentDates(days: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(formatYyyymmdd(d));
  }
  return out;
}
