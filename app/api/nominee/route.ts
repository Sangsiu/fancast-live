import { NextResponse } from "next/server";

export const runtime = "nodejs";          // pastikan node runtime
export const dynamic = "force-dynamic";   // jangan cache di Vercel
export const revalidate = 0;

export async function GET() {
  const base = process.env.FANCA_API_BASE || "https://api.fanca.io";
  const url = `${base}/event/nominee?keyCategory=${process.env.FANCA_CATEGORY_KEY}&typeSort=${process.env.FANCA_TYPE_SORT}&typePeriod=${process.env.FANCA_TYPE_PERIOD}`;

  // ⚠️ Gunakan header yang perlu saja. Jangan set "host", "connection", "accept-encoding"
  const headers: Record<string, string> = {
    "user-agent": process.env.FANCA_USER_AGENT || "Dart/3.7 (dart:io)",
    "x-api-token": process.env.FANCA_X_API_TOKEN || "",
    "fingerprint": process.env.FANCA_FINGERPRINT || "",
    "content-type": "application/json",
    "accept-language": "en-US",
    "community-tab-index": "0",
    "community-translate-type": "true",
    "community-display-type": "list",
    "select-language": "en",
    "app-ver": "1.0.35",
    "version": "1.0.35",
    "device-model": "2107113SI",
    "device": "1",
    "package": "com.contentsmadang.fancast",
    "os-ver": "9",
    "flavor": "product",
    "build-mode": "release",
  };

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      // @ts-expect-error next option
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "upstream error", upstreamStatus: res.status, body: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const resp = NextResponse.json(data, { status: 200 });
    resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return resp;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 500 });
  }
}
