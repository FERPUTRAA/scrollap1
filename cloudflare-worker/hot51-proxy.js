/**
 * HOT51 CDN + ComHub API Proxy — Cloudflare Worker
 *
 * Deploy ke: https://workers.cloudflare.com/
 *
 * Cara pakai:
 *   1. Buka https://dash.cloudflare.com → Workers & Pages → buka worker kamu
 *   2. Klik Edit code → paste seluruh file ini → Save & Deploy
 *
 * Mode 1 — CDN proxy (Hot51 stream):
 *   GET https://worker.dev/?url=https://pull.cdnsi.com/live/501_roomId_key.flv
 *
 * Mode 2 — ComHub API proxy (bypass IP block):
 *   POST https://worker.dev/comhub?path=/vchat/app/live/livingList
 *   GET  https://worker.dev/comhub?path=/vchat/app/live/list?page=1&pageSize=20
 */

const ALLOWED_CDN_DOMAINS = [
  "cdnsi.com",
  "livcdn.com",
  "fsccdn.com",
  "bcdn5.livcdn.com",
  "bcdn1.livcdn.com",
  "bcdn2.livcdn.com",
  "bcdn3.livcdn.com",
  "bcdn4.livcdn.com",
];

const COMHUB_BASE = "https://www.comhub.live";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Accept, Content-Type, token, userId, timestamp, CheckSum, serverVersion, appVersion, channel, bundleId, deviceType, deviceId, gender, channelStatus, countryCode, language, PhoneModel",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type",
};

function isCdnAllowed(hostname) {
  return ALLOWED_CDN_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Mode 2: ComHub API proxy ──────────────────────────────────
    // Matches /comhub or /comhub?path=...
    if (url.pathname === "/comhub" || url.pathname.startsWith("/comhub/")) {
      const apiPath = url.searchParams.get("path") ?? url.pathname.replace(/^\/comhub/, "");
      if (!apiPath) {
        return jsonResponse({ error: "Missing ?path parameter" }, 400);
      }

      // Preserve any extra query params from the path value itself
      const targetUrl = `${COMHUB_BASE}${apiPath}`;

      const fwdHeaders = new Headers();
      const PASSTHROUGH = [
        "content-type", "accept", "token", "userid", "timestamp", "checksum",
        "serverversion", "appversion", "channel", "bundleid", "devicetype",
        "deviceid", "gender", "channelstatus", "countrycode", "language",
        "phonemodel", "user-agent",
      ];
      for (const h of PASSTHROUGH) {
        const v = request.headers.get(h);
        if (v) fwdHeaders.set(h, v);
      }
      fwdHeaders.set("origin",  "https://www.comhub.live");
      fwdHeaders.set("referer", "https://www.comhub.live/");
      if (!fwdHeaders.has("user-agent")) {
        fwdHeaders.set("user-agent", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36");
      }

      let body = undefined;
      if (request.method === "POST") {
        body = await request.text();
        if (!fwdHeaders.has("content-type")) {
          fwdHeaders.set("content-type", "application/json");
        }
      }

      try {
        const upstream = await fetch(targetUrl, {
          method: request.method,
          headers: fwdHeaders,
          body,
        });
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/json",
            ...CORS_HEADERS,
          },
        });
      } catch (e) {
        return jsonResponse({ error: "ComHub upstream failed: " + e.message }, 502);
      }
    }

    // ── Mode 1: CDN stream proxy ──────────────────────────────────
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return jsonResponse({
        error: "Missing ?url parameter",
        usage: "?url=https://pull.cdnsi.com/live/... OR /comhub?path=/vchat/app/...",
      }, 400);
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return jsonResponse({ error: "Invalid URL parameter" }, 400);
    }

    if (!isCdnAllowed(parsedTarget.hostname)) {
      return jsonResponse({ error: "Domain not allowed: " + parsedTarget.hostname }, 403);
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
      return jsonResponse({ error: "Upstream fetch failed: " + e.message, target: targetUrl }, 502);
    }
  },
};
