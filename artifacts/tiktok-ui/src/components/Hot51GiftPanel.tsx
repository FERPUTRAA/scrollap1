import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  color: string;
}

const FALLBACK_GIFTS: GiftItem[] = [
  { id: "rose",    name: "Mawar",   emoji: "🌹", coins: 1,    color: "#EE1D52" },
  { id: "heart",   name: "Hati",    emoji: "💖", coins: 5,    color: "#FF6B9D" },
  { id: "crown",   name: "Mahkota", emoji: "👑", coins: 10,   color: "#FFD700" },
  { id: "diamond", name: "Diamond", emoji: "💎", coins: 50,   color: "#69C9D0" },
  { id: "rocket",  name: "Roket",   emoji: "🚀", coins: 100,  color: "#FF8C00" },
  { id: "unicorn", name: "Unicorn", emoji: "🦄", coins: 200,  color: "#B44FED" },
  { id: "castle",  name: "Istana",  emoji: "🏰", coins: 500,  color: "#4776E6" },
  { id: "galaxy",  name: "Galaksi", emoji: "🌌", coins: 1000, color: "#FF0080" },
];

const SPIN_COST = 88;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  open: boolean;
  onClose: () => void;
  coins: number;
  onSend: (gift: GiftItem, flyX: number) => void;
  onSpin: () => void;
}

export default function Hot51GiftPanel({ open, onClose, coins, onSend, onSpin }: Props) {
  const [gifts, setGifts] = useState<GiftItem[]>(FALLBACK_GIFTS);
  const [selected, setSelected] = useState<GiftItem>(FALLBACK_GIFTS[0]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"gift" | "pkg">("gift");
  const [loadingGifts, setLoadingGifts] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingGifts(true);
    fetch(`${BASE}/api/gifts`)
      .then(r => r.json())
      .then((resp: { success: boolean; data?: { data?: { list?: Array<{ id: string; giftName?: string; name?: string; icon?: string; price?: number; cost?: number }> } } }) => {
        const list = resp?.data?.data?.list;
        if (Array.isArray(list) && list.length > 0) {
          const mapped: GiftItem[] = list.map((g, i) => ({
            id: String(g.id),
            name: g.giftName ?? g.name ?? `Gift ${i + 1}`,
            emoji: FALLBACK_GIFTS[i % FALLBACK_GIFTS.length]?.emoji ?? "🎁",
            coins: g.price ?? g.cost ?? FALLBACK_GIFTS[i % FALLBACK_GIFTS.length]?.coins ?? 1,
            color: FALLBACK_GIFTS[i % FALLBACK_GIFTS.length]?.color ?? "#EE1D52",
          }));
          setGifts(mapped);
          setSelected(mapped[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGifts(false));
  }, [open]);

  const handleSend = useCallback(() => {
    if (coins < selected.coins * qty) return;
    onSend(selected, 50);
  }, [selected, qty, coins, onSend]);

  const canAfford = coins >= selected.coins * qty;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute bottom-[50px] left-0 right-0 z-40 rounded-t-2xl overflow-hidden"
            style={{ background: "rgba(12,12,18,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex gap-3">
                <button
                  onClick={() => setTab("gift")}
                  className={`text-sm font-bold pb-1 border-b-2 transition-colors ${tab === "gift" ? "text-white border-[#EE1D52]" : "text-white/40 border-transparent"}`}
                >
                  Gift {loadingGifts && <span className="text-[9px] text-white/30 ml-1">...</span>}
                </button>
                <button
                  onClick={() => setTab("pkg")}
                  className={`text-sm font-bold pb-1 border-b-2 transition-colors ${tab === "pkg" ? "text-white border-[#EE1D52]" : "text-white/40 border-transparent"}`}
                >
                  Paket
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.12)" }}>
                  <span className="text-yellow-400 text-xs">🪙</span>
                  <span className="text-yellow-300 text-xs font-bold">{coins.toLocaleString()}</span>
                </div>
                <button onClick={onClose}>
                  <X size={18} color="rgba(255,255,255,0.5)" />
                </button>
              </div>
            </div>

            {tab === "gift" ? (
              <>
                <div className="grid grid-cols-4 gap-2 px-3 py-2">
                  {gifts.map((g) => (
                    <motion.button
                      key={g.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setSelected(g)}
                      className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all"
                      style={{
                        background: selected.id === g.id ? `${g.color}22` : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${selected.id === g.id ? g.color : "transparent"}`,
                      }}
                    >
                      <span className="text-3xl leading-none">{g.emoji}</span>
                      <span className="text-white/70 text-[10px] leading-tight text-center">{g.name}</span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-yellow-400 text-[9px]">🪙</span>
                        <span className="text-yellow-300 text-[9px] font-bold">{g.coins}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                  <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    {[1, 5, 10, 99].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQty(q)}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${qty === q ? "text-white" : "text-white/40"}`}
                        style={{ background: qty === q ? selected.color : "transparent" }}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSend}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
                    style={{ background: canAfford ? selected.color : "rgba(255,255,255,0.12)" }}
                  >
                    <Gift size={15} />
                    Kirim {qty > 1 ? `×${qty}` : ""}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onSpin}
                    className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FF8C00)" }}
                  >
                    🎰 <span className="text-black font-black">{SPIN_COST}🪙</span>
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="px-3 py-4 pb-5">
                <p className="text-white/40 text-xs text-center">Paket gift memerlukan akun HOT51</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
