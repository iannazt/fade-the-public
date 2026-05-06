export const metadata = {
  title: "How It Works · Fade the Public",
  description: "How the fade-the-public method works on this site.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-zinc-300">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-2 text-zinc-400">
          The method behind every fade signal on this site.
        </p>
      </div>

      <Section title="What &ldquo;fading the public&rdquo; means">
        <p>
          Sportsbooks publish how the betting public is splitting their action
          on each game. When the crowd piles on one side &mdash; say 70% of all
          bets are on Team A &mdash; the contrarian play is to bet the other
          side, &ldquo;fading the public.&rdquo; The premise: bookmakers price
          lines partly to balance their action, so heavy public money on one
          side often signals a less-sharp market.
        </p>
        <p>
          This site flags those lopsided games for you and tracks the result of
          every flag over time, so you can see whether the contrarian
          philosophy actually held up &mdash; not just whether it sounds good.
        </p>
      </Section>

      <Section title="The 65% threshold &mdash; and why it&rsquo;s game-day only">
        <p>
          We mark a game as a fade candidate when at least 65% of public
          bettors are on one side of the spread (or moneyline). 65% is the
          tipping point where the market is meaningfully unbalanced without
          being a bad-line trap.
        </p>
        <p>
          We only apply the threshold on <em>game day</em>. Public % can shift
          a lot in the 48 hours leading up to a game, especially as injury
          news drops and casual bettors get involved. Earlier signals are too
          noisy to act on, so games posted for tomorrow or the day after
          appear in Upcoming as informational only &mdash; matchup and current
          public % shown, but no fade signal yet.
        </p>
      </Section>

      <Section title="Why spread for some sports, moneyline for others">
        <p>
          Spread bets are the natural action market in football and
          basketball, so we track public% on the spread for{" "}
          <span className="font-mono">NFL</span>,{" "}
          <span className="font-mono">NBA</span>,{" "}
          <span className="font-mono">NCAAF</span>, and{" "}
          <span className="font-mono">NCAAB</span>.
        </p>
        <p>
          For <span className="font-mono">MLB</span> and{" "}
          <span className="font-mono">NHL</span>, run lines and puck lines
          aren&rsquo;t the dominant market &mdash; the moneyline is. So we
          track public% on the moneyline instead. The fade math just changes
          slightly (American odds for profit instead of standard -110 juice).
        </p>
      </Section>

      <Section title="The -200 rule for moneyline fades">
        <p>
          On the moneyline, fading a heavy favorite is a trap. If the public
          is 70% on a -500 favorite, the market still implies that team wins
          ~83% of the time &mdash; the public is right, just expensive.
          Fading there means betting an underdog at +400 odds that should
          probably be +600.
        </p>
        <p>
          So for moneyline sports, we only flag a fade when the favorite is at{" "}
          <span className="font-mono">-200</span> or shorter (closer to even).
          A -180 favorite getting 70% of bets is interesting; a -500 favorite
          is just expected.
        </p>
      </Section>

      <Section title="Example walkthrough">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
            NBA · Sunday, May 3
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Toronto +8.5</span>
              <span className="text-zinc-100">68% public</span>
            </div>
            <div className="flex justify-between rounded bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-400/40">
              <span>Cleveland -8.5</span>
              <span className="rounded bg-emerald-400 px-2 text-zinc-950">
                FADE
              </span>
            </div>
          </div>
        </div>
        <p>
          Public is 68% on Toronto. We fade by recommending{" "}
          <span className="font-medium text-emerald-300">Cleveland -8.5</span>{" "}
          at standard -110 juice. If Cleveland wins by more than 8.5, the fade
          wins. We risk 1 unit to win 0.91. If Cleveland wins by exactly 8.5,
          push. Anything else, the fade loses 1 unit.
        </p>
        <p>
          The History page tracks every flagged fade like this one and
          computes hit rate, units won, and ROI as data accumulates.
        </p>
      </Section>

      <Section title="Disclaimer">
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          This site is for informational and entertainment purposes only.
          Nothing here is betting advice, financial advice, or a guarantee of
          results. Past performance of the fade method on this site does not
          predict future outcomes. If you choose to bet, do so responsibly
          with money you can afford to lose. If gambling is causing you harm,
          help is available at 1-800-GAMBLER.
        </p>
      </Section>
    </div>
  );
}
