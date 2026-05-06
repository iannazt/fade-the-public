import { SPORT_LABEL } from "@/lib/sports";

type Props = {
  sport: string;
  awayTeam: string;
  homeTeam: string;
  awayLine: number | null;
  homeLine: number | null;
  awayPublicPct: number | null;
  homePublicPct: number | null;
  startsAtText: string | null;
  threshold: number;
  /** Which side to label as the fade pick. Null = no signal (future day). */
  fadePick: "away" | "home" | null;
};

function formatLine(n: number | null): string {
  if (n == null) return "—";
  if (n === 0) return "PK";
  return n > 0 ? `+${n}` : String(n);
}

function sportLabel(sport: string): string {
  return (SPORT_LABEL as Record<string, string>)[sport] ?? sport.toUpperCase();
}

export default function GameCard({
  sport,
  awayTeam,
  homeTeam,
  awayLine,
  homeLine,
  awayPublicPct,
  homePublicPct,
  startsAtText,
  threshold,
  fadePick,
}: Props) {
  const awayHigh = awayPublicPct != null && awayPublicPct >= threshold;
  const homeHigh = homePublicPct != null && homePublicPct >= threshold;

  const sideRow = (
    label: string,
    team: string,
    line: number | null,
    pct: number | null,
    isPublicHeavy: boolean,
    isFadePick: boolean
  ) => (
    <div
      className={[
        "flex items-center justify-between rounded-md px-3 py-2",
        isFadePick
          ? "bg-emerald-500/10 ring-1 ring-emerald-400/50"
          : isPublicHeavy
          ? "bg-zinc-800/80"
          : "bg-zinc-900/40",
      ].join(" ")}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="font-medium">{team}</span>
        <span className="font-mono text-sm text-zinc-400">
          {formatLine(line)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isFadePick && (
          <span className="rounded bg-emerald-400 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-950">
            Fade
          </span>
        )}
        <span
          className={[
            "font-mono text-sm tabular-nums",
            isPublicHeavy ? "text-zinc-100" : "text-zinc-500",
          ].join(" ")}
        >
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>
    </div>
  );

  const isFadeCard = fadePick != null;

  return (
    <article
      className={[
        "rounded-lg border bg-zinc-900 p-4",
        isFadeCard
          ? "border-emerald-400/50 ring-1 ring-emerald-400/40"
          : "border-zinc-800",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
        <span className="rounded bg-zinc-800 px-2 py-0.5 font-semibold uppercase tracking-wider text-zinc-300">
          {sportLabel(sport)}
        </span>
        {startsAtText && <span>{startsAtText}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        {sideRow(
          "Away",
          awayTeam,
          awayLine,
          awayPublicPct,
          awayHigh,
          fadePick === "away"
        )}
        {sideRow(
          "Home",
          homeTeam,
          homeLine,
          homePublicPct,
          homeHigh,
          fadePick === "home"
        )}
      </div>
    </article>
  );
}
