"use client";

import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";

type Nominee = {
  keyNominee: number;
  subject: string;
  etc: string | null;
  rank: number;
  count: number;
  percent: number;
};
type FancaResponse = { status: { code: number; message: string }, nominee: Nominee[] };

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? 10000);
const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then(r => r.json());

function fmtNum(n: number) { return new Intl.NumberFormat("en-US").format(n); }
function cls(...s: (string | false | null | undefined)[]) { return s.filter(Boolean).join(" "); }
function trendArrow(delta: number) { return delta > 0 ? "▲" : delta < 0 ? "▼" : "—"; }

export default function Leaderboard() {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"rank"|"count"|"percent"|"subject">("rank");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  // bump key untuk hard refresh (tombol)
  const [bump, setBump] = useState(0);
  const swrKey = `/api/nominee?b=${bump}`;

  const { data, error, isLoading, mutate, isValidating } = useSWR<FancaResponse>(swrKey, fetcher, {
    refreshInterval: REFRESH_MS,
    revalidateOnFocus: true,
  });

  // ====== SNAPSHOT YANG BENAR ======
  // lastRef = snapshot "sekarang" (map dari payload terakhir)
  // prevRef = snapshot "sebelumnya" (siklus sebelum lastRef)
  type Snap = { count: number; percent: number; rank: number };
  const lastRef = useRef<Record<number, Snap>>({});
  const prevRef = useRef<Record<number, Snap>>({});
  const lastSigRef = useRef<string>("");

  // signature untuk deteksi data benar-benar berubah
  const sig = useMemo(() => {
    const rows = data?.nominee ?? [];
    return rows.map(n => `${n.keyNominee}:${n.count}:${n.percent}:${n.rank}`).join("|");
  }, [data?.nominee]);

  useEffect(() => {
    if (!data?.nominee) return;

    // Hanya geser snapshot kalau SIG berubah (artinya ada data baru dari upstream)
    if (sig && sig !== lastSigRef.current) {
      const newMap: Record<number, Snap> = {};
      for (const n of data.nominee) {
        newMap[n.keyNominee] = { count: n.count, percent: n.percent, rank: n.rank };
      }
      // geser: prev <- last, last <- new
      prevRef.current = lastRef.current;
      lastRef.current = newMap;
      lastSigRef.current = sig;
    }
  }, [sig, data?.nominee]);

  const rows = data?.nominee ?? [];

  // Top-3 selalu tampil dari rows keseluruhan
  const [top1, top2, top3] = useMemo(() => {
    if (!rows.length) return [undefined, undefined, undefined] as (Nominee|undefined)[];
    const s = [...rows].sort((a,b)=>a.rank-b.rank);
    return [s[0], s[1], s[2]];
  }, [rows]);

  // Filter + sort untuk tabel
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let arr = rows;
    if (kw) {
      arr = arr.filter(x =>
        x.subject.toLowerCase().includes(kw) ||
        (x.etc ?? "").toLowerCase().includes(kw)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sortKey === "subject") return a.subject.localeCompare(b.subject) * dir;
      if (sortKey === "rank") return (a.rank - b.rank) * dir;
      if (sortKey === "count") return (a.count - b.count) * dir;
      if (sortKey === "percent") return (a.percent - b.percent) * dir;
      return 0;
    });
  }, [rows, q, sortKey, sortDir]);

  const hardRefresh = () => {
    setBump(b => b + 1); // ubah key → paksa fetch
    mutate();            // minta revalidate juga
  };

  return (
    <div className="space-y-8">
      {/* Header / Controls */}
      <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
              <span className={cls("inline-block h-2 w-2 rounded-full bg-emerald-500", isValidating && "animate-pulse")}></span>
              Live
              <span className="opacity-70">• refresh {Math.round(REFRESH_MS/1000)}s</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">KGMA 2025 - Trend of the Year Final Round Vote</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              @2025 Copyright Sangsiu.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex gap-2">
              <select
                className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                value={`${sortKey}-${sortDir}`}
                onChange={e => {
                  const [k,d] = e.target.value.split("-");
                  setSortKey(k as any); setSortDir(d as any);
                }}
              >
                <option value="rank-asc">Rank ↑</option>
                <option value="rank-desc">Rank ↓</option>
                <option value="count-desc">Votes ↓</option>
                <option value="count-asc">Votes ↑</option>
                <option value="percent-desc">% ↓</option>
                <option value="percent-asc">% ↑</option>
                <option value="subject-asc">Nama A–Z</option>
                <option value="subject-desc">Nama Z–A</option>
              </select>
              <button
                onClick={hardRefresh}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 shadow-sm"
              >
                Refresh
              </button>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {isLoading ? "Mengambil data…" : error ? "Gagal mengambil data." : `Total: ${rows.length} nominee`}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="flex items-center rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-60"><path fill="currentColor" d="m21.53 20.47l-4.8-4.8A7.92 7.92 0 0 0 18 10a8 8 0 1 0-8 8a7.92 7.92 0 0 0 5.67-1.27l4.8 4.8l1.06-1.06zM4 10a6 6 0 1 1 6 6a6 6 0 0 1-6-6"/></svg>
            <input
              className="ml-2 w-full bg-transparent outline-none text-sm"
              placeholder="Cari nama atau brand..."
              value={q}
              onChange={(e)=>setQ(e.target.value)}
            />
            {q && (
              <button onClick={()=>setQ("")} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Clear</button>
            )}
          </div>
        </div>
      </section>

      {/* Podium Top-3 selalu tampil bila ada data */}
      {rows.length > 0 && (
        <section>
          <h2 className="sr-only">Top 3</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <PodiumCard place={2} data={top2} subtle />
            <PodiumCard place={1} data={top1} big />
            <PodiumCard place={3} data={top3} subtle />
          </div>
        </section>
      )}

      {/* Error panel (tetap render podium jika rows ada) */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="text-sm font-medium text-red-700 dark:text-red-300">Tidak dapat memuat data terbaru.</div>
          <div className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">Cek token/header proxy atau koneksi.</div>
          <div className="mt-3">
            <button onClick={hardRefresh} className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700">Coba lagi</button>
          </div>
        </div>
      )}

      {/* Tabel desktop */}
      <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="hidden md:block">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur z-10">
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Votes Before</th>
                  <th className="px-4 py-3 text-right">Votes Now</th>
                  <th className="px-4 py-3 text-right">Δ</th>
                  <th className="px-4 py-3 text-right">Persen</th>
                  <th className="px-4 py-3 w-[200px]">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading ? (
                  Array.from({length:8}).map((_,i)=> <RowSkeleton key={i} />)
                ) : filtered.map(nm => {
                  const beforeCount = prevRef.current[nm.keyNominee]?.count ?? nm.count; // pada fetch pertama: before=now
                  const delta = nm.count - beforeCount;
                  const deltaClass = delta > 0 ? "text-emerald-600 dark:text-emerald-400"
                                   : delta < 0 ? "text-red-600 dark:text-red-400"
                                   : "text-zinc-500";
                  return (
                    <tr key={nm.keyNominee} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-semibold tabular-nums">#{nm.rank}</td>
                      <td className="px-4 py-3">{nm.subject}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{nm.etc ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtNum(beforeCount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtNum(nm.count)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={cls("inline-flex items-center gap-1 font-medium", deltaClass)}>
                          <span>{trendArrow(delta)}</span>
                          <span>{delta === 0 ? "0" : `+${fmtNum(delta)}`.replace("+-", "-")}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{nm.percent.toFixed(2)}%</td>
                      <td className="px-4 py-3"><Progress value={nm.percent} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {isLoading
            ? Array.from({length:6}).map((_,i)=> <CardSkeleton key={i} />)
            : filtered.map(nm => {
              const beforeCount = prevRef.current[nm.keyNominee]?.count ?? nm.count;
              const delta = nm.count - beforeCount;
              const deltaClass = delta > 0 ? "text-emerald-700 dark:text-emerald-300"
                               : delta < 0 ? "text-red-600 dark:text-red-400"
                               : "text-zinc-500";
              return (
                <div key={nm.keyNominee} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Rank</div>
                      <div className="text-lg font-bold tabular-nums">#{nm.rank}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{nm.subject}</div>
                      <div className="text-xs text-zinc-500 truncate">{nm.etc ?? "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{fmtNum(nm.count)}</div>
                      <div className="text-xs text-zinc-500">now</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="text-zinc-500">before: <span className="tabular-nums">{fmtNum(beforeCount)}</span></div>
                    <div className={cls("font-semibold tabular-nums", deltaClass)}>
                      {trendArrow(delta)} {delta === 0 ? "0" : `+${fmtNum(delta)}`.replace("+-", "-")}
                    </div>
                  </div>

                  <div className="mt-3"><Progress value={nm.percent} /></div>
                </div>
              );
            })
          }
        </div>
      </section>
    </div>
  );
}

/* ========= Sub-components ========= */

function PodiumCard({ place, data, big = false, subtle = false }:{
  place: 1|2|3; data?: Nominee; big?: boolean; subtle?: boolean;
}) {
  const ring = place === 1 ? "from-amber-400 to-yellow-500"
            : place === 2 ? "from-slate-300 to-slate-400"
            : "from-amber-700 to-amber-600";
  return (
    <div className={cls(
      "rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5",
      big ? "bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950" : "bg-white/60 dark:bg-zinc-900/60 backdrop-blur"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cls(
            "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow",
            "bg-gradient-to-br", ring
          )}>{place}</span>
          <div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Posisi</div>
            <div className="text-lg font-semibold">{data?.subject ?? "—"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">{data?.etc ?? "—"}</div>
          <div className="text-xl font-bold tabular-nums">{data ? fmtNum(data.count) : "—"}</div>
        </div>
      </div>
      <div className="mt-4">
        <Progress value={data?.percent ?? 0} />
      </div>
    </div>
  );
}

function Progress({ value }:{ value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" style={{ width: `${v}%` }} />
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-20 ml-auto rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-20 ml-auto rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-12 ml-auto rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-12 ml-auto rounded bg-zinc-200 dark:bg-zinc-800"/></td>
      <td className="px-4 py-3"><div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"/></td>
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-6 w-10 rounded bg-zinc-200 dark:bg-zinc-800"/>
        <div className="flex-1 min-w-0">
          <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800"/>
          <div className="mt-2 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800"/>
        </div>
        <div className="h-6 w-16 rounded bg-zinc-200 dark:bg-zinc-800"/>
      </div>
      <div className="mt-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800"/>
    </div>
  );
}
