import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ChatMsg {
  id: number;
  user: string;
  text: string;
  color: string;
  type: "chat" | "join" | "gift" | "follow" | "pk" | "system" | "lovense";
  emoji?: string;
}

let msgIdCounter = 1;

function makeSystemMsg(text: string): ChatMsg {
  return { id: msgIdCounter++, user: "Sistem", text, color: "rgba(255,255,255,0.4)", type: "system" };
}

interface Props {
  streamerName: string;
  active: boolean;
  anchorId?: string;
  extraMsg?: ChatMsg | null;
}

const USER_COLORS = ["#FF6B9D", "#69C9D0", "#FFD700", "#B44FED", "#FF8C00", "#4776E6", "#11998e", "#EE1D52"];
function randColor() { return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]; }

const NAMES = ["Wulandari", "Rizky", "Sinta", "Dewa", "Ayu", "Budi", "Citra", "Eko", "Fajar", "Gita", "Hani", "Irfan", "Joko", "Kiki", "Lina"];

export default function Hot51LiveChat({ streamerName, active, anchorId, extraMsg }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [connected, setConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addMsg = useCallback((m: ChatMsg) => {
    setMsgs((prev) => {
      const next = [...prev, m];
      return next.length > 35 ? next.slice(-35) : next;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    addMsg(makeSystemMsg(`Terhubung ke siaran ${streamerName}`));
  }, [active, streamerName, addMsg]);

  useEffect(() => {
    if (extraMsg) addMsg(extraMsg);
  }, [extraMsg, addMsg]);

  // Connect SSE for real-time comments/gifts when anchorId is provided
  useEffect(() => {
    if (!active || !anchorId) return;

    const url = `${BASE}/api/live-sse?anchorId=${encodeURIComponent(anchorId)}`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.addEventListener("chat", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { nickname?: string; content?: string; nn?: string; ct?: string };
        const user = d.nickname ?? d.nn ?? "Penonton";
        const text = d.content ?? d.ct ?? "";
        if (text) addMsg({ id: msgIdCounter++, user, text, color: randColor(), type: "chat" });
      } catch {}
    });

    es.addEventListener("gift", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { nickname?: string; giftName?: string; giftNum?: number; nn?: string; gn?: string; gc?: number };
        const user = d.nickname ?? d.nn ?? "Penonton";
        const gift = d.giftName ?? d.gn ?? "Gift";
        const count = d.giftNum ?? d.gc ?? 1;
        addMsg({ id: msgIdCounter++, user, text: `memberi ${count > 1 ? `${count}x ` : ""}${gift}`, color: "#FFD700", type: "gift", emoji: "🎁" });
      } catch {}
    });

    es.addEventListener("join", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { nickname?: string; nn?: string };
        const user = d.nickname ?? d.nn ?? "Seseorang";
        addMsg({ id: msgIdCounter++, user, text: "bergabung", color: "rgba(255,255,255,0.45)", type: "join", emoji: "👋" });
      } catch {}
    });

    es.addEventListener("lovense", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { nickname?: string; level?: string; duration?: number; nn?: string; lv?: string; bt?: number };
        const user = d.nickname ?? d.nn ?? "Penonton";
        const lv = d.level ?? d.lv ?? "Low";
        const bt = d.duration ?? d.bt ?? 0;
        addMsg({ id: msgIdCounter++, user, text: `memicu Lovense ${lv} bergetar ${bt}s`, color: "#EE1D52", type: "lovense", emoji: "〰️" });
      } catch {}
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      sseRef.current = null;
      setConnected(false);
    };
  }, [active, anchorId, addMsg]);

  // Demo messages when not connected to real SSE
  useEffect(() => {
    if (!active) return;
    if (connected) return; // Real SSE active — no demo

    const DEMO_MSGS = [
      () => ({ type: "join" as const,  user: NAMES[Math.floor(Math.random() * NAMES.length)], text: "bergabung", color: "rgba(255,255,255,0.45)", emoji: "👋" }),
      () => ({ type: "chat" as const,  user: NAMES[Math.floor(Math.random() * NAMES.length)], text: ["Hai kak 👋", "Cantik banget!", "Salam dari Jakarta", "Live terus ya kak", "❤️❤️❤️", "Mantap!"][Math.floor(Math.random() * 6)], color: randColor() }),
      () => ({ type: "gift" as const,  user: NAMES[Math.floor(Math.random() * NAMES.length)], text: "memberi Mawar", color: "#FFD700", emoji: "🌹" }),
      () => ({ type: "gift" as const,  user: NAMES[Math.floor(Math.random() * NAMES.length)], text: "memberi Diamond", color: "#69C9D0", emoji: "💎" }),
    ];

    demoTimerRef.current = setInterval(() => {
      const fn = DEMO_MSGS[Math.floor(Math.random() * DEMO_MSGS.length)];
      addMsg({ id: msgIdCounter++, ...fn() });
    }, 2200 + Math.random() * 1800);

    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    };
  }, [active, connected, addMsg]);

  const sendChat = () => {
    if (!input.trim()) return;
    addMsg({ id: msgIdCounter++, type: "chat", user: "Saya", text: input.trim(), color: "#69C9D0" });
    setInput("");
    setShowInput(false);
  };

  return (
    <div className="absolute bottom-[55px] left-0 right-0 z-20 flex flex-col px-2 pointer-events-none" style={{ maxHeight: "42vh" }}>
      {/* Connection indicator */}
      {anchorId && (
        <div className="flex items-center gap-1 mb-1 self-start">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400"} animate-pulse`} />
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {connected ? "Live" : "Demo"}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col justify-end gap-0.5 mb-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {msgs.slice(-10).map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className="inline-flex items-start gap-1.5 w-fit max-w-[82%] px-2.5 py-1.5 rounded-2xl pointer-events-auto"
              style={{
                background: m.type === "lovense" ? "rgba(238,29,82,0.18)" : "rgba(0,0,0,0.52)",
                backdropFilter: "blur(8px)",
                border: m.type === "lovense" ? "1px solid rgba(238,29,82,0.4)" : "none",
              }}
            >
              {m.emoji && <span className="text-xs leading-tight mt-0.5">{m.emoji}</span>}
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-[11px] font-bold" style={{ color: m.color }}>{m.user}</span>
                <span
                  className={`text-[11px] leading-tight ${m.type !== "chat" ? "italic" : ""}`}
                  style={{ color: m.type !== "chat" ? "rgba(255,255,255,0.65)" : "white" }}
                >
                  {m.text}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <AnimatePresence mode="wait">
          {showInput ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
              style={{ background: "rgba(30,30,40,0.92)", border: "1.5px solid rgba(238,29,82,0.5)" }}
            >
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Tulis komentar..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                style={{ fontSize: "13px" }}
              />
              <motion.button whileTap={{ scale: 0.9 }} onClick={sendChat}>
                <Send size={16} color="#EE1D52" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="trigger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInput(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full text-left"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <span className="text-white/40 text-xs flex-1">Komentar...</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
