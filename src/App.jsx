import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIDS = ["Noah", "Jonah", "Leah"];
const DEFAULT_ALLOWANCE = { Noah: 40, Jonah: 40, Leah: 40 };
const PIN = import.meta.env.VITE_PARENT_PIN || "1234";

const THEME = {
  Noah:  { bg: "#1a0a0a", card: "#240d0d", accent: "#f87171", muted: "#3d1515", text: "#fca5a5", emoji: "🦕" },
  Jonah: { bg: "#0a1a0d", card: "#0d2410", accent: "#4ade80", muted: "#163d1e", text: "#a7f3c0", emoji: "⚡" },
  Leah:  { bg: "#1f0a18", card: "#2a1022", accent: "#f472b6", muted: "#3d1530", text: "#fbb8d8", emoji: "🌸" },
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(now);
  m.setDate(diff);
  m.setHours(0, 0, 0, 0);
  return m.toISOString().split("T")[0];
}

function fmt(n) {
  return (n < 0 ? "−" : "+") + "$" + Math.abs(n).toFixed(2);
}
function fmtBalance(n) {
  return (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Kids-only read-only view ──────────────────────────────────────────────────
function KidsView({ balances, transactions, allowances }) {
  const [activeKid, setActiveKid] = useState("Noah");
  const [showHistory, setShowHistory] = useState(false);
  const t = THEME[activeKid];
  const balance = balances[activeKid];
  const txList = transactions[activeKid];
  const allowance = allowances[activeKid] || DEFAULT_ALLOWANCE[activeKid];
  const pct = Math.max(0, Math.min(100, (balance / allowance) * 100));
  const isNeg = balance < 0;

  return (
    <div style={{ background: "#080d12", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ background: "#0c1117", borderBottom: "1px solid #1e293b", padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase" }}>☀️ Summer Ledger</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginTop: 1 }}>
          Week of {new Date(getWeekStart() + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>

      {/* All-kids summary row */}
      <div style={{ display: "flex", gap: 10, padding: "14px 16px 0" }}>
        {KIDS.map(k => {
          const bal = balances[k];
          const th = THEME[k];
          const neg = bal < 0;
          return (
            <button key={k} onClick={() => { setActiveKid(k); setShowHistory(false); }}
              style={{ flex: 1, background: activeKid === k ? th.card : "#0c1117", border: `1px solid ${activeKid === k ? th.accent + "60" : "#1e293b"}`,
                borderRadius: 14, padding: "12px 8px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontSize: 18 }}>{th.emoji}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: neg ? "#f87171" : th.accent, letterSpacing: "-0.5px", marginTop: 2 }}>
                {fmtBalance(bal)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active kid detail */}
      <div style={{ background: t.card, margin: 16, borderRadius: 20, padding: 22, border: `1px solid ${t.accent}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: t.text, opacity: 0.6, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Balance</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: isNeg ? "#f87171" : t.accent, letterSpacing: "-2px", lineHeight: 1 }}>
              {fmtBalance(balance)}
            </div>
            <div style={{ fontSize: 12, color: t.text, opacity: 0.5, marginTop: 4 }}>of ${allowance.toFixed(2)} this week</div>
          </div>
          <div style={{ fontSize: 36 }}>{t.emoji}</div>
        </div>
        <div style={{ background: "#ffffff12", borderRadius: 99, height: 8, marginBottom: 0 }}>
          <div style={{ background: isNeg ? "#f87171" : t.accent, width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* History toggle */}
      <div style={{ paddingInline: 16 }}>
        <button onClick={() => setShowHistory(h => !h)}
          style={{ width: "100%", background: showHistory ? t.muted : "#0c1117", border: `1px solid #1e293b`, color: t.text,
            borderRadius: 12, padding: "11px 0", fontSize: 14, cursor: "pointer", fontWeight: showHistory ? 600 : 400 }}>
          {showHistory ? "Hide history" : "See this week's history"}
        </button>
      </div>

      {showHistory && (
        <div style={{ marginInline: 16, marginTop: 10, background: t.card, borderRadius: 16, padding: 16, border: `1px solid ${t.accent}15` }}>
          {txList.length === 0 && <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No transactions yet this week</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {txList.map(tx => (
              <div key={tx.id} style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{tx.reason}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{fmtTime(tx.created_at)}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: tx.amount < 0 ? "#f87171" : "#4ade80" }}>{fmt(tx.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const weekStart = getWeekStart();
  const isKidsView = new URLSearchParams(window.location.search).get("view") === "kids";

  const [balances, setBalances] = useState({ Noah: 40, Jonah: 40, Leah: 40 });
  const [transactions, setTransactions] = useState({ Noah: [], Jonah: [], Leah: [] });
  const [presets, setPresets] = useState({ Noah: [], Jonah: [], Leah: [] });
  const [allowances, setAllowances] = useState({ ...DEFAULT_ALLOWANCE });
  const [loading, setLoading] = useState(true);
  const [activeKid, setActiveKid] = useState("Noah");

  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [txModal, setTxModal] = useState(false);
  const [txType, setTxType] = useState("deduct");
  const [txAmount, setTxAmount] = useState("");
  const [txReason, setTxReason] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showAllowances, setShowAllowances] = useState(false);
  const [presetForm, setPresetForm] = useState({ label: "", amount: "", type: "deduct" });
  const [editingPreset, setEditingPreset] = useState(null);
  const [allowanceEdit, setAllowanceEdit] = useState({ ...DEFAULT_ALLOWANCE });

  const [toast, setToast] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: txData } = await supabase
        .from("transactions").select("*").eq("week_start", weekStart).order("created_at", { ascending: false });

      const { data: presetData } = await supabase
        .from("presets").select("*").order("label");

      const { data: settingsData } = await supabase
        .from("settings").select("*");

      // Parse allowances from settings
      const newAllowances = { ...DEFAULT_ALLOWANCE };
      (settingsData || []).forEach(s => {
        if (s.key.startsWith("allowance_")) {
          const kid = s.key.replace("allowance_", "");
          if (KIDS.includes(kid)) newAllowances[kid] = parseFloat(s.value);
        }
      });

      const newBalances = { Noah: newAllowances.Noah, Jonah: newAllowances.Jonah, Leah: newAllowances.Leah };
      const newTx = { Noah: [], Jonah: [], Leah: [] };
      (txData || []).forEach(tx => {
        if (newBalances[tx.kid] !== undefined) {
          newBalances[tx.kid] = parseFloat((newBalances[tx.kid] + tx.amount).toFixed(2));
          newTx[tx.kid].push(tx);
        }
      });

      const newPresets = { Noah: [], Jonah: [], Leah: [] };
      (presetData || []).forEach(p => {
        if (newPresets[p.kid] !== undefined) newPresets[p.kid].push(p);
      });

      setAllowances(newAllowances);
      setAllowanceEdit(newAllowances);
      setBalances(newBalances);
      setTransactions(newTx);
      setPresets(newPresets);
    } catch (e) {
      showToast("Failed to load data", "error");
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  function requirePin(action) {
    if (pinUnlocked) { action(); return; }
    setPendingAction(() => action);
    setShowPin(true);
  }

  function handlePinSubmit() {
    if (pinInput === PIN) {
      setPinUnlocked(true);
      setPinError(false);
      setShowPin(false);
      setPinInput("");
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    } else {
      setPinError(true);
      setPinInput("");
    }
  }

  function openTxModal(preset = null) {
    requirePin(() => {
      if (preset) {
        setTxType(preset.type);
        setTxAmount(String(Math.abs(preset.amount)));
        setTxReason(preset.label);
      } else {
        setTxType("deduct");
        setTxAmount("");
        setTxReason("");
      }
      setTxModal(true);
    });
  }

  async function submitTx() {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0 || !txReason.trim()) return;
    const delta = txType === "deduct" ? -amt : amt;
    try {
      const { error } = await supabase.from("transactions").insert({
        kid: activeKid, amount: delta, reason: txReason.trim(), week_start: weekStart,
      });
      if (error) throw error;
      setBalances(b => ({ ...b, [activeKid]: parseFloat((b[activeKid] + delta).toFixed(2)) }));
      setTransactions(t => ({ ...t, [activeKid]: [{ id: Date.now(), kid: activeKid, amount: delta, reason: txReason.trim(), created_at: new Date().toISOString() }, ...t[activeKid]] }));
      setTxModal(false);
      showToast(`${txType === "deduct" ? "Deducted" : "Added"} $${amt.toFixed(2)} for ${activeKid}`);
    } catch { showToast("Failed to save transaction", "error"); }
  }

  async function deleteTx(txId) {
    try {
      const tx = transactions[activeKid].find(t => t.id === txId);
      if (!tx) return;
      await supabase.from("transactions").delete().eq("id", txId);
      setBalances(b => ({ ...b, [activeKid]: parseFloat((b[activeKid] - tx.amount).toFixed(2)) }));
      setTransactions(t => ({ ...t, [activeKid]: t[activeKid].filter(x => x.id !== txId) }));
      showToast("Transaction removed");
    } catch { showToast("Failed to remove", "error"); }
  }

  async function savePreset() {
    const amt = parseFloat(presetForm.amount);
    if (!presetForm.label.trim() || !amt || amt <= 0) return;
    const delta = presetForm.type === "deduct" ? -amt : amt;
    try {
      if (editingPreset) {
        const { error } = await supabase.from("presets").update({
          label: presetForm.label.trim(), amount: delta, type: presetForm.type,
        }).eq("id", editingPreset);
        if (error) throw error;
        setPresets(p => ({ ...p, [activeKid]: p[activeKid].map(x => x.id === editingPreset ? { ...x, label: presetForm.label.trim(), amount: delta, type: presetForm.type } : x) }));
      } else {
        const { data, error } = await supabase.from("presets").insert({
          kid: activeKid, label: presetForm.label.trim(), amount: delta, type: presetForm.type,
        }).select().single();
        if (error) throw error;
        setPresets(p => ({ ...p, [activeKid]: [...p[activeKid], data].sort((a, b) => a.label.localeCompare(b.label)) }));
      }
      setPresetForm({ label: "", amount: "", type: "deduct" });
      setEditingPreset(null);
      showToast(editingPreset ? "Preset updated" : "Preset saved");
    } catch { showToast("Failed to save preset", "error"); }
  }

  async function deletePreset(id) {
    try {
      await supabase.from("presets").delete().eq("id", id);
      setPresets(p => ({ ...p, [activeKid]: p[activeKid].filter(x => x.id !== id) }));
      showToast("Preset deleted");
    } catch { showToast("Failed to delete", "error"); }
  }

  async function saveAllowances() {
    try {
      const upserts = KIDS.map(k => ({ key: `allowance_${k}`, value: String(allowanceEdit[k]) }));
      const { error } = await supabase.from("settings").upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      // Recalculate balances with new allowances
      const newBalances = { ...allowanceEdit };
      KIDS.forEach(k => {
        transactions[k].forEach(tx => {
          newBalances[k] = parseFloat((newBalances[k] + tx.amount).toFixed(2));
        });
      });
      setAllowances({ ...allowanceEdit });
      setBalances(newBalances);
      setShowAllowances(false);
      showToast("Allowances updated");
    } catch { showToast("Failed to save allowances", "error"); }
  }

  if (loading) return (
    <div style={{ background: "#080d12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ color: "#334155", fontSize: 15 }}>Loading…</div>
    </div>
  );

  if (isKidsView) return <KidsView balances={balances} transactions={transactions} allowances={allowances} />;

  const kid = activeKid;
  const t = THEME[kid];
  const balance = balances[kid];
  const txList = transactions[kid];
  const kidPresets = presets[kid];
  const allowance = allowances[kid];
  const pct = Math.max(0, Math.min(100, (balance / allowance) * 100));
  const isNeg = balance < 0;

  return (
    <div style={{ background: "#080d12", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 48 }}>

      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#7f1d1d" : "#14532d", color: toast.type === "error" ? "#fca5a5" : "#86efac", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px #00000060" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0c1117", borderBottom: "1px solid #1e293b", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase" }}>☀️ Summer Ledger</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginTop: 1 }}>
            Week of {new Date(weekStart + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => requirePin(() => setShowAllowances(a => !a))}
            style={{ background: showAllowances ? "#1e3a5f" : "#1e293b", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 12, color: showAllowances ? "#93c5fd" : "#64748b", cursor: "pointer", fontWeight: 600 }}>
            💰 Allowances
          </button>
          <button onClick={() => pinUnlocked ? setPinUnlocked(false) : setShowPin(true)}
            style={{ background: pinUnlocked ? "#14532d" : "#1e293b", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 12, color: pinUnlocked ? "#86efac" : "#64748b", cursor: "pointer", fontWeight: 600 }}>
            {pinUnlocked ? "🔓" : "🔒"}
          </button>
        </div>
      </div>

      {/* Allowances editor */}
      {showAllowances && (
        <div style={{ margin: "12px 16px 0", background: "#0c1a2e", border: "1px solid #1e3a5f", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd", marginBottom: 12 }}>Weekly starting allowances</div>
          {KIDS.map(k => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{THEME[k].emoji}</span>
              <span style={{ color: "#e2e8f0", fontSize: 14, width: 52 }}>{k}</span>
              <div style={{ display: "flex", alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "2px 10px", flex: 1 }}>
                <span style={{ color: "#475569", fontSize: 15 }}>$</span>
                <input type="number" inputMode="decimal" value={allowanceEdit[k]}
                  onChange={e => setAllowanceEdit(a => ({ ...a, [k]: parseFloat(e.target.value) || 0 }))}
                  style={{ background: "none", border: "none", color: "#f1f5f9", fontSize: 16, fontWeight: 700, outline: "none", width: "100%", padding: "8px 4px" }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setShowAllowances(false)}
              style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: 8, padding: "10px 0", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveAllowances}
              style={{ flex: 2, background: "#3b82f6", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save allowances</button>
          </div>
        </div>
      )}

      {/* Kid tabs */}
      <div style={{ display: "flex", background: "#0c1117", borderBottom: "1px solid #1e293b" }}>
        {KIDS.map(k => (
          <button key={k} onClick={() => { setActiveKid(k); setShowHistory(false); setShowPresets(false); setShowAllowances(false); }}
            style={{ flex: 1, border: "none", background: "none", padding: "13px 0", cursor: "pointer",
              borderBottom: activeKid === k ? `2px solid ${THEME[k].accent}` : "2px solid transparent",
              color: activeKid === k ? THEME[k].accent : "#475569", fontWeight: activeKid === k ? 700 : 400, fontSize: 14, transition: "all 0.15s" }}>
            {THEME[k].emoji} {k}
          </button>
        ))}
      </div>

      {/* Balance card */}
      <div style={{ background: t.card, margin: 16, borderRadius: 20, padding: 22, border: `1px solid ${t.accent}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: t.text, opacity: 0.6, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Balance</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: isNeg ? "#f87171" : t.accent, letterSpacing: "-2px", lineHeight: 1 }}>
              {fmtBalance(balance)}
            </div>
            <div style={{ fontSize: 12, color: t.text, opacity: 0.5, marginTop: 4 }}>of ${allowance.toFixed(2)} this week</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: t.text, opacity: 0.5 }}>{txList.length} transaction{txList.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ background: "#ffffff12", borderRadius: 99, height: 5, marginBottom: 18 }}>
          <div style={{ background: isNeg ? "#f87171" : t.accent, width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => openTxModal()}
            style={{ flex: 1, background: pinUnlocked ? t.accent : t.muted, color: pinUnlocked ? "#080d12" : t.text, border: "none", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: pinUnlocked ? 1 : 0.6 }}>
            {pinUnlocked ? "+ / − Add Transaction" : "🔒 Unlock to edit"}
          </button>
          <button onClick={() => { setShowHistory(h => !h); setShowPresets(false); }}
            style={{ background: showHistory ? t.muted : "#ffffff08", color: t.text, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 13, cursor: "pointer", fontWeight: showHistory ? 600 : 400 }}>
            History
          </button>
          <button onClick={() => { setShowPresets(p => !p); setShowHistory(false); }}
            style={{ background: showPresets ? t.muted : "#ffffff08", color: t.text, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 13, cursor: "pointer", fontWeight: showPresets ? 600 : 400 }}>
            Presets
          </button>
        </div>
      </div>

      {/* Quick-add preset chips */}
      {kidPresets.length > 0 && !showHistory && !showPresets && (
        <div style={{ paddingInline: 16, marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Quick add</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {kidPresets.map(p => (
              <button key={p.id} onClick={() => openTxModal(p)}
                style={{ background: p.type === "deduct" ? "#3f0a0a" : "#0a2e18", border: `1px solid ${p.type === "deduct" ? "#f8717140" : "#4ade8040"}`,
                  color: p.type === "deduct" ? "#fca5a5" : "#86efac", borderRadius: 99, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                {p.type === "deduct" ? "−" : "+"} {p.label} · ${Math.abs(p.amount).toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div style={{ marginInline: 16, background: t.card, borderRadius: 16, padding: 16, border: `1px solid ${t.accent}15` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>This week's history</div>
          {txList.length === 0 && <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No transactions yet</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {txList.map(tx => (
              <div key={tx.id} style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{tx.reason}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{fmtTime(tx.created_at)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: tx.amount < 0 ? "#f87171" : "#4ade80" }}>{fmt(tx.amount)}</span>
                  {pinUnlocked && (
                    <button onClick={() => deleteTx(tx.id)}
                      style={{ background: "none", border: "none", color: "#334155", fontSize: 15, cursor: "pointer", padding: "0 2px" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presets panel */}
      {showPresets && (
        <div style={{ marginInline: 16, background: t.card, borderRadius: 16, padding: 16, border: `1px solid ${t.accent}15` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>{kid}'s presets</div>
          {kidPresets.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 14 }}>No presets yet — add one below.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {kidPresets.map(p => (
              <div key={p.id} style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ color: p.type === "deduct" ? "#f87171" : "#4ade80", fontWeight: 700, marginRight: 6 }}>{p.type === "deduct" ? "−" : "+"}</span>
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>{p.label}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}> · ${Math.abs(p.amount).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditingPreset(p.id); setPresetForm({ label: p.label, amount: String(Math.abs(p.amount)), type: p.type }); }}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => deletePreset(p.id)}
                    style={{ background: "none", border: "none", color: "#475569", fontSize: 15, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, fontWeight: 600 }}>{editingPreset ? "Edit preset" : "New preset"}</div>
            <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 2, marginBottom: 10 }}>
              {["deduct", "bonus"].map(tp => (
                <button key={tp} onClick={() => setPresetForm(f => ({ ...f, type: tp }))}
                  style={{ flex: 1, border: "none", borderRadius: 6, padding: "8px 0", fontSize: 13, cursor: "pointer", fontWeight: 600,
                    background: presetForm.type === tp ? (tp === "deduct" ? "#f87171" : "#4ade80") : "transparent",
                    color: presetForm.type === tp ? "#080d12" : "#475569" }}>
                  {tp === "deduct" ? "− Deduction" : "+ Bonus"}
                </button>
              ))}
            </div>
            <input value={presetForm.label} onChange={e => setPresetForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Label (e.g. Bad language, Read a book)"
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#f1f5f9", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
            <input value={presetForm.amount} onChange={e => setPresetForm(f => ({ ...f, amount: e.target.value }))}
              type="number" inputMode="decimal" placeholder="Amount (e.g. 2.00)"
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#f1f5f9", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              {editingPreset && (
                <button onClick={() => { setEditingPreset(null); setPresetForm({ label: "", amount: "", type: "deduct" }); }}
                  style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: 8, padding: "10px 0", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              )}
              <button onClick={savePreset}
                disabled={!presetForm.label.trim() || !presetForm.amount || parseFloat(presetForm.amount) <= 0}
                style={{ flex: 2, background: t.accent, border: "none", borderRadius: 8, padding: "10px 0", color: "#080d12", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: (!presetForm.label.trim() || !presetForm.amount || parseFloat(presetForm.amount) <= 0) ? 0.4 : 1 }}>
                {editingPreset ? "Save changes" : "Add preset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN modal */}
      {showPin && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => { setShowPin(false); setPinInput(""); setPinError(false); }}>
          <div style={{ background: "#1e293b", borderRadius: 20, padding: 28, width: 300, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Parent PIN</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Enter your PIN to make changes</div>
            <input type="password" inputMode="numeric" value={pinInput}
              onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
              placeholder="····" autoFocus
              style={{ width: "100%", background: "#0f172a", border: pinError ? "1px solid #f87171" : "1px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 22, color: "#f1f5f9", textAlign: "center", outline: "none", letterSpacing: "0.4em", boxSizing: "border-box" }} />
            {pinError && <div style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>Incorrect PIN</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowPin(false); setPinInput(""); setPinError(false); }}
                style={{ flex: 1, background: "#334155", border: "none", borderRadius: 10, padding: "12px 0", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={handlePinSubmit}
                style={{ flex: 1, background: "#3b82f6", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction modal */}
      {txModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}
          onClick={() => setTxModal(false)}>
          <div style={{ background: "#1e293b", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 18 }}>{THEME[kid].emoji} {kid}</div>
              <button onClick={() => setTxModal(false)} style={{ background: "none", border: "none", color: "#475569", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", background: "#0f172a", borderRadius: 10, padding: 3, marginBottom: 16 }}>
              {["deduct", "bonus"].map(tp => (
                <button key={tp} onClick={() => setTxType(tp)}
                  style={{ flex: 1, border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 14, cursor: "pointer",
                    background: txType === tp ? (tp === "deduct" ? "#f87171" : "#4ade80") : "transparent",
                    color: txType === tp ? "#080d12" : "#64748b" }}>
                  {tp === "deduct" ? "− Deduction" : "+ Bonus"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Amount</div>
              <input type="number" inputMode="decimal" value={txAmount} onChange={e => setTxAmount(e.target.value)}
                placeholder="0.00" autoFocus
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 20, color: "#f1f5f9", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Reason</div>
              <input type="text" value={txReason} onChange={e => setTxReason(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitTx()}
                placeholder="What happened?"
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#f1f5f9", outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={submitTx}
              disabled={!txAmount || parseFloat(txAmount) <= 0 || !txReason.trim()}
              style={{ width: "100%", background: txType === "deduct" ? "#f87171" : "#4ade80", border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 800, fontSize: 16, color: "#080d12", cursor: "pointer",
                opacity: (!txAmount || parseFloat(txAmount) <= 0 || !txReason.trim()) ? 0.4 : 1 }}>
              {txType === "deduct" ? `− Deduct $${parseFloat(txAmount || 0).toFixed(2)}` : `+ Add $${parseFloat(txAmount || 0).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
