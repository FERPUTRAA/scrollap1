import React, { useState, useEffect } from "react";
import { Search, TrendingUp, Music, Hash, Radio, ExternalLink, Loader } from "lucide-react";
import { MOCK_DISCOVER_TRENDS, MOCK_VIDEOS } from "../data/mock";

const SOUNDS = [
  { name: "Original Sound - TechGuru", uses: "2.1M" },
  { name: "Tokyo Nights - LoFi Beats", uses: "890K" },
  { name: "Dance Trending 2024", uses: "4.5M" },
  { name: "LoFi Cooking - Relax", uses: "340K" },
];

const VIDEO_COLORS = [
  "linear-gradient(135deg, #FF9A9E, #FECFEF)",
  "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "linear-gradient(135deg, #84fab0, #8fd3f4)",
  "linear-gradient(135deg, #fccb90, #d57eeb)",
  "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
  "linear-gradient(135deg, #f6d365, #fda085)",
  "linear-gradient(135deg, #89f7fe, #66a6ff)",
  "linear-gradient(135deg, #fddb92, #d1fdff)",
];

interface SwagSession {
  id: string;
  title?: string;
  username?: string;
  viewers?: number;
  thumbnail?: string;
  url?: string;
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [swagSessions, setSwagSessions] = useState<SwagSession[]>([]);
  const [swagLoading, setSwagLoading] = useState(true);
  const [swagError, setSwagError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSwagLoading(true);
    setSwagError(false);

    fetch("/api/swag-live")
      .then(r => r.json())
      .then((d: { success: boolean; data?: { sessions?: SwagSession[] }; placeholder?: boolean }) => {
        if (cancelled) return;
        setSwagLoading(false);
        if (d.success && d.data?.sessions && d.data.sessions.length > 0) {
          setSwagSessions(d.data.sessions);
        } else {
          setSwagSessions([]);
        }
      })
      .catch(() => {
        if (!cancelled) { setSwagLoading(false); setSwagError(true); }
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar bg-black">
      <div className="sticky top-0 z-10 bg-black px-4 pt-12 pb-3">
        <div className="flex items-center bg-[#1a1a1a] rounded-full px-4 py-2 gap-2">
          <Search size={16} color="rgba(255,255,255,0.5)" />
          <input
            data-testid="input-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="px-4 pb-20">

        {/* ── Swag Live Section ─────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio size={16} color="#FF4D8D" />
              <h2 className="text-white font-bold text-sm">Swag Live</h2>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,77,141,0.2)", color: "#FF4D8D" }}
              >
                LIVE
              </span>
            </div>
            <a
              href="https://swag.live"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/40 text-[10px]"
            >
              Lihat semua <ExternalLink size={10} />
            </a>
          </div>

          {swagLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="animate-spin text-white/30" />
            </div>
          ) : swagError ? (
            <SwagLiveBanner />
          ) : swagSessions.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {swagSessions.map((s) => (
                <SwagSessionCard key={s.id} session={s} />
              ))}
            </div>
          ) : (
            <SwagLiveBanner />
          )}
        </div>

        {/* ── Trending Hashtags ─────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} color="#EE1D52" />
            <h2 className="text-white font-bold text-sm">Trending Hashtags</h2>
          </div>
          <div className="space-y-3">
            {MOCK_DISCOVER_TRENDS.map((trend, i) => (
              <div
                key={trend.hashtag}
                data-testid={`trend-item-${trend.hashtag}`}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                  <Hash size={16} color="#EE1D52" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">#{trend.hashtag}</p>
                  <p className="text-white/50 text-xs">{trend.views} views</p>
                </div>
                <span className="text-white/30 text-sm font-bold">#{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trending Sounds ───────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Music size={16} color="#69C9D0" />
            <h2 className="text-white font-bold text-sm">Trending Sounds</h2>
          </div>
          <div className="space-y-3">
            {SOUNDS.map((sound) => (
              <div
                key={sound.name}
                data-testid={`sound-item-${sound.name}`}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                  <Music size={16} color="#69C9D0" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium truncate">{sound.name}</p>
                  <p className="text-white/50 text-xs">{sound.uses} videos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Popular Videos ────────────────────────────────────────────── */}
        <div className="mb-3">
          <h2 className="text-white font-bold text-sm mb-3">Popular Videos</h2>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {VIDEO_COLORS.map((color, i) => (
            <div
              key={i}
              data-testid={`grid-video-${i}`}
              className="relative rounded-lg overflow-hidden cursor-pointer"
              style={{ aspectRatio: "9/16", background: color }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 p-2"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}
              >
                <p className="text-white text-[10px] truncate">
                  @{MOCK_VIDEOS[i % MOCK_VIDEOS.length]?.handle ?? "user"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwagSessionCard({ session }: { session: SwagSession }) {
  return (
    <a
      href={session.url ?? `https://swag.live/sessions/${session.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-28 cursor-pointer"
    >
      <div
        className="w-28 h-40 rounded-xl overflow-hidden relative mb-1.5"
        style={{ background: "linear-gradient(135deg, #FF4D8D22, #FF4D8D44)" }}
      >
        {session.thumbnail ? (
          <img
            src={session.thumbnail}
            alt={session.username ?? ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Radio size={24} color="rgba(255,77,141,0.5)" />
          </div>
        )}
        <div
          className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "#FF4D8D", color: "white" }}
        >
          LIVE
        </div>
        {session.viewers != null && (
          <div
            className="absolute bottom-1.5 left-1.5 text-[8px] text-white/80"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
          >
            👁 {session.viewers.toLocaleString()}
          </div>
        )}
      </div>
      <p className="text-white text-[10px] truncate font-medium">
        {session.username ?? "Live"}
      </p>
      {session.title && (
        <p className="text-white/40 text-[9px] truncate">{session.title}</p>
      )}
    </a>
  );
}

function SwagLiveBanner() {
  return (
    <a
      href="https://swag.live"
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden cursor-pointer active:opacity-80"
      style={{
        background: "linear-gradient(135deg, rgba(255,77,141,0.15), rgba(255,77,141,0.05))",
        border: "1px solid rgba(255,77,141,0.2)",
      }}
    >
      <div className="px-4 py-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,77,141,0.2)" }}
        >
          <Radio size={24} color="#FF4D8D" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Swag Live</p>
          <p className="text-white/50 text-[11px] mt-0.5">
            Platform live streaming global
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,77,141,0.3)", color: "#FF4D8D" }}
            >
              Buka Swag Live
            </span>
            <ExternalLink size={9} color="rgba(255,77,141,0.7)" />
          </div>
        </div>
      </div>
    </a>
  );
}
