# fanca-live

Live leaderboard (votes & rank) dari `api.fanca.io` menggunakan Next.js (App Router) + SWR, siap deploy ke Vercel.

## Jalankan lokal

```bash
npm i
cp .env.example .env.local    # sesuaikan bila perlu
npm run dev
# buka http://localhost:3000
```

## Deploy ke Vercel

1. Push ke GitHub (opsional) atau `vercel` langsung dari folder ini.
2. Di Vercel Dashboard → Project → **Environment Variables**, tambahkan variabel dari `.env.example`.
3. Deploy / Redeploy.

## Konfigurasi

- Interval refresh: `NEXT_PUBLIC_REFRESH_MS` (default 10000 ms).
- Parameter query default: `FANCA_KEY_CATEGORY`, `FANCA_TYPE_SORT`, `FANCA_TYPE_PERIOD`.
- UI: pencarian (search), sorting (rank, votes, %, nama), tabel desktop + kartu mobile.

## Catatan
- API route `/api/nominee` bertindak sebagai proxy agar aman dari CORS.
- Jika nanti perlu header auth khusus, tambahkan di `app/api/nominee/route.ts`.
