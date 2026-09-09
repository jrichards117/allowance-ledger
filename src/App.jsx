import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIDS = ["Noah", "Jonah", "Leah"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STREAK_WEEKS_LOOKBACK = 12;

const THEME = {
  Noah:  { card: "#0d1424", accent: "#60a5fa", muted: "#152040", text: "#bfdbfe", emoji: "🚴" },
  Jonah: { card: "#0d2410", accent: "#4ade80", muted: "#163d1e", text: "#a7f3c0", emoji: "🥋" },
  Leah:  { card: "#2a1022", accent: "#f472b6", muted: "#3d1530", text: "#fbb8d8", emoji: "🌸" },
};

// ── Date helpers ────────────────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().split("T")[0]; }
function getTodayISO() { return isoDate(new Date()); }
function getWeekStart(fromISO) {
  const now = fromISO ? new Date(fromISO + "T12:00:00") : new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(now); m.setDate(diff); m.setHours(0, 0, 0, 0);
  return isoDate(m);
}
function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n);
  return isoDate(d);
}
function getWeekDates(weekStart) { return DAYS.map((_, i) => addDays(weekStart, i)); }
function getTodayDow() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }
function fmtPts(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
function fmtDateShort(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); }
  const El = toast ? (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#7f1d1d" : "#14532d", color: toast.type === "error" ? "#fca5a5" : "#86efac", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px #00000060", maxWidth: "90vw", textAlign: "center" }}>
      {toast.msg}
    </div>
  ) : null;
  return { show, El };
}

const inp = { width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#f1f5f9", outline: "none", boxSizing: "border-box" };

// ── Points helpers (shared) ────────────────────────────────────────────────
function dayPoints(items, completions, itemId, kid, date) {
  return completions[`${itemId}-${date}`] ? 1 : 0; // placeholder, unused directly
}
function computeDailyPoints(kidItems, completions, date) {
  return kidItems.reduce((sum, it) => sum + (completions[`${it.id}-${date}`] ? Number(it.points) : 0), 0);
}
function computeDailyMax(kidItems) {
  return kidItems.reduce((sum, it) => sum + Number(it.points), 0);
}
function computeWeekPoints(kidItems, completions, weekDates) {
  return weekDates.reduce((sum, d) => sum + computeDailyPoints(kidItems, completions, d), 0);
}
function tierForPoints(tiers, points) {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find(t => points >= t.min_points) || null;
}
function nextTier(tiers, points) {
  const sorted = [...tiers].sort((a, b) => a.min_points - b.min_points);
  return sorted.find(t => t.min_points > points) || null;
}

// ── Checklist item row ──────────────────────────────────────────────────────
function ItemRow({ item, checked, accent, onToggle, editable, onEdit, onDelete }) {
  return (
    <div style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <button onClick={() => onToggle(item, !checked)}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", flex: 1, minWidth: 0, textAlign: "left", padding: 0 }}>
        <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, border: `2px solid ${checked ? accent : "#334155"}`, background: checked ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: checked ? "#080d12" : "transparent" }}>✓</span>
        <span style={{ color: checked ? "#94a3b8" : "#e2e8f0", fontSize: 13, textDecoration: checked ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
        <span style={{ color: "#475569", fontSize: 11, fontWeight: 600 }}>{fmtPts(Number(item.points))}pt</span>
        {editable && <>
          <button onClick={() => onEdit(item)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>Edit</button>
          <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: "#475569", fontSize: 15, cursor: "pointer", padding: "2px 4px" }}>✕</button>
        </>}
      </div>
    </div>
  );
}

// ── Today checklist block (used in both parent + kids view) ────────────────
function TodayChecklist({ kid, items, completions, today, onToggle, accent }) {
  const morning = (items[kid] || []).filter(i => i.time_of_day === "morning");
  const evening = (items[kid] || []).filter(i => i.time_of_day === "evening");
  return (
    <>
      <div style={{ margin: "10px 12px 0" }}>
        <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>🌙 Evening</div>
        {evening.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>No evening items yet.</div>}
        {evening.map(it => (
          <ItemRow key={it.id} item={it} checked={!!completions[`${it.id}-${today}`]} accent={accent} onToggle={(item, val) => onToggle(item, today, val)} editable={false} />
        ))}
      </div>
      <div style={{ margin: "14px 12px 0" }}>
        <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>☀️ Morning</div>
        {morning.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>No morning items yet.</div>}
        {morning.map(it => (
          <ItemRow key={it.id} item={it} checked={!!completions[`${it.id}-${today}`]} accent={accent} onToggle={(item, val) => onToggle(item, today, val)} editable={false} />
        ))}
      </div>
    </>
  );
}

