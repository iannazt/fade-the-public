export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-2 text-zinc-400">
          Every flagged fade since launch, with the result and a running record.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
        No flags recorded yet. Once the scraper runs, history will populate
        here.
      </div>
    </div>
  );
}
