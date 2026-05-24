import { Router, type Request, type Response } from "express";
import { fetch as undiciFetch } from "undici";

const comhubRouter = Router();

const COMHUB_BASE = "https://api.comhubapp.net";
export const ZEGO_APP_ID = 2273782735;

interface ComHubCreds {
  authToken: string;
  userId: string;
  valid: boolean;
}

let CREDS: ComHubCreds = {
  authToken: process.env.COMHUB_AUTH_TOKEN ?? "",
  userId: process.env.COMHUB_USER_ID ?? "",
  valid: !!(process.env.COMHUB_AUTH_TOKEN),
};

// ── SSE broadcast hub ──────────────────────────────────────────────
type SSEEmitter = (event: string, data: unknown) => void;
const sseCHClients = new Set<SSEEmitter>();
function broadcastCHSSE(event: string, data: unknown) {
  for (const fn of sseCHClients) { try { fn(event, data); } catch {} }
}

function buildHeaders(authToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${authToken}`,
    "token": authToken,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "ComHub/1.4.51 (Android; Mobile) okhttp/4.9.0",
    "platform": "2",
    "version": "1.4.51",
    "lang": "id",
    "channel": "Google",
  };
}

async function comhubGet(path: string, cred: ComHubCreds): Promise<unknown> {
  const res = await undiciFetch(`${COMHUB_BASE}${path}`, {
    method: "GET",
    headers: buildHeaders(cred.authToken),
    signal: AbortSignal.timeout(12_000),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Bad JSON from ${path}: ${text.slice(0, 200)}`); }
}

async function comhubPost(path: string, body: Record<string, unknown>, cred?: ComHubCreds): Promise<unknown> {
  const headers = cred ? buildHeaders(cred.authToken) : {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "ComHub/1.4.51 (Android; Mobile) okhttp/4.9.0",
    "platform": "2",
    "version": "1.4.51",
    "lang": "id",
    "channel": "Google",
  };
  const res = await undiciFetch(`${COMHUB_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Bad JSON from ${path}: ${text.slice(0, 200)}`); }
}

// ── Raw API response types ────────────────────────────────────────
interface CHApiResponse<T = unknown> {
  code?: number;
  msg?: string;
  message?: string;
  data?: T;
  status?: number;
}

interface CHLiveRoom {
  userId?: number;
  uid?: number;
  id?: number;
  liveId?: string;
  live_id?: string;
  roomId?: string;
  room_id?: string;
  nickname?: string;
  name?: string;
  username?: string;
  avatar?: string;
  headImg?: string;
  head_img?: string;
  coverUrl?: string;
  cover?: string;
  coverImg?: string;
  viewerCount?: number;
  onlineNum?: number;
  online_num?: number;
  userCount?: number;
  streamId?: string;
  stream_id?: string;
  pullUrl?: string;
  pull_url?: string;
  title?: string;
  roomTitle?: string;
  room_title?: string;
  tags?: string[];
  countryCode?: string;
  country?: string;
}

interface NormalizedRoom {
  userId: number;
  liveId: string;
  roomId: string;
  nickname: string;
  avatar: string;
  coverUrl: string;
  viewerCount: number;
  streamId: string;
  title: string;
  countryCode: string;
}

function normalizeRoom(r: CHLiveRoom): NormalizedRoom {
  return {
    userId: r.userId ?? r.uid ?? r.id ?? 0,
    liveId: r.liveId ?? r.live_id ?? r.roomId ?? r.room_id ?? "",
    roomId: r.roomId ?? r.room_id ?? r.liveId ?? r.live_id ?? "",
    nickname: r.nickname ?? r.name ?? r.username ?? "Host",
    avatar: r.avatar ?? r.headImg ?? r.head_img ?? "",
    coverUrl: r.coverUrl ?? r.cover ?? r.coverImg ?? "",
    viewerCount: r.viewerCount ?? r.onlineNum ?? r.online_num ?? r.userCount ?? 0,
    streamId: r.streamId ?? r.stream_id ?? r.pullUrl ?? r.pull_url ?? "",
    title: r.title ?? r.roomTitle ?? r.room_title ?? "",
    countryCode: r.countryCode ?? r.country ?? "ID",
  };
}

