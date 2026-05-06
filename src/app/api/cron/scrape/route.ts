import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  scrapeCoversMatchups,
  type ScrapedGame,
} from "@/lib/scrapers/covers";
import { upsertGames, recordFadeFlags } from "@/lib/scrapers/persist";
import { todayInEastern } from "@/lib/fade-rules";
import { BET_TYPE, SPORTS, type SportKey } from "@/lib/sports";
import { fetchEspnScheduled } from "@/lib/results/espn";

// 65% is the floor. Higher thresholds let the History page filter to
// stricter subsets. We do NOT record at 60% — below 65 the market isn't
// imbalanced enough for the line-shading dynamic to matter.
const THRESHOLDS = [65, 70, 75, 80];

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

function addDaysIso(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function toYyyymmdd(yyyymmdd: string): string {
  return yyyymmdd.replace(/-/g, "");
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const today = todayInEastern();
  const perSport: Record<
    string,
    { games: number; flags: number; espn: number; error?: string }
  > = {};
  const allGames: ScrapedGame[] = [];

  // 1) Today: scrape Covers (full data: matchup, line, public%, fade flagging).
  for (const sport of SPORTS) {
    perSport[sport] = { games: 0, flags: 0, espn: 0 };
    try {
      const games = await scrapeCoversMatchups(sport);
      allGames.push(...games);
      const idMap = await upsertGames(supabase, games);

      let flagCount = 0;
      for (const t of THRESHOLDS) {
        flagCount += await recordFadeFlags(supabase, games, t, today, idMap);
      }

      perSport[sport].games = games.length;
      perSport[sport].flags = flagCount;
    } catch (err) {
      perSport[sport].error =
        err instanceof Error ? err.message : String(err);
    }
  }

  // 2) Tomorrow + day-after: pull schedules from ESPN. No public% or line
  //    is available for future days — these rows are informational only.
  const futureDates = [addDaysIso(today, 1), addDaysIso(today, 2)];
  for (const sport of SPORTS) {
    for (const isoDate of futureDates) {
      try {
        const scheduled = await fetchEspnScheduled(
          sport as SportKey,
          toYyyymmdd(isoDate)
        );
        if (scheduled.length === 0) continue;
        const betType = BET_TYPE[sport as SportKey];
        const rows: ScrapedGame[] = scheduled.map((s) => {
          let awayLine: number | null = null;
          let homeLine: number | null = null;
          if (betType === "spread" && s.spread != null) {
            // ESPN's `spread` is the home spread. Away is the inverse.
            homeLine = s.spread;
            awayLine = -s.spread;
          } else if (betType === "moneyline") {
            awayLine = s.awayMoneyLine;
            homeLine = s.homeMoneyLine;
          }
          return {
            sport: sport as SportKey,
            externalId: `espn:${s.externalId}`,
            matchupUrl: "",
            status: "pregame",
            awayTeam: s.awayTeam,
            homeTeam: s.homeTeam,
            awayLine,
            homeLine,
            awayPublicPct: null,
            homePublicPct: null,
            startsAtText: s.startsAtText,
            gameDate: isoDate,
          };
        });
        await upsertGames(supabase, rows);
        perSport[sport].espn += rows.length;
      } catch (err) {
        // Don't fail the whole cron for a missing ESPN date / sport —
        // future days are best-effort.
        if (!perSport[sport].error) {
          perSport[sport].error =
            err instanceof Error ? err.message : String(err);
        }
      }
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    today,
    perSport,
    totalGames: allGames.length,
  });
}
