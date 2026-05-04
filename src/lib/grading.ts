/**
 * Shared math for converting raw ATS / scores into fade outcomes and
 * profit-unit deltas. Used by the History page to compute summary stats.
 */

export type AwayAts = "win" | "loss" | "push";
export type FadeOutcome = "win" | "loss" | "push";

/**
 * Given the away team's outcome and the side we faded, return the fade's
 * outcome. If we fade home, our bet wins when away loses.
 */
export function fadeOutcome(
  awayAts: AwayAts,
  fadeSide: "away" | "home"
): FadeOutcome {
  if (awayAts === "push") return "push";
  if (fadeSide === "away") return awayAts;
  return awayAts === "win" ? "loss" : "win";
}

/**
 * Profit in units for a 1-unit bet:
 * - For moneyline (|line| >= 100): use American-odds profit math
 * - For spread / unknown line: assume -110 (-1 risk → 0.909 profit)
 */
export function profitUnits(outcome: FadeOutcome, fadeLine: number | null): number {
  if (outcome === "push") return 0;
  if (outcome === "loss") return -1;

  if (fadeLine != null && Math.abs(fadeLine) >= 100) {
    return fadeLine > 0 ? fadeLine / 100 : 100 / Math.abs(fadeLine);
  }
  return 10 / 11; // Standard -110 juice
}

export type Stats = {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  unresolved: number;
  hitRatePct: number | null;
  unitsRisked: number;
  unitsWon: number;
  roiPct: number | null;
};

export type FadeRecord = {
  outcome: FadeOutcome | null;
  fadeLine: number | null;
};

export function computeStats(records: FadeRecord[]): Stats {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let unresolved = 0;
  let unitsWon = 0;
  let unitsRisked = 0;

  for (const r of records) {
    if (r.outcome == null) {
      unresolved += 1;
      continue;
    }
    if (r.outcome === "win") wins += 1;
    else if (r.outcome === "loss") losses += 1;
    else pushes += 1;

    if (r.outcome !== "push") unitsRisked += 1;
    unitsWon += profitUnits(r.outcome, r.fadeLine);
  }

  const decided = wins + losses;
  const hitRatePct = decided === 0 ? null : (wins / decided) * 100;
  const roiPct = unitsRisked === 0 ? null : (unitsWon / unitsRisked) * 100;

  return {
    total: records.length,
    wins,
    losses,
    pushes,
    unresolved,
    hitRatePct,
    unitsRisked,
    unitsWon,
    roiPct,
  };
}
