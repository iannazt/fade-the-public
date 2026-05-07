import { createPublicClient } from "@/lib/supabase";
import ThresholdSlider from "@/components/ThresholdSlider";
import GameCard from "@/components/GameCard";
import { todayInEastern } from "@/lib/fade-rules";
import { BET_TYPE, MONEYLINE_FAVORITE_FLOOR, type SportKey } from "@/lib/sports";

export const dynamic = "force-dynamic";

type Game = {
  id: string;
  sport: SportKey;
  away_team: string;
  home_team: string;
  away_line: number | null;
  home_line: number | null;
  away_public_pct: number | null;
  home_public_pct: number | null;
  starts_at_text: string | null;
  game_date: string | null;
};

function clampThreshold(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n)) return 65;
  return Math.min(90, Math.max(50, Math.round(n)));
}

function addDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function pickFadeSide(
  g: Game,
  threshold: number,
  today: string
): "away" | "home" | null {
  if (!g.game_date || g.game_date !== today) return null;

  let publicSide: "away" | "home" | null = null;
  let publicLine: number | null = null;
  if (g.away_public_pct != null && g.away_public_pct >= threshold) {
    publicSide = "away";
    publicLine = g.away_line;
  } else if (g.home_public_pct != null && g.home_public_pct >= threshold) {
    publicSide = "home";
    publicLine = g.home_line;
  }
  if (!publicSide) return null;

  if (BET_TYPE[g.sport] === "moneyline") {
    if (publicLine == null) return null;
    if (publicLine >= 0) return null; // public on dog -> not a fade
    if (publicLine < -MONEYLINE_FAVORITE_FLOOR) return null; // too heavy
  }
  return publicSide === "away" ? "home" : "away";
}

function formatDateHeader(yyyymmdd: string, today: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  if (yyyymmdd === today) return `Today · ${label}`;
  if (yyyymmdd === addDays(today, 1)) return `Tomorrow · ${label}`;
  return label;
}

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ threshold?: string }>;
}) {
  const { threshold: raw } = await searchParams;
  const threshold = clampThreshold(raw);

  const today = todayInEastern();
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const dates = [today, tomorrow, dayAfter];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, sport, away_team, home_team, away_line, home_line, away_public_pct, home_public_pct, starts_at_text, game_date"
    )
    .eq("status", "pregame")
    .in("game_date", dates)
    .order("game_date", { ascending: true })
    .order("sport", { ascending: true });

  const games: Game[] = (data as Game[] | null) ?? [];

  const byDate: Record<string, Game[]> = {};
  for (const date of dates) byDate[date] = [];
  for (const g of games) {
    if (g.game_date && byDate[g.game_date]) {
      byDate[g.game_date].push(g);
    }
  }

  const fadeCount = (byDate[today] ?? []).filter(
    (g) => pickFadeSide(g, threshold, today) != null
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Upcoming</h1>
        <p className="mt-2 text-zinc-400">
          Today plus the next two days. Future days show public % as info,
          but fade signals only fire on game day — public % shifts too much
          in advance for early signals to be reliable.
        </p>
      </div>

      <ThresholdSlider initial={threshold} />

      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>
          <span className="font-mono text-zinc-200">
            {(byDate[today] ?? []).length}
          </span>{" "}
          today
        </span>
        <span>
          <span className="font-mono text-emerald-400">{fadeCount}</span> fade{" "}
          {fadeCount === 1 ? "opportunity" : "opportunities"} at {threshold}%
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Error loading games: {error.message}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {dates.map((date) => {
          const dayGames = byDate[date] ?? [];
          const isToday = date === today;
          return (
            <section key={date} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
                <span>{formatDateHeader(date, today)}</span>
                {!isToday && (
                  <span className="text-xs font-normal uppercase tracking-wider text-zinc-500">
                    Informational · no fade signal
                  </span>
                )}
              </h2>
              {dayGames.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
                  {isToday
                    ? "No pregame matchups for today."
                    : "No matchups posted for this date yet."}
                </div>
              ) : (
                <div className="grid gap-3">
                  {dayGames.map((g) => (
                    <GameCard
                      key={g.id}
                      sport={g.sport}
                      awayTeam={g.away_team}
                      homeTeam={g.home_team}
                      awayLine={g.away_line}
                      homeLine={g.home_line}
                      awayPublicPct={g.away_public_pct}
                      homePublicPct={g.home_public_pct}
                      startsAtText={g.starts_at_text}
                      threshold={threshold}
                      fadePick={
                        isToday ? pickFadeSide(g, threshold, today) : null
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