// ── GET /comhub/status ────────────────────────────────────────────
comhubRouter.get("/comhub/status", (_req: Request, res: Response) => {
  res.json({ authenticated: CREDS.valid && !!CREDS.authToken, userId: CREDS.userId });
});

// ── GET /comhub/credentials ───────────────────────────────────────
comhubRouter.get("/comhub/credentials", (_req: Request, res: Response) => {
  res.json({
    authenticated: CREDS.valid && !!CREDS.authToken,
    userId: CREDS.userId,
    hasToken: !!CREDS.authToken,
    tokenPreview: CREDS.authToken ? `${CREDS.authToken.slice(0, 8)}...` : "",
  });
});

// ── POST /comhub/credentials ──────────────────────────────────────
comhubRouter.post("/comhub/credentials", async (req: Request, res: Response) => {
  const { authToken, userId } = req.body as { authToken?: string; userId?: string };
  if (!authToken?.trim()) return res.status(400).json({ success: false, error: "authToken diperlukan" });

  CREDS = { authToken: authToken.trim(), userId: userId?.trim() ?? "", valid: true };

  try {
    const r = await comhubGet("/api/v1/chatAccount/info", CREDS) as CHApiResponse<{ userId?: number; id?: number; nickname?: string; username?: string }>;
    if ((r?.code === 200 || r?.status === 200) && r.data) {
      const uid = r.data.userId ?? r.data.id;
      if (uid) CREDS.userId = String(uid);
      return res.json({ success: true, userId: CREDS.userId, nickname: r.data.nickname ?? r.data.username });
    }
    if (r?.code === 401 || r?.code === 403) {
      CREDS.valid = false;
      return res.json({ success: false, error: "Token tidak valid" });
    }
  } catch {}

  return res.json({ success: true, userId: CREDS.userId });
});

