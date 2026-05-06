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

      <Section title="The edge">
        <p>
          Sportsbooks don&rsquo;t set lines purely on team strength &mdash; they
          shade them to balance their action, which means lines drift toward
          whichever side the public is hammering. Once the crowd is lopsided
          enough, the book&rsquo;s number is no longer the true price; it&rsquo;s
          a price the book wants you to lay. Betting the other side recaptures
          the points the public has already paid for. This site finds those
          spots in real time and tracks every one so you can see whether the
          edge actually shows up in the data.
        </p>
      </Section>

      <Section title="Why 65%, and why only on game day">
        <p>
          Below 65%, the action is balanced enough that the book has no reason
          to move the line &mdash; both sides are getting bet, the price is
          honest, and there&rsquo;s no shading to exploit. Once one side crosses
          65%, the book has started shifting the number to discourage more
          money on that side, which is the moment value opens up on the
          opposite side.
        </p>
        <p>
          We only apply the rule on game day. Public % posted two or three days
          out is mostly noise &mdash; injury news hasn&rsquo;t dropped, casual
          bettors haven&rsquo;t weighed in yet, and sharp money tends to come in
          late. Acting on early numbers means acting before the market has
          actually formed. So games posted for tomorrow or the day after appear
          in Upcoming as informational only &mdash; matchup and time, no fade
          signal until the day of.
        </p>
      </Section>

      <Section title="Spread vs. moneyline by sport">
        <p>
          Spread bets are the dominant market in football and basketball, so
          for <span className="font-mono">NFL</span>,{" "}
          <span className="font-mono">NBA</span>,{" "}
          <span className="font-mono">NCAAF</span>, and{" "}
          <span className="font-mono">NCAAB</span>
          {" "}we track public % on the spread. That&rsquo;s where the public concentrates action and
          where the line-shading dynamic operates.
        </p>
        <p>
          Baseball and hockey are different. Run lines and puck lines are
          niche markets &mdash; the public bets the moneyline. So for{" "}
          <span className="font-mono">MLB</span> and{" "}
          <span className="font-mono">NHL</span> we track public % on the
          moneyline instead. The fade math just uses American odds for profit
          calculation rather than standard -110 juice.
        </p>
      </Section>

      <Section title="The two rules for moneyline fades">
        <p>
          Moneyline fades only work under two specific conditions. First, the
          public has to be backing the <em>favorite</em>, not the underdog.
          When the crowd piles on a -150 favorite, the book shifts the line
          toward -160 or -170 to discourage it &mdash; that shift creates value
          on the dog. When the crowd piles on a +150 underdog, the same
          shading dynamic doesn&rsquo;t exist; books rarely shorten an
          underdog price in response to public money. Public on a dog is just
          public on a dog &mdash; nothing to fade.
        </p>
        <p>
          Second, that favorite has to be priced at{" "}
          <span className="font-mono">-175</span>
          {" "}or shorter (i.e., closer to even). Once a favorite is longer than -175 &mdash; -200, -300,
          whatever &mdash; its implied win probability is high enough that the
          public is probably right and the dog is genuinely a bad price. Fading
          a -300 favorite means betting an underdog that should win ~25% of
          the time at +250 odds, which doesn&rsquo;t pay enough. The
          line-shading effect can&rsquo;t overcome that math.
        </p>
        <p>
          Combine those two rules and a moneyline fade only fires when the
          public is on a favorite priced between roughly -110 and -175. That
          window is where the value actually lives.
        </p>
      </Section>

      <Section title="Example">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
            NBA · Sunday, May 3 · Spread
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
          NBA is a spread sport, so we&rsquo;re tracking the spread. 68% of the
          public is on Toronto +8.5 &mdash; well past the 65% threshold. The
          book has been shading the line in Toronto&rsquo;s direction to balance
          the action, which means Cleveland -8.5 is now a stale (better) price
          on the unpopular side. We fade by laying{" "}
          <span className="font-medium text-emerald-300">Cleveland -8.5</span>{" "}
          at standard -110 juice. Cleveland wins by 9 or more, the fade wins
          (+0.91 units). Cleveland wins by exactly 8, push. Anything else, the
          fade loses 1 unit.
        </p>
        <p>
          This exact game is in the History page along with every other
          flagged fade. As more flags settle, the hit rate, unit total, and
          ROI numbers tell you whether the method is producing actual edge in
          the data &mdash; not just on paper.
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
