import Leaderboard from "@/components/Leaderboard";

export default function Page() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Leaderboard />
      <footer className="mt-10 text-xs text-zinc-500 dark:text-zinc-400">
        Sumber data: <code>api.fanca.io</code> via proxy serverless. UI auto-refresh & dark mode siap produksi.
      </footer>
    </main>
  );
}
