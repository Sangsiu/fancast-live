import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const BASE_URL =
  process.env.FANCA_BASE_URL ??
  "https://api.fanca.io/event/nominee";

// —— Helper: bangun URL upstream dari query / ENV
function buildUpstreamURL(request: Request) {
  const url = new URL(request.url);
  const keyCategory = url.searchParams.get("keyCategory") ?? process.env.FANCA_KEY_CATEGORY ?? "627";
  const typeSort    = url.searchParams.get("typeSort")    ?? process.env.FANCA_TYPE_SORT    ?? "1";
  const typePeriod  = url.searchParams.get("typePeriod")  ?? process.env.FANCA_TYPE_PERIOD  ?? "1";
  return `${BASE_URL}?keyCategory=${encodeURIComponent(keyCategory)}&typeSort=${encodeURIComponent(typeSort)}&typePeriod=${encodeURIComponent(typePeriod)}`;
}

// —— Header HARUS mirip request mobile kamu (ambil dari ENV)
function buildHeaders() {
  return {
    // Wajib / penting
    "user-agent": process.env.FANCA_UA ?? "Dart/3.7 (dart:io)",
    "x-api-token": process.env.FANCA_X_API_TOKEN ?? "",

    // Header lain yang kamu tunjukkan (boleh diubah via ENV)
    "connection": "Keep-Alive",
    "accept-encoding": "gzip",
    "accept-language": process.env.FANCA_ACCEPT_LANGUAGE ?? "en-US",
    "content-type": "application/json",
    "community-tab-index": process.env.FANCA_COMMUNITY_TAB_INDEX ?? "0",
    "fingerprint": process.env.FANCA_FINGERPRINT ?? "",
    "system-language": process.env.FANCA_SYSTEM_LANGUAGE ?? "en-US",
    "community-translate-type": process.env.FANCA_COMMUNITY_TRANSLATE_TYPE ?? "true",
    "app-ver": process.env.FANCA_APP_VER ?? "1.0.35",
    "device-model": process.env.FANCA_DEVICE_MODEL ?? "2107113SI",
    "flavor": process.env.FANCA_FLAVOR ?? "product",
    "build-mode": process.env.FANCA_BUILD_MODE ?? "release",
    "version": process.env.FANCA_VERSION ?? "1.0.35",
    "device": process.env.FANCA_DEVICE ?? "1",
    "package": process.env.FANCA_PACKAGE ?? "com.contentsmadang.fancast",
    "host": process.env.FANCA_HOST ?? "api.fanca.io",
    "os-ver": process.env.FANCA_OS_VER ?? "9",
    "brightness": process.env.FANCA_BRIGHTNESS ?? "light",
    "community-display-type": process.env.FANCA_COMMUNITY_DISPLAY_TYPE ?? "list",
    "select-language": process.env.FANCA_SELECT_LANGUAGE ?? "en",
  } as Record<string, string>;
}

/**
 * Proxy anti-CORS dengan header 1:1 versi mobile + timeout dan error detail.
 */
export async function GET(request: Request) {
  const upstream = buildUpstreamURL(request);

  // Timeout 12 detik
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(upstream, {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();

    if (!res.ok) {
      // teruskan error agar kelihatan penyebab 403/429/5xx
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          upstream,
          bodySample: text.slice(0, 800),
        },
        { status: res.status }
      );
    }

    // validasi minimal
    try {
      const json = JSON.parse(text);
      if (!json?.status || !Array.isArray(json?.nominee)) {
        return NextResponse.json(
          { ok: false, error: "Unexpected payload shape", upstream, bodySample: text.slice(0, 800) },
          { status: 502 }
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON from upstream", upstream, bodySample: text.slice(0, 800) },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Upstream timeout (12s)" : (e?.message ?? "Proxy error");
    return NextResponse.json({ ok: false, error: msg, upstream }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
