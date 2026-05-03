import * as cheerio from "cheerio";

export type SportKey = "nba" | "mlb" | "nhl";

export type ScrapedGame = {
  sport: SportKey;
  externalId: string;
  matchupUrl: string;
  awayTeam: string;
  homeTeam: string;
  awaySpread: number | null;
  homeSpread: number | null;
  awayPublicPct: number | null;
  homePublicPct: number | null;
  startsAt: string | null;
};

const COVERS_BASE = "https://www.covers.com";

const SPORT_PATHS: Record<SportKey, string> = {
  nba: "/sports/nba/matchups",
  mlb: "/sports/mlb/matchups",
  nhl: "/sports/nhl/matchups",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parsePct(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function parseSpread(text: string | undefined): number | null {
  if (!text) return null;
  // Examples: "+8.5", "-3", "PK", "+1½"
  const cleaned = text.replace(/½/g, ".5").replace(/[−–—]/g, "-");
  if (/PK/i.test(cleaned)) return 0;
  const m = cleaned.match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export async function scrapeCoversMatchups(
  sport: SportKey,
  fetchImpl: typeof fetch = fetch
): Promise<ScrapedGame[]> {
  const url = `${COVERS_BASE}${SPORT_PATHS[sport]}`;
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Covers ${sport} fetch failed: HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseCoversMatchups(sport, html);
}

export function parseCoversMatchups(
  sport: SportKey,
  html: string
): ScrapedGame[] {
  const $ = cheerio.load(html);
  const games: ScrapedGame[] = [];

  // Each game card has a data-game-id and contains team logos (alt="..."),
  // a team-consensus span per side and a spread next to it.
  $("[data-game-id]").each((_, el) => {
    const $card = $(el);
    const externalId = $card.attr("data-game-id")?.trim();
    if (!externalId) return;

    const matchupHref = $card.find(`a[href*="/matchup/${externalId}"]`).first().attr("href") ?? "";
    const matchupUrl = matchupHref
      ? matchupHref.startsWith("http")
        ? matchupHref
        : `${COVERS_BASE}${matchupHref}`
      : "";

    // Team names from logo alt text — first is away, second is home on Covers.
    const teamAlts = $card
      .find("img[alt]")
      .map((_i, img) => $(img).attr("alt")?.trim() ?? "")
      .get()
      .filter((s) => s.length > 0 && !/logo|sportsbook|book|covers/i.test(s));

    const [awayTeam = "", homeTeam = ""] = teamAlts;

    // team-consensus blocks come in pairs (away first, then home).
    const consensus = $card
      .find("span.team-consensus")
      .map((_i, span) => {
        const $span = $(span);
        const pctText = $span.find("strong").first().text();
        const fullText = $span.text();
        const pct = parsePct(pctText);
        // Spread is whatever's left in the span text after the percentage.
        const spreadText = fullText.replace(/\d{1,3}\s*%/, "").trim();
        return { pct, spread: parseSpread(spreadText) };
      })
      .get();

    const [away, home] = [consensus[0], consensus[1]];

    // Game start time — Covers tags it with data-game-date or shows in card.
    const startsAt =
      $card.attr("data-game-date") ??
      $card.find("[data-game-date]").first().attr("data-game-date") ??
      null;

    games.push({
      sport,
      externalId,
      matchupUrl,
      awayTeam,
      homeTeam,
      awaySpread: away?.spread ?? null,
      homeSpread: home?.spread ?? null,
      awayPublicPct: away?.pct ?? null,
      homePublicPct: home?.pct ?? null,
      startsAt,
    });
  });

  return games;
}

export function flagFades(
  games: ScrapedGame[],
  thresholdPct: number
): Array<ScrapedGame & { fadeSide: "away" | "home"; publicPct: number }> {
  const flagged: Array<
    ScrapedGame & { fadeSide: "away" | "home"; publicPct: number }
  > = [];
  for (const g of games) {
    if (g.awayPublicPct != null && g.awayPublicPct >= thresholdPct) {
      flagged.push({ ...g, fadeSide: "home", publicPct: g.awayPublicPct });
    } else if (g.homePublicPct != null && g.homePublicPct >= thresholdPct) {
      flagged.push({ ...g, fadeSide: "away", publicPct: g.homePublicPct });
    }
  }
  return flagged;
}