// ── POST /comhub/login ────────────────────────────────────────────
comhubRouter.post("/comhub/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ success: false, error: "email dan password diperlukan" });

  try {
    const data = await comhubPost("/api/v1/login/email/login", { email, password }) as CHApiResponse<{
      token?: string; userId?: number; id?: number; nickname?: string; username?: string;
    }>;

    if ((data?.code === 200 || data?.status === 200) && data.data?.token) {
      const uid = data.data.userId ?? data.data.id;
      CREDS = { authToken: data.data.token, userId: String(uid ?? ""), valid: true };
      broadcastCHSSE("auth_success", { userId: CREDS.userId });
      return res.json({
        success: true, authToken: data.data.token,
        userId: CREDS.userId, nickname: data.data.nickname ?? data.data.username,
      });
    }

    return res.json({ success: false, error: data?.msg ?? data?.message ?? "Login gagal", code: data?.code });
  } catch (err: unknown) {
    return res.status(502).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── GET /comhub/living ────────────────────────────────────────────
comhubRouter.get("/comhub/living", async (_req: Request, res: Response) => {
  if (!CREDS.valid || !CREDS.authToken) {
    return res.json({ success: false, needAuth: true, error: "auth_required", rooms: [] });
  }

  try {
    const data = await comhubGet("/api/v1/live/livingList", CREDS) as CHApiResponse<{
      list?: CHLiveRoom[];
      records?: CHLiveRoom[];
      rows?: CHLiveRoom[];
      total?: number;
      hasMore?: boolean;
    }>;

    if (data?.code === 401 || data?.code === 403 || data?.status === 401) {
      CREDS.valid = false;
      return res.json({ success: false, needAuth: true, error: "auth_required", rooms: [] });
    }

    if (data?.code !== 200 && data?.status !== 200 && data?.code !== undefined) {
      return res.json({ success: false, error: `API ${data.code}: ${data.msg ?? data.message ?? "error"}`, rooms: [], raw: data });
    }

    const rawList = data?.data?.list ?? data?.data?.records ?? data?.data?.rows ?? (Array.isArray(data?.data) ? (data?.data as CHLiveRoom[]) : []);
    const rooms = rawList.map(normalizeRoom).filter(r => r.liveId || r.roomId);

    return res.json({ success: true, rooms, total: rooms.length, rawSample: rawList.slice(0, 1) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ success: false, error: msg, rooms: [] });
  }
});

// ── POST /comhub/enter ────────────────────────────────────────────
comhubRouter.post("/comhub/enter", async (req: Request, res: Response) => {
  const { liveId, roomId } = req.body as { liveId?: string; roomId?: string };
  const rid = liveId ?? roomId;
  if (!CREDS.valid || !CREDS.authToken) return res.status(401).json({ success: false, error: "auth_required" });
  if (!rid) return res.status(400).json({ success: false, error: "liveId atau roomId diperlukan" });

  try {
    const [enterResult, streamResult] = await Promise.allSettled([
      comhubPost("/api/v1/live/enterLive", { liveId: rid, roomId: rid }, CREDS),
      comhubPost("/api/v1/live/playStream", { liveId: rid, roomId: rid }, CREDS),
    ]);

    interface EnterData {
      zegoToken?: string; token?: string; roomToken?: string;
      roomId?: string; room_id?: string;
      streamId?: string; stream_id?: string;
      pullUrl?: string; pull_url?: string;
      hlsUrl?: string; hls_url?: string; m3u8Url?: string;
      flvUrl?: string; flv_url?: string;
      rtmpUrl?: string; rtmp_url?: string;
      appId?: number; app_id?: number;
    }

    const enter = enterResult.status === "fulfilled"
      ? (enterResult.value as CHApiResponse<EnterData>)
      : null;
    const stream = streamResult.status === "fulfilled"
      ? (streamResult.value as CHApiResponse<EnterData>)
      : null;

    const ed = enter?.data;
    const sd = stream?.data;

    const zegoToken = ed?.zegoToken ?? ed?.token ?? ed?.roomToken ?? sd?.zegoToken ?? sd?.token;
    const streamRoomId = ed?.roomId ?? ed?.room_id ?? sd?.roomId ?? sd?.room_id ?? rid;
    const streamId = ed?.streamId ?? ed?.stream_id ?? sd?.streamId ?? sd?.stream_id;
    const pullUrl = ed?.pullUrl ?? ed?.pull_url ?? sd?.pullUrl ?? sd?.pull_url;
    const hlsUrl = ed?.hlsUrl ?? ed?.hls_url ?? ed?.m3u8Url ?? sd?.hlsUrl ?? sd?.hls_url ?? sd?.m3u8Url;
    const flvUrl = ed?.flvUrl ?? ed?.flv_url ?? sd?.flvUrl ?? sd?.flv_url;
    const rtmpUrl = ed?.rtmpUrl ?? ed?.rtmp_url ?? sd?.rtmpUrl ?? sd?.rtmp_url;

    return res.json({
      success: true,
      zegoAppId: ZEGO_APP_ID,
      zegoToken, roomId: streamRoomId, streamId,
      pullUrl, hlsUrl, flvUrl, rtmpUrl,
      enterRaw: ed, streamRaw: sd,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ success: false, error: msg });
  }
});

// ── GET /comhub/sse ───────────────────────────────────────────────
comhubRouter.get("/comhub/sse", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const emit: SSEEmitter = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  sseCHClients.add(emit);

  emit("connected", { authenticated: CREDS.valid, userId: CREDS.userId, ts: Date.now() });

  const ping = setInterval(() => { try { res.write(":ping\n\n"); } catch {} }, 25_000);
  req.on("close", () => {
    clearInterval(ping);
    sseCHClients.delete(emit);
  });
});

export default comhubRouter;
