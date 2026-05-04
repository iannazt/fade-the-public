import * as cheerio from "cheerio";

export type SportKey = "nba" | "mlb" | "nhl";

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
};

const COVERS_BASE = "https://www.covers.com";

const SPORT_PATHS: Record<SportKey, string> = {
  nba: "/sports/nba/matchups",
  mlb: "/sports/mlb/matchups",
  nhl: "/sports/nhl/matchups",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parsePct(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function parseLine(text: string): number | null {
  // Strip the percentage so we don't accidentally parse it as the line.
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
  // Format: "Toronto @ Cleveland Conf. QF" — strip trailing round/series tags.
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

export function flagFades(
  games: ScrapedGame[],
  thresholdPct: number
): FadeFlag[] {
  const flagged: FadeFlag[] = [];
  for (const g of games) {
    if (g.status !== "pregame") continue;
    if (g.awayPublicPct != null && g.awayPublicPct >= thresholdPct) {
      flagged.push({
        ...g,
        fadeSide: "home",
        publicPct: g.awayPublicPct,
        fadeLine: g.homeLine,
        fadeTeam: g.homeTeam,
      });
    } else if (g.homePublicPct != null && g.homePublicPct >= thresholdPct) {
      flagged.push({
        ...g,
        fadeSide: "away",
        publicPct: g.homePublicPct,
        fadeLine: g.awayLine,
        fadeTeam: g.awayTeam,
      });
    }
  }
  return flagged;
}
