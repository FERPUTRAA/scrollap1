import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Eye, ChevronUp, ChevronDown, Tv2, X, LogIn, Key, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────
interface LiveRoom {
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

interface StreamInfo {
  zegoAppId?: number;
  zegoToken?: string;
  roomId?: string;
  streamId?: string;
  pullUrl?: string;
  hlsUrl?: string;
  flvUrl?: string;
  rtmpUrl?: string;
  enterRaw?: Record<string, unknown>;
  streamRaw?: Record<string, unknown>;
}

type AuthStatus = "checking" | "unauthed" | "authed";
type ListStatus = "loading" | "ok" | "error" | "empty";

// ── Auth Modal ─────────────────────────────────────────────────────
function ComHubAuthModal({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<"email" | "token">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async () => {
    if (!email || !password) { setError("Email dan password diperlukan"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/comhub/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { success: boolean; error?: string; authToken?: string; userId?: string };
      if (data.success) { onSuccess(); }
      else { setError(data.error ?? "Login gagal"); }
    } catch { setError("Gagal menghubungi server"); }
    finally { setLoading(false); }
  };

  const handleTokenSave = async () => {
    if (!token) { setError("Token diperlukan"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/comhub/credentials`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken: token, userId }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) { onSuccess(); }
      else { setError(data.error ?? "Token tidak valid"); }
    } catch { setError("Gagal menyimpan token"); }
    finally { setLoading(false); }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg,#0a1628 0%,#0e2a14 50%,#0a1628 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)" }}>
            <Tv2 size={32} color="white" />
          </div>
          <h1 className="text-white text-xl font-bold">ComHub</h1>
          <p className="text-white/50 text-xs text-center">Masuk untuk melihat siaran live ComHub</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.07)" }}>
          {(["email", "token"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className="flex-1 py-2 text-xs font-semibold transition-all"
              style={{ background: tab === t ? "rgba(34,197,94,0.8)" : "transparent", color: "white" }}>
              {t === "email" ? "Email Login" : "Masukkan Token"}
            </button>
          ))}
        </div>

        {/* Email Form */}
        {tab === "email" && (
          <div className="flex flex-col gap-3">
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email ComHub" type="email"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
            <input value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" type="password"
              onKeyDown={e => e.key === "Enter" && handleEmailLogin()}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={handleEmailLogin} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: "rgba(34,197,94,0.8)" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? "Masuk..." : "Masuk"}
            </button>
          </div>
        )}

        {/* Token Form */}
        {tab === "token" && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "rgba(134,239,172,0.8)" }}>
              Dapatkan token dari app ComHub: Settings → Account → Copy Token
              atau intercept request header <code className="font-mono">Authorization: Bearer ...</code>
            </div>
            <textarea value={token} onChange={e => setToken(e.target.value)}
              placeholder="Paste token ComHub di sini..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-xs text-white placeholder-white/30 outline-none font-mono resize-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
            <input value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="User ID (opsional)"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={handleTokenSave} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: "rgba(34,197,94,0.8)" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              {loading ? "Menyimpan..." : "Simpan Token"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stream Debug Panel ─────────────────────────────────────────────
function StreamDebugPanel({ info, onClose }: { info: StreamInfo; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["ZEGO App ID", String(info.zegoAppId ?? "-")],
    ["Room ID", info.roomId ?? "-"],
    ["Stream ID", info.streamId ?? "-"],
    ["Pull URL", info.pullUrl ?? "-"],
    ["HLS URL", info.hlsUrl ?? "-"],
    ["FLV URL", info.flvUrl ?? "-"],
    ["RTMP URL", info.rtmpUrl ?? "-"],
    ["ZEGO Token", info.zegoToken ? `${info.zegoToken.slice(0, 32)}...` : "-"],
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="absolute inset-x-3 bottom-28 z-50 rounded-2xl p-4 overflow-auto max-h-64"
      style={{ background: "rgba(0,0,0,0.92)", border: "1px solid rgba(34,197,94,0.3)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-green-400 text-xs font-bold">Stream Info</span>
        <button onClick={onClose}><X size={14} color="rgba(255,255,255,0.5)" /></button>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-white/40 text-[10px] w-20 shrink-0">{k}</span>
            <span className="text-green-300 text-[10px] font-mono break-all">{v}</span>
          </div>
        ))}
        {info.enterRaw && (
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-white/40 text-[10px]">enterLive raw:</span>
            <pre className="text-green-300 text-[9px] mt-1 break-all whitespace-pre-wrap">
              {JSON.stringify(info.enterRaw, null, 2).slice(0, 500)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Room Card ──────────────────────────────────────────────────────
function RoomCard({ room, isActive }: { room: LiveRoom; isActive: boolean }) {
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [streamStatus, setStreamStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [showDebug, setShowDebug] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const enterRoom = useCallback(async () => {
    setStreamStatus("loading");
    try {
      const res = await fetch(`${BASE}/api/comhub/enter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveId: room.liveId, roomId: room.roomId }),
      });
      const data = await res.json() as StreamInfo & { success: boolean; error?: string };
      if (data.success) {
        setStreamInfo(data);
        setStreamStatus("ok");
      } else {
        setStreamStatus("error");
      }
    } catch {
      setStreamStatus("error");
    }
  }, [room.liveId, room.roomId]);

  useEffect(() => {
    if (isActive && streamStatus === "idle") {
      const t = setTimeout(enterRoom, 400);
      return () => clearTimeout(t);
    }
  }, [isActive, streamStatus, enterRoom]);

  useEffect(() => {
    if (!isActive) { setStreamStatus("idle"); setStreamInfo(null); setShowDebug(false); }
  }, [isActive]);

  // Try to play HLS stream if available
  useEffect(() => {
    if (!streamInfo || !videoRef.current) return;
    const hlsUrl = streamInfo.hlsUrl ?? streamInfo.pullUrl;
    if (!hlsUrl) return;
    const video = videoRef.current;

    if (hlsUrl.endsWith(".m3u8") || hlsUrl.includes("m3u8")) {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: false });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
          return () => hls.destroy();
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = hlsUrl;
          video.play().catch(() => {});
        }
      }).catch(() => {});
    } else if (hlsUrl) {
      video.src = hlsUrl;
      video.play().catch(() => {});
    }
  }, [streamInfo]);

  const hasStream = streamInfo && (streamInfo.hlsUrl ?? streamInfo.pullUrl ?? streamInfo.flvUrl);

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0a1628" }}>
      {/* Cover / Background */}
      {room.coverUrl ? (
        <img src={room.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      ) : (
        <div className="absolute inset-0 opacity-20"
          style={{ background: `linear-gradient(160deg, hsl(${(room.userId * 47) % 360},60%,40%) 0%, #0a1628 100%)` }} />
      )}

      {/* Video player (if stream available) */}
      {hasStream && (
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
      )}

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 z-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }} />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }} />

      {/* LIVE badge */}
      <div className="absolute top-16 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{ background: "rgba(34,197,94,0.9)" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[10px] font-black tracking-wide">LIVE</span>
      </div>

      {/* Viewer count */}
      <div className="absolute top-16 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
        <Eye size={11} color="rgba(255,255,255,0.7)" />
        <span className="text-white/80 text-[10px] font-semibold">{room.viewerCount.toLocaleString()}</span>
      </div>

      {/* Stream status */}
      {isActive && (
        <div className="absolute top-28 left-3 z-20">
          {streamStatus === "loading" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
              <Loader2 size={11} color="rgba(34,197,94,0.8)" className="animate-spin" />
              <span className="text-white/60 text-[10px]">Menghubungkan…</span>
            </div>
          )}
          {streamStatus === "ok" && !hasStream && (
            <button onClick={() => setShowDebug(d => !d)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <span className="text-green-400 text-[10px]">ZEGO Connected</span>
            </button>
          )}
          {streamStatus === "error" && (
            <button onClick={enterRoom}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <span className="text-red-400 text-[10px]">Gagal — Coba Lagi</span>
            </button>
          )}
        </div>
      )}

      {/* Debug panel */}
      <AnimatePresence>
        {showDebug && streamInfo && <StreamDebugPanel info={streamInfo} onClose={() => setShowDebug(false)} />}
      </AnimatePresence>

      {/* Bottom info */}
      <div className="absolute bottom-28 left-3 right-14 z-20 flex flex-col gap-2">
        {/* Host info */}
        <div className="flex items-center gap-2.5">
          {room.avatar ? (
            <img src={room.avatar} alt="" className="w-10 h-10 rounded-full object-cover"
              style={{ border: "2px solid rgba(34,197,94,0.6)" }} />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: `hsl(${(room.userId * 47) % 360},50%,40%)` }}>
              {room.nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm">{room.nickname}</p>
            {room.title && <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{room.title}</p>}
          </div>
        </div>

        {/* Debug button */}
        {streamStatus === "ok" && streamInfo && (
          <button onClick={() => setShowDebug(d => !d)}
            className="self-start px-3 py-1 rounded-full text-[10px] font-medium"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.2)", color: "rgba(134,239,172,0.8)" }}>
            {showDebug ? "Tutup Info" : "Lihat Stream Info"}
          </button>
        )}
      </div>

      {/* ZEGO spectator indicator */}
      {!hasStream && streamStatus === "ok" && streamInfo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.25)" }}>
            <Tv2 size={36} color="rgba(134,239,172,0.6)" />
          </div>
          <div className="text-center px-6">
            <p className="text-green-300 text-sm font-semibold">ZEGO Live Stream</p>
            <p className="text-white/40 text-xs mt-1">
              Room ID: {streamInfo.roomId ?? "-"}<br />
              Stream ID: {streamInfo.streamId ?? "-"}
            </p>
            <p className="text-white/30 text-[10px] mt-2">
              Stream tersedia via ZEGO App ID {streamInfo.zegoAppId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ComHub Page ───────────────────────────────────────────────
export default function ComHub() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/comhub/status`);
      const data = await res.json() as { authenticated: boolean };
      setAuthStatus(data.authenticated ? "authed" : "unauthed");
    } catch { setAuthStatus("unauthed"); }
  }, []);

  const fetchRooms = useCallback(async () => {
    setListStatus("loading");
    try {
      const res = await fetch(`${BASE}/api/comhub/living`);
      const data = await res.json() as {
        success: boolean; needAuth?: boolean; error?: string; rooms?: LiveRoom[];
      };
      if (data.needAuth) { setAuthStatus("unauthed"); setListStatus("error"); return; }
      if (!data.success) { setErrorMsg(data.error ?? "Gagal memuat siaran"); setListStatus("error"); return; }
      const r = data.rooms ?? [];
      if (r.length === 0) { setListStatus("empty"); return; }
      setRooms(r);
      setListStatus("ok");
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data");
      setListStatus("error");
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (authStatus === "authed") fetchRooms();
  }, [authStatus, fetchRooms]);

  const handleAuthSuccess = useCallback(() => {
    setAuthStatus("authed");
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * el.clientHeight, behavior: "smooth" });
    setActiveIndex(idx);
  }, []);

  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
  }, [activeIndex]);

  // ── Loading ──────────────────────────────────────────────────────
  if (authStatus === "checking" || (authStatus === "authed" && listStatus === "loading")) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: "#0a1628" }}>
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-green-400 animate-spin" />
        <p className="text-white/60 text-sm">Memuat ComHub…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (authStatus === "authed" && listStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8" style={{ background: "#0a1628" }}>
        <WifiOff size={48} color="rgba(255,255,255,0.3)" />
        <p className="text-white/80 text-base font-semibold text-center">{errorMsg || "Gagal memuat siaran"}</p>
        <button onClick={fetchRooms}
          className="px-6 py-2.5 rounded-full text-white font-bold text-sm flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.8)" }}>
          <RefreshCw size={14} />Coba Lagi
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────
  if (authStatus === "authed" && listStatus === "empty") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8" style={{ background: "#0a1628" }}>
        <Tv2 size={48} color="rgba(34,197,94,0.3)" />
        <p className="text-white/80 text-base font-semibold text-center">Belum ada siaran live</p>
        <p className="text-white/40 text-sm text-center">Coba lagi beberapa saat</p>
        <button onClick={fetchRooms}
          className="px-6 py-2.5 rounded-full text-white font-bold text-sm flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.8)" }}>
          <RefreshCw size={14} />Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#0a1628" }}>

      {/* Auth Overlay */}
      <AnimatePresence>
        {authStatus === "unauthed" && (
          <motion.div className="absolute inset-0 z-[100]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ComHubAuthModal onSuccess={handleAuthSuccess} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between pt-14 pb-3 px-3 pointer-events-none"
        style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.8) 0%,transparent 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.9)" }}>
            <Tv2 size={14} color="white" />
          </div>
          <span className="text-white font-bold text-sm">ComHub Live</span>
        </div>

        {authStatus === "authed" && (
          <button
            className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
            onClick={() => setAuthStatus("unauthed")}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[9px] font-bold">COMHUB</span>
          </button>
        )}
      </div>

      {/* Room count badge */}
      {listStatus === "ok" && (
        <div className="absolute top-28 left-3 z-50 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
          <Tv2 size={11} color="rgba(34,197,94,0.8)" />
          <span className="text-white/80 text-[10px] font-semibold">{rooms.length} sedang live</span>
        </div>
      )}

      {/* Nav arrows */}
      {listStatus === "ok" && activeIndex > 0 && (
        <button className="absolute top-28 right-3 z-50 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.2)", backdropFilter: "blur(4px)" }}
          onClick={() => scrollToIndex(activeIndex - 1)}>
          <ChevronUp size={18} color="white" />
        </button>
      )}
      {listStatus === "ok" && activeIndex < rooms.length - 1 && (
        <button className="absolute bottom-24 right-3 z-50 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.2)", backdropFilter: "blur(4px)" }}
          onClick={() => scrollToIndex(activeIndex + 1)}>
          <ChevronDown size={18} color="white" />
        </button>
      )}

      {/* Feed */}
      {listStatus === "ok" && (
        <div ref={feedRef} className="flex-1 overflow-y-scroll"
          style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
          onScroll={handleScroll}>
          {rooms.map((room, i) => (
            <div key={room.liveId || room.userId} className="relative w-full"
              style={{ height: "100svh", scrollSnapAlign: "start", scrollSnapStop: "always" }}>
              <RoomCard room={room} isActive={i === activeIndex} />
              {/* Dot indicators */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20"
                style={{ display: rooms.length <= 10 ? "flex" : "none" }}>
                {rooms.slice(Math.max(0, i - 2), Math.min(rooms.length, i + 3)).map((_, di) => {
                  const ri = Math.max(0, i - 2) + di;
                  return <div key={ri} className="w-1 rounded-full transition-all"
                    style={{ height: ri === activeIndex ? 20 : 6, background: ri === activeIndex ? "rgb(34,197,94)" : "rgba(34,197,94,0.3)" }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom hint */}
      <div className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-6 pt-3 pointer-events-none"
        style={{ background: "linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 100%)" }}>
        <p className="text-white/40 text-[10px] font-medium">Geser untuk melihat siaran lain</p>
      </div>
    </div>
  );
}
