import { createPublicClient } from "@/lib/supabase";
import {
  computeStats,
  fadeOutcome,
  profitUnits,
  type FadeOutcome,
} from "@/lib/grading";
import { SPORT_LABEL } from "@/lib/sports";

export const dynamic = "force-dynamic";

type FadeRow = {
  id: string;
  fade_side: "away" | "home";
  fade_team: string;
  fade_line: number | null;
  public_pct: number;
  threshold_at_flag: number;
  flagged_at: string;
  games: {
    sport: string;
    away_team: string;
    home_team: string;
    game_results: {
      away_score: number;
      home_score: number;
      away_ats: "win" | "loss" | "push";
    } | null;
  } | null;
};

function clampThreshold(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n)) return 65;
  return [65, 70, 75, 80].includes(n) ? n : 65;
}

function formatLine(n: number | null): string {
  if (n == null) return "—";
  if (n === 0) return "PK";
  return n > 0 ? `+${n}` : String(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number, digits = 2): string {
  return (Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)).toFixed(
    digits
  );
}

function sportLabel(sport: string): string {
  return (SPORT_LABEL as Record<string, string>)[sport] ?? sport.toUpperCase();
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "good" | "bad" | "neutral";
}) {
  const valueClass =
    accent === "good"
      ? "text-emerald-400"
      : accent === "bad"
      ? "text-rose-400"
      : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl tabular-nums ${valueClass}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ threshold?: string }>;
}) {
  const { threshold: raw } = await searchParams;
  const threshold = clampThreshold(raw);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("fade_flags")
    .select(
      `id, fade_side, fade_team, fade_line, public_pct, threshold_at_flag, flagged_at,
       games!inner(sport, away_team, home_team, game_results(away_score, home_score, away_ats))`
    )
    .eq("threshold_at_flag", threshold)
    .order("flagged_at", { ascending: false })
    .limit(500);

  const flags = (data as FadeRow[] | null) ?? [];

  const records = flags.map((f) => {
    const gr = f.games?.game_results ?? null;
    const outcome: FadeOutcome | null = gr
      ? fadeOutcome(gr.away_ats, f.fade_side)
      : null;
    return { outcome, fadeLine: f.fade_line, gr, flag: f };
  });

  const stats = computeStats(
    records.map((r) => ({ outcome: r.outcome, fadeLine: r.fadeLine }))
  );

  const recordSummary = (() => {
    const decided = stats.wins + stats.losses;
    if (decided === 0) {
      return stats.unresolved > 0
        ? `Fade Record: 0-0 (no graded results yet)`
        : `Fade Record: 0-0`;
    }
    const pct = (stats.wins / decided) * 100;
    const pushSuffix = stats.pushes > 0 ? `, ${stats.pushes} push` : "";
    return `Fade Record: ${stats.wins}-${stats.losses} (${formatNumber(
      pct,
      0
    )}%)${pushSuffix}`;
  })();

  const thresholdOptions = [65, 70, 75, 80];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-2 text-zinc-400">
          Every fade flagged at this threshold and how each one settled.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-lg font-mono tabular-nums">
        {recordSummary}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <span className="text-sm text-zinc-400">Threshold:</span>
        {thresholdOptions.map((t) => (
          <a
            key={t}
            href={`/history?threshold=${t}`}
            className={[
              "rounded-md px-3 py-1 text-sm font-mono",
              t === threshold
                ? "bg-emerald-400 text-zinc-950"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
            ].join(" ")}
          >
            {t}%
          </a>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total fades"
          value={String(stats.total)}
          hint={
            stats.unresolved > 0
              ? `${stats.unresolved} not yet graded`
              : "All graded"
          }
        />
        <StatCard
          label="Hit rate"
          value={
            stats.hitRatePct == null ? "—" : `${formatNumber(stats.hitRatePct, 1)}%`
          }
          hint={`${stats.wins}-${stats.losses}${
            stats.pushes ? `-${stats.pushes}` : ""
          }`}
          accent={
            stats.hitRatePct == null
              ? "neutral"
              : stats.hitRatePct >= 52.4
              ? "good"
              : "bad"
          }
        />
        <StatCard
          label="Units"
          value={`${stats.unitsWon >= 0 ? "+" : ""}${formatNumber(
            stats.unitsWon
          )}`}
          hint={`Risked ${formatNumber(stats.unitsRisked, 0)}u`}
          accent={
            stats.unitsWon > 0 ? "good" : stats.unitsWon < 0 ? "bad" : "neutral"
          }
        />
        <StatCard
          label="ROI"
          value={
            stats.roiPct == null
              ? "—"
              : `${stats.roiPct >= 0 ? "+" : ""}${formatNumber(stats.roiPct, 1)}%`
          }
          hint="Per unit risked"
          accent={
            stats.roiPct == null
              ? "neutral"
              : stats.roiPct >= 0
              ? "good"
              : "bad"
          }
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Error loading history: {error.message}
        </div>
      )}

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
          No fades recorded yet at the {threshold}% threshold. Flags accumulate
          as the scraper runs.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Sport</th>
                <th className="px-3 py-2">Game</th>
                <th className="px-3 py-2">Fade</th>
                <th className="px-3 py-2 text-right">Public%</th>
                <th className="px-3 py-2 text-right">Line</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Result</th>
                <th className="px-3 py-2 text-right">Units</th>
              </tr>
            </thead>
            <tbody>
              {records.map(({ outcome, flag, gr }) => {
                const matchup = flag.games
                  ? `${flag.games.away_team} @ ${flag.games.home_team}`
                  : "—";
                const units =
                  outcome == null
                    ? null
                    : profitUnits(outcome, flag.fade_line);
                const resultLabel =
                  outcome == null ? "Pending" : outcome.toUpperCase();
                const resultColor =
                  outcome === "win"
                    ? "text-emerald-400"
                    : outcome === "loss"
                    ? "text-rose-400"
                    : outcome === "push"
                    ? "text-zinc-400"
                    : "text-zinc-500";
                const rowTint =
                  outcome === "win"
                    ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                    : outcome === "loss"
                    ? "bg-rose-500/10 hover:bg-rose-500/15"
                    : "bg-zinc-950/40";
                return (
                  <tr
                    key={flag.id}
                    className={`border-t border-zinc-800 ${rowTint}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-zinc-400">
                      {formatDate(flag.flagged_at)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {sportLabel(flag.games?.sport ?? "")}
                    </td>
                    <td className="px-3 py-2">{matchup}</td>
                    <td className="px-3 py-2 font-medium text-emerald-300">
                      {flag.fade_team}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {formatNumber(flag.public_pct, 0)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {formatLine(flag.fade_line)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {gr ? `${gr.away_score}-${gr.home_score}` : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${resultColor}`}
                    >
                      {resultLabel}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        units == null
                          ? "text-zinc-500"
                          : units > 0
                          ? "text-emerald-400"
                          : units < 0
                          ? "text-rose-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {units == null
                        ? "—"
                        : `${units >= 0 ? "+" : ""}${formatNumber(units)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
