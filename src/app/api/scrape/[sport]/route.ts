import { NextResponse } from "next/server";
import { scrapeCoversMatchups } from "@/lib/scrapers/covers";
import { flagFades, todayInEastern } from "@/lib/fade-rules";
import { SPORTS, isSportKey, type SportKey } from "@/lib/sports";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/scrape/[sport]">
) {
  const { sport } = await ctx.params;
  const key = sport.toLowerCase();
  if (!isSportKey(key)) {
    return NextResponse.json(
      { error: `Unsupported sport: ${sport}. Try: ${SPORTS.join(", ")}.` },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const threshold = Number(url.searchParams.get("threshold") ?? "65");
  const today = url.searchParams.get("today") ?? todayInEastern();

  try {
    const games = await scrapeCoversMatchups(key as SportKey);
    const fades = flagFades(games, threshold, today);
    return NextResponse.json({
      sport: key,
      threshold,
      today,
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
