import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Lock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Toy {
  id: number;
  toyName: string;
  toyPrice: number;
  baubleTime: number;
  baubleGrade: number;
  toyPriceStr?: string;
}

const GRADE_COLOR = ["#69C9D0", "#22c55e", "#FF8C00", "#EE1D52"];
const GRADE_LABEL = ["Basic", "Low", "Mid", "High"];
const GRADE_ICON  = ["〰️", "〽️", "⚡", "💥"];

interface ResultState {
  ok: boolean;
  msg: string;
  needsAuth?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  anchorId: string;
  liveId: string;
  streamerName: string;
  onChatMsg?: (text: string) => void;
}

export default function Hot51VibratorPanel({
  open, onClose, anchorId, streamerName, onChatMsg,
}: Props) {
  const [toys, setToys] = useState<Toy[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Toy | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  const fetchToys = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${BASE}/api/toys`);
      const data = await res.json() as {
        success: boolean;
        data?: unknown;
        error?: string;
      };
      if (data.success) {
        const raw = data.data;
        const list: Toy[] = Array.isArray(raw)
          ? (raw as Toy[])
          : Array.isArray((raw as Record<string, unknown>)?.list)
            ? ((raw as Record<string, unknown>).list as Toy[])
            : [];
        // Sort by price ascending
        list.sort((a, b) => (a.toyPrice ?? 0) - (b.toyPrice ?? 0));
        setToys(list);
        if (list.length > 0) setSelected(list[0]);
      } else {
        setLoadError(data.error ?? "Gagal memuat daftar toy");
      }
    } catch {
      setLoadError("Koneksi ke server gagal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && toys.length === 0 && !loading) fetchToys();
  }, [open]);

  const haptic = useCallback(() => {
    if (!("vibrate" in navigator)) return;
    navigator.vibrate([400, 60, 400, 60, 400]);
  }, []);

  const handleSend = useCallback(async () => {
    if (sending || !selected) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/toy-interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorId,
          toyId: String(selected.id),
          toyNum: 1,
        }),
      });
      const data = await res.json() as {
        success: boolean;
        error?: string;
        needsAuth?: boolean;
      };

      if (data.success) {
        haptic();
        setResult({ ok: true, msg: `✅ ${selected.toyName} berhasil dikirim ke ${streamerName}` });
        onChatMsg?.(`💥 Mengirim "${selected.toyName}" untuk ${streamerName}`);
      } else if (data.needsAuth) {
        setResult({ ok: false, msg: "🔒 Perlu login HOT51 (set HOT51_AC + HOT51_SIGN di Secrets)", needsAuth: true });
      } else {
        setResult({ ok: false, msg: data.error ?? "Gagal — host mungkin tidak punya toy terhubung" });
      }
    } catch {
      setResult({ ok: false, msg: "Koneksi ke server gagal" });
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 5000);
    }
  }, [sending, selected, anchorId, streamerName, onChatMsg, haptic]);

  const gradeOf = (t: Toy) => Math.min(3, Math.max(0, t.baubleGrade ?? 0));

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
            style={{
              background: "rgba(10,10,18,0.98)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#EE1D52,#FF6B9D)" }}
                >
                  <Zap size={14} color="white" />
                </div>
                <span className="text-white font-bold text-sm">Toy</span>
                <span className="text-white/40 text-xs">• {streamerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchToys} disabled={loading} className="p-1">
                  <motion.div
                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ repeat: loading ? Infinity : 0, duration: 0.9, ease: "linear" }}
                  >
                    <RefreshCw size={14} color="rgba(255,255,255,0.35)" />
                  </motion.div>
                </button>
                <button onClick={onClose}>
                  <X size={18} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
            </div>

            <div className="px-4 pb-5">
              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}>
                    <RefreshCw size={18} color="#EE1D52" />
                  </motion.div>
                  <span className="text-white/50 text-sm">Memuat daftar toy...</span>
                </div>
              )}

              {/* Load error */}
              {!loading && loadError && (
                <div className="py-4">
                  <div
                    className="px-3 py-3 rounded-xl flex flex-col gap-2"
                    style={{ background: "rgba(238,29,82,0.10)", border: "1px solid rgba(238,29,82,0.25)" }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={13} color="#EE1D52" />
                      <span className="text-xs text-red-300">{loadError}</span>
                    </div>
                    <button onClick={fetchToys} className="text-[11px] text-white/50 underline text-left">
                      Coba lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Toy grid */}
              {!loading && toys.length > 0 && (
                <>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">
                    Pilih Toy ({toys.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-4 max-h-52 overflow-y-auto pr-0.5">
                    {toys.map((toy) => {
                      const grade = gradeOf(toy);
                      const color = GRADE_COLOR[grade];
                      const icon  = GRADE_ICON[grade];
                      const isSelected = selected?.id === toy.id;
                      return (
                        <motion.button
                          key={toy.id}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setSelected(toy)}
                          className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all"
                          style={{
                            background: isSelected
                              ? `${color}22`
                              : "rgba(255,255,255,0.04)",
                            border: `2px solid ${isSelected ? color : "transparent"}`,
                            boxShadow: isSelected ? `0 0 14px ${color}44` : "none",
                          }}
                        >
                          <span className="text-2xl leading-none">{icon}</span>
                          <span
                            className="text-[10px] font-semibold text-center leading-tight line-clamp-2 px-0.5"
                            style={{ color: isSelected ? color : "rgba(255,255,255,0.6)" }}
                          >
                            {toy.toyName}
                          </span>
                          <span className="text-[9px]" style={{ color: "rgba(255,215,0,0.75)" }}>
                            🪙 {(toy.toyPrice / 1000).toFixed(0)}K
                          </span>
                          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {toy.baubleTime}s
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Selected toy summary bar */}
              {selected && !loading && (
                <div
                  className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span className="text-white/40 text-[11px]">Dipilih:</span>
                  <span className="text-white text-[11px] font-semibold">{selected.toyName}</span>
                  <span className="text-[10px] ml-1" style={{ color: GRADE_COLOR[gradeOf(selected)] }}>
                    {GRADE_LABEL[gradeOf(selected)]}
                  </span>
                  <span className="ml-auto text-[10px]" style={{ color: "rgba(255,215,0,0.8)" }}>
                    🪙 {(selected.toyPrice / 1000).toFixed(0)}K
                  </span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {selected.baubleTime}s
                  </span>
                </div>
              )}

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={sending || !selected}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{
                  background:
                    sending || !selected
                      ? "rgba(255,255,255,0.1)"
                      : `linear-gradient(135deg, ${selected ? GRADE_COLOR[gradeOf(selected)] : "#EE1D52"}, #EE1D52)`,
                  opacity: sending || !selected ? 0.6 : 1,
                }}
              >
                {sending ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <Zap size={14} />
                    </motion.div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    {selected ? `Kirim ${selected.toyName}` : "Pilih toy dulu"}
                  </>
                )}
              </motion.button>

              {/* Result feedback */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
                    style={{
                      background: result.ok
                        ? "rgba(34,197,94,0.12)"
                        : result.needsAuth
                          ? "rgba(255,215,0,0.10)"
                          : "rgba(238,29,82,0.12)",
                      border: `1px solid ${result.ok
                        ? "rgba(34,197,94,0.3)"
                        : result.needsAuth
                          ? "rgba(255,215,0,0.3)"
                          : "rgba(238,29,82,0.3)"}`,
                    }}
                  >
                    {result.ok ? (
                      <CheckCircle size={13} color="#22c55e" />
                    ) : result.needsAuth ? (
                      <Lock size={13} color="#FFD700" />
                    ) : (
                      <AlertCircle size={13} color="#EE1D52" />
                    )}
                    <span
                      className="text-xs leading-snug"
                      style={{ color: result.ok ? "#86efac" : result.needsAuth ? "#fde68a" : "#fca5a5" }}
                    >
                      {result.msg}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-white/20 text-[9px] text-center mt-3">
                Kirim toy ke host via HOT51 API • Memerlukan akun login
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
