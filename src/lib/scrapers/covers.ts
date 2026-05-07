import * as cheerio from "cheerio";
import { COVERS_PATH, type SportKey } from "@/lib/sports";

export type { SportKey };

export type GameStatus = "pregame" | "live" | "final";

export type ScrapedGame = {
  sport: SportKey;
  externalId: string;
  matchupUrl: string;
  status: GameStatus;
  awayTeam: string;
  homeTeam: string;
  awayLine: number | null;
  homeLine: number | null;
  awayPublicPct: number | null;
  homePublicPct: number | null;
  startsAtText: string | null;
  /** YYYY-MM-DD parsed from the gamebox time text; null if we couldn't infer. */
  gameDate: string | null;
};

const COVERS_BASE = "https://www.covers.com";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parsePct(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function parseLine(text: string): number | null {
  const withoutPct = text.replace(/\d{1,3}\s*%/g, " ");
  const cleaned = withoutPct.replace(/½/g, ".5").replace(/[−–—]/g, "-");
  if (/\bPK\b/i.test(cleaned)) return 0;
  const m = cleaned.match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function classifyStatus(classAttr: string): GameStatus {
  if (/\bpregamebox\b/.test(classAttr)) return "pregame";
  if (/\bingamebox\b/.test(classAttr)) return "live";
  return "final";
}

function splitHeaderTeams(header: string): { away: string; home: string } {
  const cleaned = header
    .replace(
      /\s+(?:Conf\.|Conference|Series|Round|Game|Interleague|World Series|Wild Card|Divisional|Playoffs?|Finals?)(?:\s.*)?$/i,
      ""
    )
    .trim();
  const parts = cleaned.split(/\s*@\s*/);
  if (parts.length >= 2) {
    return { away: parts[0].trim(), home: parts[1].trim() };
  }
  return { away: "", home: "" };
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse a date out of Covers' gamebox time text.
 * Examples we handle:
 *   "Sunday, May 3 Sun, May 3 7:30 PM ET"  -> "2026-05-03"
 *   "Sun, May 3 7:30 PM ET"                -> "2026-05-03"
 *   "35 Live • 2nd 06:16 38" (no date)     -> today (assume the game runs today)
 *   "101 Final 111" (no date)              -> today (Covers shows today's finals)
 *
 * `now` defaults to the current time. Year is inferred — if the parsed
 * month/day is more than 6 months in the past, we roll to next year, which
 * handles December scrapes that show January games.
 */
export function parseGameDate(
  startsAtText: string | null,
  status: GameStatus,
  now: Date = new Date()
): string | null {
  if (!startsAtText) return ymd(now);
  const m = startsAtText.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b\.?\s+(\d{1,2})/i
  );
  if (!m) {
    // No date in the text — fall back to today for live/final games (Covers
    // is showing today's slate). Pregame without a date is uncommon but
    // also reasonable to assume today.
    void status;
    return ymd(now);
  }
  const month = MONTHS[m[1].toLowerCase()];
  const day = Number(m[2]);
  let year = now.getFullYear();
  const candidate = new Date(year, month, day);
  // If the parsed date is more than 6 months in the past, roll forward.
  const monthsPast = (now.getTime() - candidate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsPast > 6) year += 1;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Scrape Covers' matchup page for a given sport.
 *
 * Pass `selectedDate` (YYYY-MM-DD) to fetch a future day. Covers serves
 * tomorrow / day-after slates via the `?selectedDate=` query param, and
 * publishes consensus % + lines as soon as books post them. When data
 * isn't out yet the gamebox renders "-" placeholders, which our parser
 * naturally returns as null.
 */
export async function scrapeCoversMatchups(
  sport: SportKey,
  fetchImpl: typeof fetch = fetch,
  selectedDate?: string
): Promise<ScrapedGame[]> {
  const qs = selectedDate ? `?selectedDate=${selectedDate}` : "";
  const url = `${COVERS_BASE}${COVERS_PATH[sport]}${qs}`;
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
  html: string,
  now: Date = new Date()
): ScrapedGame[] {
  const $ = cheerio.load(html);
  const games: ScrapedGame[] = [];

  $(".gamebox").each((_, el) => {
    const $box = $(el);
    const classAttr = $box.attr("class") ?? "";
    const status = classifyStatus(classAttr);

    const matchupHref =
      $box.find('a[href*="/matchup/"]').first().attr("href") ?? "";
    const idMatch = matchupHref.match(/\/matchup\/(\d+)/);
    if (!idMatch) return;
    const externalId = idMatch[1];
    const matchupUrl = matchupHref.startsWith("http")
      ? matchupHref
      : `${COVERS_BASE}${matchupHref}`;

    const header = $box
      .find(".gamebox-header")
      .first()
      .text()
      .trim()
      .replace(/\s+/g, " ");
    const { away: awayTeam, home: homeTeam } = splitHeaderTeams(header);

    const startsAtText =
      $box.find(".gamebox-time").first().text().trim().replace(/\s+/g, " ") ||
      null;
    const gameDate = parseGameDate(startsAtText, status, now);

    const consensusTexts = $box
      .find(".team-consensus")
      .map((_i, span) => $(span).text().trim().replace(/\s+/g, " "))
      .get();
    const [awayConsensus, homeConsensus] = consensusTexts;

    games.push({
      sport,
      externalId,
      matchupUrl,
      status,
      awayTeam,
      homeTeam,
      awayLine: awayConsensus ? parseLine(awayConsensus) : null,
      homeLine: homeConsensus ? parseLine(homeConsensus) : null,
      awayPublicPct: awayConsensus ? parsePct(awayConsensus) : null,
      homePublicPct: homeConsensus ? parsePct(homeConsensus) : null,
      startsAtText,
      gameDate,
    });
  });

  return games;
}

export type FadeFlag = ScrapedGame & {
  fadeSide: "away" | "home";
  publicPct: number;
  fadeLine: number | null;
  fadeTeam: string;
};