// ── Week grid ────────────────────────────────────────────────────────────────
function WeekGrid({ kid, items, completions, weekDates, weekStart, theme, goal }) {
  const kidItems = items[kid] || [];
  const dailyMax = computeDailyMax(kidItems);
  const todayDow = getTodayDow();
  const weekTotal = computeWeekPoints(kidItems, completions, weekDates);
  const weekMax = dailyMax * 7;
  const pct = weekMax > 0 ? Math.min(100, (weekTotal / weekMax) * 100) : 0;
  const goalPct = weekMax > 0 ? Math.min(100, (goal / weekMax) * 100) : 0;

  return (
    <div style={{ margin: "10px 12px 0", background: theme.card, borderRadius: 14, padding: 14, border: `1px solid ${theme.accent}15` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 10 }}>Week of {fmtDateShort(weekStart)}</div>
      {DAYS.map((day, dow) => {
        const date = weekDates[dow];
        const pts = computeDailyPoints(kidItems, completions, date);
        const isToday = dow === todayDow;
        const dayPct = dailyMax > 0 ? (pts / dailyMax) * 100 : 0;
        return (
          <div key={dow} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 32, fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? theme.accent : "#64748b" }}>{day}</span>
            <div style={{ flex: 1, background: "#ffffff0e", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ background: theme.accent, width: `${dayPct}%`, height: "100%", borderRadius: 99 }} />
            </div>
            <span style={{ width: 44, textAlign: "right", fontSize: 11, color: "#94a3b8" }}>{fmtPts(pts)}/{fmtPts(dailyMax)}</span>
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid #1e293b", marginTop: 10, paddingTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Weekly total</span>
          <span style={{ color: theme.accent, fontWeight: 700, fontSize: 14 }}>{fmtPts(weekTotal)} / {fmtPts(weekMax)}</span>
        </div>
        <div style={{ position: "relative", background: "#ffffff12", borderRadius: 99, height: 8 }}>
          <div style={{ background: theme.accent, width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width 0.4s ease" }} />
          {goal > 0 && goal <= weekMax && (
            <div style={{ position: "absolute", top: -3, left: `${goalPct}%`, width: 2, height: 14, background: "#fbbf24" }} title={`Goal: ${goal}`} />
          )}
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Goal: {fmtPts(goal)} pts</div>
      </div>
    </div>
  );
}

// ── Rewards view ─────────────────────────────────────────────────────────────
function RewardsView({ kid, tiers, weekTotal, theme }) {
  const kidTiers = (tiers[kid] || []).slice().sort((a, b) => b.min_points - a.min_points);
  const current = tierForPoints(kidTiers, weekTotal);
  const next = nextTier(kidTiers, weekTotal);
  return (
    <div style={{ margin: "10px 12px 0", background: theme.card, borderRadius: 14, padding: 14, border: `1px solid ${theme.accent}15` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 4 }}>This week: {fmtPts(weekTotal)} pts</div>
      {next && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>{fmtPts(next.min_points - weekTotal)} more pts to reach "{next.label}"</div>}
      {!next && current && <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 12 }}>Top tier reached! 🎉</div>}
      {kidTiers.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No reward tiers set yet.</div>}
      {kidTiers.map(t => {
        const isCurrent = current && current.id === t.id;
        return (
          <div key={t.id} style={{ background: isCurrent ? theme.accent + "18" : "#ffffff08", border: isCurrent ? `1px solid ${theme.accent}60` : "1px solid transparent", borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: isCurrent ? theme.accent : "#e2e8f0", fontSize: 13, fontWeight: isCurrent ? 700 : 500 }}>{t.label}</span>
            <span style={{ color: "#64748b", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{fmtPts(t.min_points)}+ pts</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Item edit form ───────────────────────────────────────────────────────────
function ItemForm({ accent, editingId, initial, onSave, onCancel }) {
  const blank = { label: "", time_of_day: "evening", points: "1" };
  const [form, setForm] = useState(initial || blank);
  useEffect(() => { if (initial) setForm(initial); }, [JSON.stringify(initial)]);
  return (
    <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>{editingId ? "Edit" : "New"} item</div>
      <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Item label" style={{ ...inp, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 2, flex: 2 }}>
          {["evening", "morning"].map(tp => (
            <button key={tp} onClick={() => setForm(f => ({ ...f, time_of_day: tp }))}
              style={{ flex: 1, border: "none", borderRadius: 6, padding: "8px 0", fontSize: 11, cursor: "pointer", fontWeight: 600, background: form.time_of_day === tp ? accent : "transparent", color: form.time_of_day === tp ? "#080d12" : "#475569" }}>
              {tp === "morning" ? "☀️ Morning" : "🌙 Evening"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "0 10px", flex: 1 }}>
          <input type="number" inputMode="decimal" step="0.5" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="Pts"
            style={{ background: "none", border: "none", color: "#f1f5f9", fontSize: 14, outline: "none", width: "100%", padding: "10px 0" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {editingId && <button onClick={onCancel} style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: 8, padding: "10px 0", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>}
        <button onClick={() => onSave(form, editingId, () => setForm(blank))} disabled={!form.label.trim() || !parseFloat(form.points)}
          style={{ flex: 2, background: accent, border: "none", borderRadius: 8, padding: "10px 0", color: "#080d12", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!form.label.trim() || !parseFloat(form.points)) ? 0.4 : 1 }}>
          {editingId ? "Save changes" : "Add item"}
        </button>
      </div>
    </div>
  );
}

// ── Items management panel (parent view) ────────────────────────────────────
function ItemsPanel({ kid, items, goal, tiers, onSaveItem, onDeleteItem, onSaveGoal, onSaveTier, onDeleteTier }) {
  const t = THEME[kid];
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [goalInput, setGoalInput] = useState(String(goal));
  const [tierForm, setTierForm] = useState({ label: "", min_points: "" });
  const [editingTier, setEditingTier] = useState(null);
  useEffect(() => { setGoalInput(String(goal)); }, [goal]);

  const kidItems = items[kid] || [];
  const evening = kidItems.filter(i => i.time_of_day === "evening");
  const morning = kidItems.filter(i => i.time_of_day === "morning");
  const kidTiers = (tiers[kid] || []).slice().sort((a, b) => b.min_points - a.min_points);

  function startEdit(item) { setEditing(item.id); setEditForm({ label: item.label, time_of_day: item.time_of_day, points: String(item.points) }); }
  function clearEdit() { setEditing(null); setEditForm(null); }

  return (
    <div style={{ margin: "0 12px", background: t.card, borderRadius: 16, padding: 14, border: `1px solid ${t.accent}15` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>{kid}'s routine items</div>

      <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Evening</div>
      {evening.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>None yet.</div>}
      {evening.map(it => (
        <ItemRow key={it.id} item={it} checked={false} accent={t.accent} onToggle={() => {}} editable onEdit={startEdit} onDelete={onDeleteItem} />
      ))}

      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 6, marginTop: 12, textTransform: "uppercase" }}>Morning</div>
      {morning.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>None yet.</div>}
      {morning.map(it => (
        <ItemRow key={it.id} item={it} checked={false} accent={t.accent} onToggle={() => {}} editable onEdit={startEdit} onDelete={onDeleteItem} />
      ))}

      <ItemForm accent={t.accent} editingId={editing} initial={editing ? editForm : null}
        onSave={(form, id, reset) => { onSaveItem(form, id, () => { clearEdit(); reset(); }); }} onCancel={clearEdit} />

      {/* Weekly goal */}
      <div style={{ borderTop: "1px solid #1e293b", marginTop: 16, paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Weekly goal</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" inputMode="decimal" value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ ...inp, flex: 1 }} />
          <button onClick={() => onSaveGoal(parseFloat(goalInput) || 0)} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "0 16px", color: "#080d12", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
        </div>
      </div>

      {/* Reward tiers */}
      <div style={{ borderTop: "1px solid #1e293b", marginTop: 16, paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Reward tiers</div>
        {kidTiers.length === 0 && <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>No tiers yet.</div>}
        {kidTiers.map(tier => (
          <div key={tier.id} style={{ background: "#ffffff08", borderRadius: 9, padding: "9px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: "#e2e8f0", fontSize: 13 }}>{tier.label}</span>
              <span style={{ color: "#64748b", fontSize: 12 }}> · {fmtPts(tier.min_points)}+ pts</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setEditingTier(tier.id); setTierForm({ label: tier.label, min_points: String(tier.min_points) }); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer" }}>Edit</button>
              <button onClick={() => onDeleteTier(tier.id)} style={{ background: "none", border: "none", color: "#475569", fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} placeholder="Reward label" style={{ ...inp, flex: 2 }} />
          <input type="number" inputMode="decimal" value={tierForm.min_points} onChange={e => setTierForm(f => ({ ...f, min_points: e.target.value }))} placeholder="Min pts" style={{ ...inp, flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {editingTier && <button onClick={() => { setEditingTier(null); setTierForm({ label: "", min_points: "" }); }} style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: 8, padding: "9px 0", color: "#64748b", fontSize: 12, cursor: "pointer" }}>Cancel</button>}
          <button onClick={() => { onSaveTier(tierForm, editingTier, () => { setEditingTier(null); setTierForm({ label: "", min_points: "" }); }); }}
            disabled={!tierForm.label.trim() || tierForm.min_points === ""}
            style={{ flex: 2, background: t.accent, border: "none", borderRadius: 8, padding: "9px 0", color: "#080d12", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: (!tierForm.label.trim() || tierForm.min_points === "") ? 0.4 : 1 }}>
            {editingTier ? "Save tier" : "Add tier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kids View ─────────────────────────────────────────────────────────────────
function KidsView({ items, completions, weekStart, weekDates, today, onToggle, kidSettings, tiers, streaks }) {
  const [activeKid, setActiveKid] = useState("Noah");
  const [tab, setTab] = useState("today");
  const t = THEME[activeKid];
  const kidItems = items[activeKid] || [];
  const dailyPts = computeDailyPoints(kidItems, completions, today);
  const dailyMax = computeDailyMax(kidItems);
  const weekTotal = computeWeekPoints(kidItems, completions, weekDates);
  const goal = (kidSettings[activeKid] || {}).weekly_goal ?? 20;

  return (
    <div style={{ background: "#080d12", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 48, maxWidth: "100vw", overflowX: "hidden" }}>
      <div style={{ background: "#0c1117", borderBottom: "1px solid #1e293b", padding: "14px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>🚀 Launch Pad</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginTop: 1 }}>{fmtDateShort(today)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "12px 12px 0" }}>
        {KIDS.map(k => {
          const th = THEME[k];
          const kPts = computeDailyPoints(items[k] || [], completions, today);
          const kMax = computeDailyMax(items[k] || []);
          return (
            <button key={k} onClick={() => { setActiveKid(k); setTab("today"); }}
              style={{ background: activeKid === k ? th.card : "#0c1117", border: `1px solid ${activeKid === k ? th.accent + "60" : "#1e293b"}`, borderRadius: 12, padding: "10px 4px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{th.emoji}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: th.accent, marginTop: 2 }}>{fmtPts(kPts)}/{fmtPts(kMax)}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", margin: "12px 12px 0", background: "#0c1117", borderRadius: 10, padding: 3 }}>
        {["today", "week", "rewards"].map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            style={{ border: "none", borderRadius: 8, padding: "9px 0", fontSize: 11, cursor: "pointer", fontWeight: tab === tb ? 700 : 400, background: tab === tb ? t.card : "transparent", color: tab === tb ? t.accent : "#475569" }}>
            {tb[0].toUpperCase() + tb.slice(1)}
          </button>
        ))}
      </div>
      {tab === "today" && (
        <>
          <div style={{ background: t.card, margin: "12px 12px 0", borderRadius: 16, padding: 18, border: `1px solid ${t.accent}20` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: t.text, opacity: 0.6, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Today</div>
                <div style={{ fontSize: 38, fontWeight: 800, color: t.accent, letterSpacing: "-2px", lineHeight: 1 }}>{fmtPts(dailyPts)}<span style={{ fontSize: 18, color: "#64748b" }}>/{fmtPts(dailyMax)}</span></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32 }}>{t.emoji}</div>
                {(streaks[activeKid] || 0) > 0 && <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginTop: 3 }}>🔥 {streaks[activeKid]} wk</div>}
              </div>
            </div>
          </div>
          <TodayChecklist kid={activeKid} items={items} completions={completions} today={today} onToggle={onToggle} accent={t.accent} />
        </>
      )}
      {tab === "week" && <WeekGrid kid={activeKid} items={items} completions={completions} weekDates={weekDates} weekStart={weekStart} theme={t} goal={goal} />}
      {tab === "rewards" && <RewardsView kid={activeKid} tiers={tiers} weekTotal={weekTotal} theme={t} />}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const today = getTodayISO();
  const weekStart = getWeekStart();
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const isKidsView = new URLSearchParams(window.location.search).get("view") === "kids";
  const toast = useToast();

  const [items, setItems]             = useState({ Noah: [], Jonah: [], Leah: [] });
  const [completions, setCompletions] = useState({});
  const [kidSettings, setKidSettings] = useState({});
  const [tiers, setTiers]             = useState({ Noah: [], Jonah: [], Leah: [] });
  const [streaks, setStreaks]         = useState({ Noah: 0, Jonah: 0, Leah: 0 });
  const [dailyNote, setDailyNote]     = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeKid, setActiveKid]     = useState("Noah");
  const [activeTab, setActiveTab]     = useState("today");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const rangeStart = addDays(weekStart, -7 * STREAK_WEEKS_LOOKBACK);
      const rangeEnd = weekDates[6];
      const [itemsRes, settingsRes, tiersRes, compRes, noteRes] = await Promise.all([
        supabase.from("routine_items").select("*").order("kid").order("time_of_day").order("sort_order"),
        supabase.from("kid_settings").select("*"),
        supabase.from("reward_tiers").select("*").order("kid").order("min_points", { ascending: false }),
        supabase.from("routine_completions").select("*").gte("completion_date", rangeStart).lte("completion_date", rangeEnd),
        supabase.from("daily_notes").select("*").eq("note_date", today),
      ]);
      const newItems = { Noah: [], Jonah: [], Leah: [] };
      (itemsRes.data || []).forEach(it => { if (newItems[it.kid]) newItems[it.kid].push(it); });

      const newSettings = {};
      KIDS.forEach(k => { newSettings[k] = { weekly_goal: 20 }; });
      (settingsRes.data || []).forEach(s => { newSettings[s.kid] = s; });

      const newTiers = { Noah: [], Jonah: [], Leah: [] };
      (tiersRes.data || []).forEach(t => { if (newTiers[t.kid]) newTiers[t.kid].push(t); });

      const newComp = {};
      (compRes.data || []).forEach(c => { newComp[`${c.item_id}-${c.completion_date}`] = c.completed; });

      const newNote = {};
      (noteRes.data || []).forEach(n => { newNote[n.kid] = n.note; });

      // compute streaks: consecutive prior weeks meeting goal
      const newStreaks = { Noah: 0, Jonah: 0, Leah: 0 };
      KIDS.forEach(kid => {
        const kidItems = newItems[kid];
        const goal = (newSettings[kid] || {}).weekly_goal ?? 20;
        let count = 0;
        for (let w = 1; w <= STREAK_WEEKS_LOOKBACK; w++) {
          const wStart = addDays(weekStart, -7 * w);
          const wDates = getWeekDates(wStart);
          const wTotal = computeWeekPoints(kidItems, newComp, wDates);
          if (wTotal >= goal && goal > 0) count++; else break;
        }
        newStreaks[kid] = count;
      });

      setItems(newItems); setKidSettings(newSettings); setTiers(newTiers);
      setCompletions(newComp); setDailyNote(newNote); setStreaks(newStreaks);
    } catch (e) { toast.show("Failed to load data", "error"); }
    setLoading(false);
  }, [weekStart, today]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const compSub = supabase.channel("rt-routine-completions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "routine_completions" }, (payload) => {
        const c = payload.new;
        setCompletions(cm => ({ ...cm, [`${c.item_id}-${c.completion_date}`]: c.completed }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "routine_completions" }, (payload) => {
        const c = payload.new;
        setCompletions(cm => ({ ...cm, [`${c.item_id}-${c.completion_date}`]: c.completed }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "routine_completions" }, (payload) => {
        const c = payload.old;
        setCompletions(cm => { const n = { ...cm }; delete n[`${c.item_id}-${c.completion_date}`]; return n; });
      })
      .subscribe();

    const noteSub = supabase.channel("rt-daily-notes")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_notes" }, (payload) => {
        const n = payload.new;
        if (n && n.note_date === today) setDailyNote(dn => ({ ...dn, [n.kid]: n.note }));
      })
      .subscribe();

    return () => { supabase.removeChannel(compSub); supabase.removeChannel(noteSub); };
  }, [today]);

  async function toggleCompletion(item, date, val) {
    const key = `${item.id}-${date}`;
    setCompletions(c => ({ ...c, [key]: val }));
    try {
      if (val) {
        await supabase.from("routine_completions").upsert(
          { item_id: item.id, kid: item.kid, completion_date: date, completed: true },
          { onConflict: "item_id,completion_date" }
        );
      } else {
        await supabase.from("routine_completions").delete().eq("item_id", item.id).eq("completion_date", date);
      }
    } catch { toast.show("Failed to save", "error"); }
  }

  async function saveItem(form, editingId, onDone) {
    const points = parseFloat(form.points) || 1;
    if (!form.label.trim()) return;
    if (editingId) {
      await supabase.from("routine_items").update({ label: form.label.trim(), time_of_day: form.time_of_day, points }).eq("id", editingId);
      setItems(it => ({ ...it, [activeKid]: it[activeKid].map(x => x.id === editingId ? { ...x, label: form.label.trim(), time_of_day: form.time_of_day, points } : x) }));
    } else {
      const sortOrder = (items[activeKid] || []).filter(x => x.time_of_day === form.time_of_day).length;
      const { data } = await supabase.from("routine_items").insert({ kid: activeKid, label: form.label.trim(), time_of_day: form.time_of_day, points, sort_order: sortOrder }).select().single();
      setItems(it => ({ ...it, [activeKid]: [...it[activeKid], data] }));
    }
    toast.show(editingId ? "Updated" : "Added"); onDone();
  }

  async function deleteItem(id) {
    await supabase.from("routine_items").delete().eq("id", id);
    setItems(it => ({ ...it, [activeKid]: it[activeKid].filter(x => x.id !== id) }));
    toast.show("Deleted");
  }

  async function saveGoal(goal) {
    await supabase.from("kid_settings").upsert({ kid: activeKid, weekly_goal: goal }, { onConflict: "kid" });
    setKidSettings(s => ({ ...s, [activeKid]: { ...(s[activeKid] || {}), kid: activeKid, weekly_goal: goal } }));
    toast.show("Goal updated");
  }

  async function saveTier(form, editingId, onDone) {
    const min_points = parseFloat(form.min_points);
    if (!form.label.trim() || isNaN(min_points)) return;
    if (editingId) {
      await supabase.from("reward_tiers").update({ label: form.label.trim(), min_points }).eq("id", editingId);
      setTiers(t => ({ ...t, [activeKid]: t[activeKid].map(x => x.id === editingId ? { ...x, label: form.label.trim(), min_points } : x) }));
    } else {
      const { data } = await supabase.from("reward_tiers").insert({ kid: activeKid, label: form.label.trim(), min_points }).select().single();
      setTiers(t => ({ ...t, [activeKid]: [...t[activeKid], data] }));
    }
    toast.show(editingId ? "Tier updated" : "Tier added"); onDone();
  }

  async function deleteTier(id) {
    await supabase.from("reward_tiers").delete().eq("id", id);
    setTiers(t => ({ ...t, [activeKid]: t[activeKid].filter(x => x.id !== id) }));
    toast.show("Tier deleted");
  }

  async function saveNote(kid, note) {
    setDailyNote(dn => ({ ...dn, [kid]: note }));
    try {
      await supabase.from("daily_notes").upsert({ kid, note_date: today, note }, { onConflict: "kid,note_date" });
    } catch { toast.show("Failed to save note", "error"); }
  }

  if (loading) return (
    <div style={{ background: "#080d12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ color: "#334155", fontSize: 15 }}>Loading…</div>
    </div>
  );

  if (isKidsView) return (
    <KidsView items={items} completions={completions} weekStart={weekStart} weekDates={weekDates} today={today}
      onToggle={toggleCompletion} kidSettings={kidSettings} tiers={tiers} streaks={streaks} />
  );

  const t = THEME[activeKid];
  const kidItems = items[activeKid] || [];
  const weekTotal = computeWeekPoints(kidItems, completions, weekDates);
  const goal = (kidSettings[activeKid] || {}).weekly_goal ?? 20;

  return (
    <div style={{ background: "#080d12", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 48, maxWidth: "100vw", overflowX: "hidden" }}>
      {toast.El}
      <div style={{ background: "#0c1117", borderBottom: "1px solid #1e293b", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>🚀 Launch Pad</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginTop: 1 }}>{fmtDateShort(today)}</div>
        </div>
      </div>

      <div style={{ display: "flex", background: "#0c1117", borderBottom: "1px solid #1e293b" }}>
        {KIDS.map(k => (
          <button key={k} onClick={() => { setActiveKid(k); setActiveTab("today"); }}
            style={{ flex: 1, border: "none", background: "none", padding: "11px 0", cursor: "pointer", borderBottom: activeKid === k ? `2px solid ${THEME[k].accent}` : "2px solid transparent", color: activeKid === k ? THEME[k].accent : "#475569", fontWeight: activeKid === k ? 700 : 400, fontSize: 13 }}>
            {THEME[k].emoji} {k}
          </button>
        ))}
      </div>

      <div style={{ background: t.card, margin: "12px 12px 0", borderRadius: 18, padding: 18, border: `1px solid ${t.accent}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: t.text, opacity: 0.6, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>This week</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: t.accent, letterSpacing: "-2px", lineHeight: 1 }}>{fmtPts(weekTotal)}<span style={{ fontSize: 16, color: "#64748b" }}> / {fmtPts(goal)} goal</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            {streaks[activeKid] > 0 && <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700 }}>🔥 {streaks[activeKid]} wk streak</div>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>
          {["today", "week", "items", "rewards"].map(tb => (
            <button key={tb} onClick={() => setActiveTab(activeTab === tb ? "today" : tb)}
              style={{ background: activeTab === tb ? t.muted : "#ffffff08", color: t.text, border: "none", borderRadius: 10, padding: "10px 4px", fontSize: 12, cursor: "pointer", fontWeight: activeTab === tb ? 600 : 400, textTransform: "capitalize" }}>
              {tb}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "today" && (
        <>
          <TodayChecklist kid={activeKid} items={items} completions={completions} today={today} onToggle={toggleCompletion} accent={t.accent} />
          <div style={{ margin: "14px 12px 0", background: t.card, borderRadius: 14, padding: 14, border: `1px solid ${t.accent}15` }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginBottom: 8 }}>💬 Parent note / wins today</div>
            <textarea value={dailyNote[activeKid] || ""} onChange={e => saveNote(activeKid, e.target.value)} placeholder="Optional note..."
              style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </>
      )}
      {activeTab === "week" && <WeekGrid kid={activeKid} items={items} completions={completions} weekDates={weekDates} weekStart={weekStart} theme={t} goal={goal} />}
      {activeTab === "rewards" && <RewardsView kid={activeKid} tiers={tiers} weekTotal={weekTotal} theme={t} />}
      {activeTab === "items" && (
        <div style={{ marginTop: 10 }}>
          <ItemsPanel kid={activeKid} items={items} goal={goal} tiers={tiers}
            onSaveItem={saveItem} onDeleteItem={deleteItem} onSaveGoal={saveGoal}
            onSaveTier={saveTier} onDeleteTier={deleteTier} />
        </div>
      )}
    </div>
  );
}
