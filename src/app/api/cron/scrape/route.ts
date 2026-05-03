import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  scrapeCoversMatchups,
  type ScrapedGame,
  type SportKey,
} from "@/lib/scrapers/covers";
import { upsertGames, recordFadeFlags } from "@/lib/scrapers/persist";

const SPORTS: SportKey[] = ["nba", "mlb", "nhl"];
const THRESHOLDS = [60, 65, 70, 75, 80];

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  // Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header.
  // Allow either the header or a ?secret= query param for local testing.
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const perSport: Record<string, { games: number; flags: number; error?: string }> = {};
  const allGames: ScrapedGame[] = [];

  for (const sport of SPORTS) {
    try {
      const games = await scrapeCoversMatchups(sport);
      allGames.push(...games);
      const idMap = await upsertGames(supabase, games);

      let flagCount = 0;
      for (const t of THRESHOLDS) {
        flagCount += await recordFadeFlags(supabase, games, t, idMap);
      }

      perSport[sport] = { games: games.length, flags: flagCount };
    } catch (err) {
      perSport[sport] = {
        games: 0,
        flags: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    perSport,
    totalGames: allGames.length,
  });
}
