import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  scrapeCoversMatchups,
  type ScrapedGame,
} from "@/lib/scrapers/covers";
import { upsertGames, recordFadeFlags } from "@/lib/scrapers/persist";
import { todayInEastern } from "@/lib/fade-rules";
import { SPORTS } from "@/lib/sports";

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
  const tomorrow = addDaysIso(today, 1);
  const dayAfter = addDaysIso(today, 2);
  const perSport: Record<
    string,
    { today: number; future: number; flags: number; error?: string }
  > = {};
  const allGames: ScrapedGame[] = [];

  // Pull Covers for today + the next two days. Covers serves future-day
  // slates via ?selectedDate=YYYY-MM-DD with the same gamebox structure,
  // so we get matchup, line, and public % uniformly across days. Fade
  // flagging stays game-day-only — evaluateFade() rejects rows where
  // gameDate !== today.
  for (const sport of SPORTS) {
    perSport[sport] = { today: 0, future: 0, flags: 0 };

    // 1) Today (no selectedDate so Covers serves the live default).
    try {
      const games = await scrapeCoversMatchups(sport);
      allGames.push(...games);
      const idMap = await upsertGames(supabase, games);

      let flagCount = 0;
      for (const t of THRESHOLDS) {
        flagCount += await recordFadeFlags(supabase, games, t, today, idMap);
      }

      perSport[sport].today = games.length;
      perSport[sport].flags = flagCount;
    } catch (err) {
      perSport[sport].error =
        err instanceof Error ? err.message : String(err);
    }

    // 2) Tomorrow + day-after — best-effort. Covers may render "-" for
    //    consensus / line if books haven't posted yet; the parser returns
    //    null in that case, which the UI shows as an em dash.
    for (const date of [tomorrow, dayAfter]) {
      try {
        const games = await scrapeCoversMatchups(sport, undefined, date);
        if (games.length === 0) continue;
        await upsertGames(supabase, games);
        perSport[sport].future += games.length;
      } catch (err) {
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
