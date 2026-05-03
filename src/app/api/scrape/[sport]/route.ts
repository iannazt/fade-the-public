import { NextResponse } from "next/server";
import {
  scrapeCoversMatchups,
  flagFades,
  type SportKey,
} from "@/lib/scrapers/covers";

const SUPPORTED: ReadonlySet<SportKey> = new Set(["nba", "mlb", "nhl"]);

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/scrape/[sport]">
) {
  const { sport } = await ctx.params;
  const key = sport.toLowerCase() as SportKey;
  if (!SUPPORTED.has(key)) {
    return NextResponse.json(
      { error: `Unsupported sport: ${sport}. Try: nba, mlb, nhl.` },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const threshold = Number(url.searchParams.get("threshold") ?? "65");

  try {
    const games = await scrapeCoversMatchups(key);
    const fades = flagFades(games, threshold);
    return NextResponse.json({
      sport: key,
      threshold,
      gameCount: games.length,
      fadeCount: fades.length,
      games,
      fades,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scrape failed" },
      { status: 502 }
    );
  }
}
