import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VibratorLevel {
  id: 1 | 2 | 3 | 4;
  label: string;
  icon: string;
  color: string;
  shadow: string;
  duration: number;
}

const LEVELS: VibratorLevel[] = [
  { id: 1, label: "Low",   icon: "〰️", color: "#69C9D0", shadow: "#69C9D044", duration: 2 },
  { id: 2, label: "Mid",   icon: "〽️", color: "#FFD700", shadow: "#FFD70044", duration: 3 },
  { id: 3, label: "High",  icon: "⚡", color: "#FF8C00", shadow: "#FF8C0044", duration: 5 },
  { id: 4, label: "Super", icon: "💥", color: "#EE1D52", shadow: "#EE1D5244", duration: 7 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  anchorId: string;
  liveId: string;
  streamerName: string;
  onChatMsg?: (text: string) => void;
}

export default function Hot51VibratorPanel({ open, onClose, anchorId, liveId, streamerName, onChatMsg }: Props) {
  const [selected, setSelected] = useState<VibratorLevel>(LEVELS[0]);
  const [duration, setDuration] = useState(3);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const hapticFeedback = useCallback((level: number, dur: number) => {
    if (!("vibrate" in navigator)) return;
    const patterns: Record<number, number[]> = {
      1: [200, 100, 200],
      2: [300, 80, 300, 80, 300],
      3: [400, 60, 400, 60, 400, 60, 400],
      4: [500, 40, 500, 40, 500, 40, 500, 40, 500],
    };
    const base = patterns[level] || [200];
    const repeats = Math.ceil(dur / 1.5);
    const full: number[] = [];
    for (let i = 0; i < repeats; i++) full.push(...base, 120);
    navigator.vibrate(full);
  }, []);

  const handleSend = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setLastResult(null);
    hapticFeedback(selected.id, duration);

    try {
      const res = await fetch(`${BASE}/api/toy-interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchorId, liveId, level: selected.id, duration }),
      });
      const data = await res.json() as { success: boolean; error?: string; note?: string };
      if (data.success) {
        setLastResult(`✅ Lovense ${selected.label} dikirim ${duration}s`);
        onChatMsg?.(`💥 Kamu memicu Lovense ${selected.label} bergetar ${duration}s untuk ${streamerName}`);
      } else {
        setLastResult(`⚠️ ${data.error ?? data.note ?? "Perlu login"}`);
        onChatMsg?.(`〰️ Lovense ${selected.label} (${duration}s) — perlu akun Hot51`);
      }
    } catch {
      setLastResult("📳 Efek getaran di perangkatmu aktif!");
      onChatMsg?.(`〰️ Lovense ${selected.label} (${duration}s)`);
    } finally {
      setSending(false);
      setTimeout(() => setLastResult(null), 3000);
    }
  }, [sending, selected, duration, anchorId, liveId, streamerName, onChatMsg, hapticFeedback]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute bottom-[50px] left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
            style={{ background: "rgba(10,10,18,0.98)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EE1D52,#FF6B9D)" }}>
                  <Zap size={14} color="white" />
                </div>
                <span className="text-white font-bold text-sm">Lovense</span>
                <span className="text-white/40 text-xs">• {streamerName}</span>
              </div>
              <button onClick={onClose}><X size={18} color="rgba(255,255,255,0.4)" /></button>
            </div>

            <div className="px-4 pb-5">
              {/* Level selector */}
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Intensitas</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {LEVELS.map((lv) => (
                  <motion.button
                    key={lv.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { setSelected(lv); setDuration(lv.duration); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                    style={{
                      background: selected.id === lv.id ? `${lv.shadow}` : "rgba(255,255,255,0.04)",
                      border: `2px solid ${selected.id === lv.id ? lv.color : "transparent"}`,
                      boxShadow: selected.id === lv.id ? `0 0 16px ${lv.shadow}` : "none",
                    }}
                  >
                    <span className="text-2xl">{lv.icon}</span>
                    <span className="text-[11px] font-bold" style={{ color: selected.id === lv.id ? lv.color : "rgba(255,255,255,0.5)" }}>
                      {lv.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Duration slider */}
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Durasi: <span className="text-white font-bold">{duration}s</span></p>
              <div className="relative mb-4">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${selected.color} ${(duration - 1) * 11.1}%, rgba(255,255,255,0.15) ${(duration - 1) * 11.1}%)`,
                  }}
                />
                <div className="flex justify-between mt-1">
                  {[1, 3, 5, 7, 10].map(v => (
                    <span key={v} className="text-[9px] text-white/25">{v}s</span>
                  ))}
                </div>
              </div>

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{
                  background: sending ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${selected.color}, ${selected.color}aa)`,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? (
                  <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>〰️</motion.span> Mengirim...</>
                ) : (
                  <><span>{selected.icon}</span> Aktifkan {selected.label} {duration}s</>
                )}
              </motion.button>

              {/* Result */}
              <AnimatePresence>
                {lastResult && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs mt-2"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {lastResult}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="text-white/20 text-[9px] text-center mt-3">
                Lovense toy terhubung ke host live • Efek haptic di perangkatmu aktif
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
