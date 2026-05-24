/**
 * HOT51 CDN Proxy — Cloudflare Worker
 *
 * Deploy ke: https://workers.cloudflare.com/
 *
 * Cara pakai:
 *   1. Buka https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste seluruh file ini
 *   3. Klik Save & Deploy
 *   4. Salin URL worker (misal: https://hot51-proxy.namaanda.workers.dev)
 *   5. Tambahkan di Replit Secrets:
 *        HOT51_CF_WORKER_URL = https://hot51-proxy.namaanda.workers.dev
 *
 * Worker ini menerima request proxy CDN dari server Replit,
 * lalu meneruskannya ke CDN Hot51 dengan IP Cloudflare (bypass geoblocking).
 *
 * Format request:
 *   GET https://worker.dev/?url=https://pull.cdnsi.com/live/501_roomId_key.flv
 */

const ALLOWED_DOMAINS = [
  "cdnsi.com",
  "livcdn.com",
  "fsccdn.com",
  "bcdn5.livcdn.com",
  "bcdn1.livcdn.com",
  "bcdn2.livcdn.com",
  "bcdn3.livcdn.com",
  "bcdn4.livcdn.com",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Accept, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type",
};

function isDomainAllowed(hostname) {
  return ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing ?url parameter", usage: "?url=https://pull.cdnsi.com/live/..." }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL parameter" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    if (!isDomainAllowed(parsedTarget.hostname)) {
      return new Response(
        JSON.stringify({ error: "Domain not allowed: " + parsedTarget.hostname }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const proxyHeaders = new Headers({
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; RMX2030) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Referer": "https://hot51.com/",
      "Origin": "https://hot51.com",
      "Connection": "keep-alive",
    });

    if (request.headers.get("Range")) {
      proxyHeaders.set("Range", request.headers.get("Range"));
    }

    try {
      const upstream = await fetch(targetUrl, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: proxyHeaders,
      });

      const responseHeaders = new Headers();
      const passthroughHeaders = [
        "content-type", "content-length", "content-range",
        "accept-ranges", "cache-control", "last-modified", "etag",
      ];
      for (const h of passthroughHeaders) {
        const v = upstream.headers.get(h);
        if (v) responseHeaders.set(h, v);
      }
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(k, v);
      }
      responseHeaders.set("X-Proxy-By", "hot51-cf-worker");
      responseHeaders.set("X-Target-Domain", parsedTarget.hostname);

      return new Response(
        request.method === "HEAD" ? null : upstream.body,
        { status: upstream.status, headers: responseHeaders }
      );
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Upstream fetch failed: " + e.message, target: targetUrl }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
  },
};
