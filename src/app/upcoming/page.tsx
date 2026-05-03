export default function UpcomingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Upcoming</h1>
        <p className="mt-2 text-zinc-400">
          Games where the public is heavily on one side of the spread.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
        No data yet — scraper not wired up. Coming next.
      </div>
    </div>
  );
}
