import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function val(name: string, alt?: string) {
  return (process.env[name] && process.env[name]!.trim()) || (alt && process.env[alt] && process.env[alt]!.trim()) || "";
}
function missAny(...keys: string[]) {
  return !keys.some(k => process.env[k] && process.env[k]!.trim() !== "");
}

export async function GET() {
  // ===== ambil ENV dengan fallback ke nama versimu =====
  // base host / base url
  const baseHost = val("FANCA_API_BASE", "FANCA_BASE_URL"); // kamu pakai FANCA_BASE_URL
  const keyCategory = val("FANCA_CATEGORY_KEY", "FANCA_KEY_CATEGORY");
  const typeSort = val("FANCA_TYPE_SORT");
  const typePeriod = val("FANCA_TYPE_PERIOD");

  const xApiToken = val("FANCA_X_API_TOKEN");
  const fingerprint = val("FANCA_FINGERPRINT");
  const userAgent = val("FANCA_USER_AGENT", "FANCA_UA");

  // validasi env penting
  const missing: string[] = [];
  if (missAny("FANCA_API_BASE", "FANCA_BASE_URL")) missing.push("FANCA_API_BASE|FANCA_BASE_URL");
  if (!keyCategory) missing.push("FANCA_CATEGORY_KEY|FANCA_KEY_CATEGORY");
  if (!typeSort) missing.push("FANCA_TYPE_SORT");
  if (!typePeriod) missing.push("FANCA_TYPE_PERIOD");
  if (!xApiToken) missing.push("FANCA_X_API_TOKEN");
  if (!fingerprint) missing.push("FANCA_FINGERPRINT");
  if (!userAgent) missing.push("FANCA_USER_AGENT|FANCA_UA");

  if (missing.length) {
    return NextResponse.json({ error: "missing env", missing }, { status: 500 });
  }

  // ===== susun URL =====
  // Jika FANCA_BASE_URL sudah berisi /event/nominee, pakai langsung; kalau belum, tambahkan path.
  const base = baseHost.includes("/event/nominee")
    ? baseHost
    : `${baseHost.replace(/\/+$/, "")}/event/nominee`;

  const url = `${base}?keyCategory=${encodeURIComponent(keyCategory)}&typeSort=${encodeURIComponent(typeSort)}&typePeriod=${encodeURIComponent(typePeriod)}`;

  // ===== header minimal yang penting =====
  const headers: Record<string, string> = {
    "user-agent": userAgent,                 // HAPUS tanda kutip di ENV!
    "x-api-token": xApiToken,
    "fingerprint": fingerprint,
    "accept": "application/json",
    "content-type": "application/json",
    "accept-language": process.env.FANCA_ACCEPT_LANGUAGE || "en-US",
    "community-tab-index": process.env.FANCA_COMMUNITY_TAB_INDEX || "0",
    "community-translate-type": process.env.FANCA_COMMUNITY_TRANSLATE_TYPE || "true",
    "community-display-type": process.env.FANCA_COMMUNITY_DISPLAY_TYPE || "list",
    "select-language": process.env.FANCA_SELECT_LANGUAGE || "en",
    "app-ver": process.env.FANCA_APP_VER || "1.0.35",
    "version": process.env.FANCA_VERSION || "1.0.35",
    "device-model": process.env.FANCA_DEVICE_MODEL || "2107113SI",
    "device": process.env.FANCA_DEVICE || "1",
    "package": process.env.FANCA_PACKAGE || "com.contentsmadang.fancast",
    "os-ver": process.env.FANCA_OS_VER || "9",
    "flavor": process.env.FANCA_FLAVOR || "product",
    "build-mode": process.env.FANCA_BUILD_MODE || "release",
    // konteks web (kadang diperlukan untuk lolos 403)
    "origin": `https://${process.env.VERCEL_URL ?? "localhost:3000"}`,
    "referer": `https://${process.env.VERCEL_URL ?? "localhost:3000"}/`,
  };

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      // @ts-expect-error
      next: { revalidate: 0 },
    });

    const text = await res.text();

    if (!res.ok) {
      return new NextResponse(
        JSON.stringify({
          error: "upstream error",
          upstreamStatus: res.status,
          body: text.slice(0, 4000),
        }),
        { status: res.status, headers: { "content-type": "application/json" } }
      );
    }

    const resp = new NextResponse(text, { status: 200, headers: { "content-type": "application/json" } });
    resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return resp;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 500 });
  }
}
