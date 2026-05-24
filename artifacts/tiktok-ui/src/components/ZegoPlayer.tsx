import { useEffect, useRef } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ZegoConfig {
  appId: number;
  appSign: string;
  merchantId: string;
}

interface ZegoStream {
  streamID: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type ZegoEngine = any;
type ZegoEngineClass = new (appID: number, server: string) => ZegoEngine;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ZegoPlayerProps {
  roomId: string;
  anchorId: string;
  liveId?: string;
  zegoStreamId: string;
  videoEl: HTMLVideoElement | null;
  muted?: boolean;
  onPlaying: () => void;
  onError: (msg: string) => void;
}

let zegoConfigCache: ZegoConfig | null = null;
let ZegoClass: ZegoEngineClass | null = null;

async function loadZegoSDK(): Promise<ZegoEngineClass> {
  if (ZegoClass) return ZegoClass;
  const mod = await import("zego-express-engine-webrtc");
  ZegoClass = (mod.ZegoExpressEngine ?? mod.default) as unknown as ZegoEngineClass;
  return ZegoClass;
}

async function getZegoConfig(): Promise<ZegoConfig> {
  if (zegoConfigCache) return zegoConfigCache;
  const res = await fetch(`${BASE}/api/zego-config`);
  zegoConfigCache = (await res.json()) as ZegoConfig;
  return zegoConfigCache;
}

async function getZegoToken(userId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/zego-token?userId=${encodeURIComponent(userId)}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

function safeDestroy(engine: ZegoEngine, roomId: string): void {
  try { engine.stopPlayingStream?.(roomId); } catch { /* ignore */ }
  try { engine.logoutRoom(roomId); } catch { /* ignore */ }
  try { engine.destroyEngine?.(); } catch { /* ignore */ }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

const MAX_RECONNECT = 5;
const RECONNECT_DELAY_MS = 3_000;

export function useZegoPlayer({
  roomId,
  anchorId,
  liveId,
  zegoStreamId,
  videoEl,
  muted = true,
  onPlaying,
  onError,
}: ZegoPlayerProps): void {
  const engineRef = useRef<ZegoEngine | null>(null);
  const mountedRef = useRef(true);
  const playingRef = useRef(false);
  const loginRoomRef = useRef<string | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedOnceRef = useRef(false);
  const activeStreamIdRef = useRef<string>("");
  const onPlayingRef = useRef(onPlaying);
  const onErrorRef = useRef(onError);
  onPlayingRef.current = onPlaying;
  onErrorRef.current = onError;

  useEffect(() => {
    mountedRef.current = true;
    playingRef.current = false;
    reconnectCountRef.current = 0;
    connectedOnceRef.current = false;

    if (!videoEl || !zegoStreamId) return;

    const userId = `viewer_${Math.random().toString(36).slice(2, 10)}`;
    let engine: ZegoEngine | null = null;

    const tryPlayStream = async (eng: ZegoEngine, streamId: string): Promise<boolean> => {
      try {
        const stream: MediaStream = await withTimeout(
          eng.startPlayingStream(streamId),
          5_000
        );
        if (!mountedRef.current) return false;
        videoEl.srcObject = stream;
        videoEl.muted = muted;
        videoEl.play().catch(() => {});
        playingRef.current = true;
        connectedOnceRef.current = true;
        activeStreamIdRef.current = streamId;
        onPlayingRef.current();
        return true;
      } catch {
        return false;
      }
    };

    const scheduleReconnect = (): void => {
      if (!mountedRef.current) return;
      if (reconnectCountRef.current >= MAX_RECONNECT) {
        onErrorRef.current("Koneksi RTC terputus setelah beberapa percobaan");
        return;
      }
      reconnectCountRef.current += 1;
      const delay = RECONNECT_DELAY_MS * reconnectCountRef.current;
      console.info(`[Zego] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current}/${MAX_RECONNECT})`);

      reconnectTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current || !engine) return;

        const streamId = activeStreamIdRef.current || zegoStreamId;
        const roomToJoin = loginRoomRef.current;

        if (!roomToJoin) {
          onErrorRef.current("Tidak dapat reconnect: room tidak ditemukan");
          return;
        }

        try {
          const newToken = await getZegoToken(userId);
          if (!mountedRef.current) return;

          const loginOk = await withTimeout(
            engine.loginRoom(roomToJoin, newToken, { userID: userId, userName: "viewer" }),
            12_000
          );
          if (!mountedRef.current) return;

          if (loginOk) {
            const ok = await tryPlayStream(engine, streamId);
            if (!ok && mountedRef.current) {
              scheduleReconnect();
            }
          } else {
            if (mountedRef.current) scheduleReconnect();
          }
        } catch (e) {
          console.warn("[Zego] Reconnect failed:", e);
          if (mountedRef.current) scheduleReconnect();
        }
      }, delay);
    };

    const run = async (): Promise<void> => {
      try {
        const [ZegoExpressEngine, config, token] = await withTimeout(
          Promise.all([loadZegoSDK(), getZegoConfig(), getZegoToken(userId)]),
          10_000
        );
        if (!mountedRef.current) return;

        const server = `wss://webliveroom${config.appId}.zego.im/ws`;
        engine = new ZegoExpressEngine(config.appId, server);
        engineRef.current = engine;

        const streamCandidates = [
          zegoStreamId,
          liveId ? `${config.merchantId}_${liveId}` : null,
          liveId,
          `${config.merchantId}_${anchorId}`,
          `${config.merchantId}_${roomId}`,
          anchorId,
          roomId,
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[];

        const roomCandidates = [
          liveId,
          roomId,
          anchorId,
          liveId ? `${config.merchantId}_${liveId}` : null,
          `${config.merchantId}_${anchorId}`,
          `${config.merchantId}_${roomId}`,
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[];

        engine.on("roomStreamUpdate", (_rId: unknown, updateType: unknown, streamList: unknown) => {
          if (!mountedRef.current || updateType !== "ADD" || playingRef.current) return;
          const list = streamList as ZegoStream[];
          if (!list?.length) return;
          const target = list.find(s => s.streamID === zegoStreamId) ?? list[0];
          if (target) {
            tryPlayStream(engine!, target.streamID).catch(() => {
              if (mountedRef.current) onErrorRef.current("Play failed");
            });
          }
        });

        let loginResolve: ((ok: boolean) => void) | null = null;
        engine.on("roomStateChanged", (_rId: unknown, state: unknown, errorCode: unknown) => {
          console.info("[Zego] roomStateChanged", { state, errorCode });
          if (!mountedRef.current) return;

          if (state === "CONNECTED") {
            if (loginResolve) { loginResolve(true); loginResolve = null; }
            reconnectCountRef.current = 0;
          }

          if (state === "DISCONNECTED" || state === "RECONNECTING") {
            if (loginResolve) {
              if (errorCode) { loginResolve(false); loginResolve = null; }
            } else if (connectedOnceRef.current && state === "DISCONNECTED") {
              console.warn("[Zego] Room disconnected after playback — scheduling reconnect");
              playingRef.current = false;
              scheduleReconnect();
            }
          }
        });

        let loggedInRoom: string | null = null;
        for (const rid of roomCandidates) {
          if (!mountedRef.current) return;
          try {
            const loginPromise = engine.loginRoom(rid, token, { userID: userId, userName: "viewer" });
            const statePromise = new Promise<boolean>(res => { loginResolve = res; });
            const ok = await withTimeout(
              Promise.race([
                Promise.resolve(loginPromise).then(r => { loginResolve = null; return r as boolean; }),
                statePromise,
              ]),
              12_000
            );
            console.info("[Zego] loginRoom", rid, "→", ok);
            if (ok) { loggedInRoom = rid; break; }
          } catch (e) {
            console.warn("[Zego] loginRoom failed for", rid, e);
            loginResolve = null;
            continue;
          }
        }

        loginRoomRef.current = loggedInRoom;

        if (!loggedInRoom) {
          if (mountedRef.current) onErrorRef.current("Tidak dapat terhubung ke server streaming");
          return;
        }

        for (const sid of streamCandidates) {
          if (!mountedRef.current || playingRef.current) return;
          const ok = await tryPlayStream(engine, sid);
          if (ok) return;
        }

        setTimeout(() => {
          if (mountedRef.current && !playingRef.current) {
            onErrorRef.current("Stream sedang offline atau tidak dapat dijangkau saat ini");
          }
        }, 8_000);
      } catch (e) {
        if (mountedRef.current) {
          onErrorRef.current(e instanceof Error ? e.message : "Zego error");
        }
      }
    };

    run();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (engineRef.current) {
        safeDestroy(engineRef.current, loginRoomRef.current ?? roomId);
        engineRef.current = null;
      }
    };
  }, [roomId, anchorId, zegoStreamId, videoEl]);
}
