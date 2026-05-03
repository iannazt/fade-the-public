import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Fade the public.
          <br />
          <span className="text-emerald-400">Track every bet they got wrong.</span>
        </h1>
        <p className="max-w-2xl text-lg text-zinc-300">
          When more than 65% of public bettors pile on one side of a spread, we
          flag it as a fade opportunity. Then we track every flag over time to
          see how profitable contrarian betting really is.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/upcoming"
          className="group rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition hover:border-emerald-400/60"
        >
          <div className="text-sm uppercase tracking-wider text-emerald-400">
            Upcoming
          </div>
          <div className="mt-2 text-2xl font-semibold">
            Today&apos;s fade opportunities
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Live games where the public is on one side past your threshold.
          </p>
        </Link>
        <Link
          href="/history"
          className="group rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition hover:border-emerald-400/60"
        >
          <div className="text-sm uppercase tracking-wider text-emerald-400">
            History
          </div>
          <div className="mt-2 text-2xl font-semibold">
            Hit rate, units, ROI
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Every past flag with the result and a running record.
          </p>
        </Link>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-sm uppercase tracking-wider text-zinc-400">
          Sports tracked
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["NBA", "MLB", "NHL", "EPL"].map((sport) => (
            <span
              key={sport}
              className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
            >
              {sport}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
