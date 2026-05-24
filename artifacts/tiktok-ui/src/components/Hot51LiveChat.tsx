import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface ChatMsg {
  id: number;
  user: string;
  text: string;
  color: string;
  type: "chat" | "join" | "gift" | "follow" | "pk" | "system";
  emoji?: string;
}

let msgIdCounter = 1;

function makeSystemMsg(text: string): ChatMsg {
  return { id: msgIdCounter++, user: "Sistem", text, color: "rgba(255,255,255,0.4)", type: "system" };
}

interface Props {
  streamerName: string;
  active: boolean;
  extraMsg?: ChatMsg | null;
}

export default function Hot51LiveChat({ streamerName, active, extraMsg }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addMsg = useCallback((m: ChatMsg) => {
    setMsgs((prev) => {
      const next = [...prev, m];
      return next.length > 30 ? next.slice(-30) : next;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    addMsg(makeSystemMsg(`Terhubung ke siaran ${streamerName}`));
  }, [active, streamerName, addMsg]);

  useEffect(() => {
    if (extraMsg) addMsg(extraMsg);
  }, [extraMsg, addMsg]);

  // No scrollIntoView — the container uses justify-end so new messages
  // appear at the bottom automatically without touching the page scroll.

  const sendChat = () => {
    if (!input.trim()) return;
    addMsg({ id: msgIdCounter++, type: "chat", user: "Saya", text: input.trim(), color: "#69C9D0" });
    setInput("");
    setShowInput(false);
  };

  return (
    <div className="absolute bottom-[55px] left-0 right-0 z-20 flex flex-col px-2 pointer-events-none" style={{ maxHeight: "42vh" }}>
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
              style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)" }}
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
        <div ref={bottomRef} />
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
