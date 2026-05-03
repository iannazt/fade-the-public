import { createPublicClient } from "@/lib/supabase";
import ThresholdSlider from "@/components/ThresholdSlider";
import GameCard from "@/components/GameCard";

export const dynamic = "force-dynamic";

type Game = {
  id: string;
  sport: string;
  away_team: string;
  home_team: string;
  away_line: number | null;
  home_line: number | null;
  away_public_pct: number | null;
  home_public_pct: number | null;
  starts_at_text: string | null;
};

function clampThreshold(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n)) return 65;
  return Math.min(90, Math.max(50, Math.round(n)));
}

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ threshold?: string }>;
}) {
  const { threshold: raw } = await searchParams;
  const threshold = clampThreshold(raw);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, sport, away_team, home_team, away_line, home_line, away_public_pct, home_public_pct, starts_at_text"
    )
    .eq("status", "pregame")
    .order("sport", { ascending: true });

  const games: Game[] = (data as Game[] | null) ?? [];

  const fadeCount = games.filter(
    (g) =>
      (g.away_public_pct != null && g.away_public_pct >= threshold) ||
      (g.home_public_pct != null && g.home_public_pct >= threshold)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Upcoming</h1>
        <p className="mt-2 text-zinc-400">
          Pregame matchups across NBA, MLB, and NHL. Drag the slider to
          experiment with different fade thresholds.
        </p>
      </div>

      <ThresholdSlider initial={threshold} />

      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>
          <span className="font-mono text-zinc-200">{games.length}</span>{" "}
          pregame
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

      {games.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
          No pregame games right now. Run the scraper to populate.
        </div>
      ) : (
        <div className="grid gap-3">
          {games.map((g) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
