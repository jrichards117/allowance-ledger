import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIDS = ["Noah", "Jonah", "Leah"];
const DEFAULT_ALLOWANCE = { Noah: 40, Jonah: 40, Leah: 40 };
const PIN = import.meta.env.VITE_PARENT_PIN || "1234";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const THEME = {
  Noah:  { bg: "#0a0f1a", card: "#0d1424", accent: "#60a5fa", muted: "#152040", text: "#bfdbfe", emoji: "🚴" },
  Jonah: { bg: "#0a1a0d", card: "#0d2410", accent: "#4ade80", muted: "#163d1e", text: "#a7f3c0", emoji: "🥋" },
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

function getTodayDow() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // 0=Mon..6=Sun
}

function fmt(n) { return (n < 0 ? "−" : "+") + "$" + Math.abs(n).toFixed(2); }
function fmtBal(n) { return (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2); }
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── PIN Hook ──────────────────────────────────────────────────────────────────
function usePIN() {
  const [unlocked, setUnlocked] = useState(false);
  const [show, setShow] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(null);

  function require(action) {
    if (unlocked) { action(); return; }
    setPending(() => action);
    setShow(true);
  }
  function submit() {
    if (input === PIN) {
      setUnlocked(true); setError(false); setShow(false); setInput("");
      if (pending) { pending(); setPending(null); }
    } else { setError(true); setInput(""); }
  }
  function dismiss() { setShow(false); setInput(""); setError(false); }

  const Modal = show ? (
    <div style={{ position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300 }}
      onClick={dismiss}>
      <div style={{ background:"#1e293b",borderRadius:20,padding:28,width:300,textAlign:"center" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:28,marginBottom:8 }}>🔒</div>
        <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:17,marginBottom:4 }}>Parent PIN</div>
        <div style={{ color:"#64748b",fontSize:13,marginBottom:20 }}>Enter your PIN to continue</div>
        <input type="password" inputMode="numeric" value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="····" autoFocus
          style={{ width:"100%",background:"#0f172a",border:error?"1px solid #f87171":"1px solid #334155",borderRadius:10,padding:"12px 14px",fontSize:22,color:"#f1f5f9",textAlign:"center",outline:"none",letterSpacing:"0.4em",boxSizing:"border-box" }}/>
        {error && <div style={{ color:"#f87171",fontSize:12,marginTop:6 }}>Incorrect PIN</div>}
        <div style={{ display:"flex",gap:10,marginTop:16 }}>
          <button onClick={dismiss} style={{ flex:1,background:"#334155",border:"none",borderRadius:10,padding:"12px 0",color:"#94a3b8",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
          <button onClick={submit} style={{ flex:1,background:"#3b82f6",border:"none",borderRadius:10,padding:"12px 0",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14 }}>Unlock</button>
        </div>
      </div>
    </div>
  ) : null;

  return { unlocked, setUnlocked, require, Modal };
}

// ── Toast Hook ────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }
  const ToastEl = toast ? (
    <div style={{ position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#7f1d1d":"#14532d",color:toast.type==="error"?"#fca5a5":"#86efac",padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:600,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px #00000060" }}>
      {toast.msg}
    </div>
  ) : null;
  return { show, ToastEl };
}

// ── Chores Panel ──────────────────────────────────────────────────────────────
function ChoresPanel({ kid, chores, completions, weekStart, pin, onToggle, onSave, onDelete }) {
  const t = THEME[kid];
  const [form, setForm] = useState({ label:"", type:"weekly", penalty:"" });
  const [editing, setEditing] = useState(null);
  const todayDow = getTodayDow();

  const kidChores = chores[kid] || [];

  function startEdit(c) {
    setEditing(c.id);
    setForm({ label: c.label, type: c.chore_type, penalty: String(c.penalty) });
  }

  return (
    <div style={{ marginInline:16, background:t.card, borderRadius:16, padding:16, border:`1px solid ${t.accent}15` }}>
      <div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:14 }}>{kid}'s chores</div>

      {kidChores.length === 0 && <div style={{ color:"#475569",fontSize:13,marginBottom:14 }}>No chores yet — add one below.</div>}

      {kidChores.map(c => {
        const key = (dow) => `${c.id}-${weekStart}-${dow ?? "w"}`;
        const isWeekly = c.chore_type === "weekly";
        const weeklyDone = completions[key(null)];

        return (
          <div key={c.id} style={{ background:"#ffffff08",borderRadius:12,padding:"12px",marginBottom:8 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: isWeekly ? 0 : 8 }}>
              <div>
                <span style={{ color:"#e2e8f0",fontSize:13,fontWeight:600 }}>{c.label}</span>
                <span style={{ color:"#475569",fontSize:11,marginLeft:8 }}>
                  {isWeekly ? "weekly" : "daily"} · ${c.penalty.toFixed(2)} penalty
                </span>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                {isWeekly && (
                  <button onClick={() => onToggle(c, null, !weeklyDone)}
                    style={{ width:28,height:28,borderRadius:8,border:`2px solid ${weeklyDone ? t.accent : "#334155"}`,background:weeklyDone ? t.accent : "transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>
                    {weeklyDone ? "✓" : ""}
                  </button>
                )}
                {pin.unlocked && (
                  <>
                    <button onClick={() => startEdit(c)} style={{ background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer" }}>Edit</button>
                    <button onClick={() => onDelete(c.id)} style={{ background:"none",border:"none",color:"#475569",fontSize:15,cursor:"pointer" }}>✕</button>
                  </>
                )}
              </div>
            </div>

            {!isWeekly && (
              <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                {DAYS.map((day, dow) => {
                  const done = completions[key(dow)];
                  const isToday = dow === todayDow;
                  return (
                    <button key={dow} onClick={() => onToggle(c, dow, !done)}
                      style={{ flex:1,minWidth:34,padding:"5px 0",borderRadius:6,border:`1.5px solid ${done ? t.accent : isToday ? t.accent+"60" : "#334155"}`,background:done ? t.accent : "transparent",cursor:"pointer",fontSize:10,color:done ? "#080d12" : isToday ? t.text : "#475569",fontWeight:done||isToday ? 700:400 }}>
                      {day}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Add/edit form */}
      <div style={{ borderTop:"1px solid #1e293b",paddingTop:14,marginTop:8 }}>
        <div style={{ fontSize:12,color:"#64748b",marginBottom:10,fontWeight:600 }}>{editing ? "Edit chore" : "New chore"}</div>
        <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}
          placeholder="Chore label (e.g. Unload dishwasher)"
          style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box",marginBottom:8 }}/>
        <div style={{ display:"flex",gap:8,marginBottom:8 }}>
          <div style={{ display:"flex",background:"#0f172a",borderRadius:8,padding:2,flex:1 }}>
            {["weekly","daily"].map(tp=>(
              <button key={tp} onClick={()=>setForm(f=>({...f,type:tp}))}
                style={{ flex:1,border:"none",borderRadius:6,padding:"8px 0",fontSize:12,cursor:"pointer",fontWeight:600,background:form.type===tp?t.accent:"transparent",color:form.type===tp?"#080d12":"#475569" }}>
                {tp.charAt(0).toUpperCase()+tp.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"0 10px",flex:1 }}>
            <span style={{ color:"#475569",fontSize:13 }}>$</span>
            <input type="number" inputMode="decimal" value={form.penalty} onChange={e=>setForm(f=>({...f,penalty:e.target.value}))}
              placeholder="Penalty"
              style={{ background:"none",border:"none",color:"#f1f5f9",fontSize:14,outline:"none",width:"100%",padding:"10px 4px" }}/>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {editing && (
            <button onClick={()=>{setEditing(null);setForm({label:"",type:"weekly",penalty:""});}}
              style={{ flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"10px 0",color:"#64748b",fontSize:13,cursor:"pointer" }}>Cancel</button>
          )}
          <button onClick={()=>onSave(form,editing,()=>{setEditing(null);setForm({label:"",type:"weekly",penalty:""});})}
            disabled={!form.label.trim()}
            style={{ flex:2,background:t.accent,border:"none",borderRadius:8,padding:"10px 0",color:"#080d12",fontSize:13,fontWeight:700,cursor:"pointer",opacity:!form.label.trim()?0.4:1 }}>
            {editing ? "Save changes" : "Add chore"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settle Up Modal ───────────────────────────────────────────────────────────
function SettleUpModal({ chores, completions, weekStart, balances, allowances, onConfirm, onClose }) {
  const missed = [];
  KIDS.forEach(kid => {
    (chores[kid] || []).forEach(c => {
      if (c.chore_type === "weekly") {
        const key = `${c.id}-${weekStart}-w`;
        if (!completions[key]) missed.push({ kid, chore: c, label: c.label, penalty: c.penalty, day: null });
      } else {
        DAYS.forEach((day, dow) => {
          const key = `${c.id}-${weekStart}-${dow}`;
          if (!completions[key]) missed.push({ kid, chore: c, label: `${c.label} (${day})`, penalty: c.penalty, day: dow });
        });
      }
    });
  });

  const byKid = {};
  KIDS.forEach(k => { byKid[k] = missed.filter(m => m.kid === k); });
  const total = missed.reduce((s, m) => s + m.penalty, 0);

  const [selected, setSelected] = useState(() => {
    const s = {};
    missed.forEach((m, i) => { s[i] = m.penalty > 0; });
    return s;
  });

  const selectedTotal = missed.reduce((s, m, i) => s + (selected[i] ? m.penalty : 0), 0);

  return (
    <div style={{ position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:250 }}
      onClick={onClose}>
      <div style={{ background:"#1e293b",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:18 }}>🧹 Settle Up</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#475569",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color:"#64748b",fontSize:13,marginBottom:16 }}>Unchecked chores this week. Select which to deduct.</div>

        {missed.length === 0 && (
          <div style={{ color:"#4ade80",fontSize:14,textAlign:"center",padding:"24px 0" }}>✓ All chores completed!</div>
        )}

        {KIDS.map(kid => {
          const kidMissed = byKid[kid];
          if (!kidMissed.length) return null;
          const t = THEME[kid];
          return (
            <div key={kid} style={{ marginBottom:16 }}>
              <div style={{ color:t.accent,fontWeight:700,fontSize:13,marginBottom:8 }}>{t.emoji} {kid}</div>
              {kidMissed.map((m, localIdx) => {
                const globalIdx = missed.indexOf(m);
                return (
                  <div key={globalIdx} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"#ffffff08",borderRadius:8,padding:"9px 12px",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <input type="checkbox" checked={!!selected[globalIdx]} onChange={e=>setSelected(s=>({...s,[globalIdx]:e.target.checked}))}
                        style={{ width:16,height:16,accentColor:t.accent,cursor:"pointer" }}/>
                      <span style={{ color:"#e2e8f0",fontSize:13 }}>{m.label}</span>
                    </div>
                    <span style={{ color:"#f87171",fontSize:13,fontWeight:600 }}>−${m.penalty.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {missed.length > 0 && (
          <>
            <div style={{ borderTop:"1px solid #1e293b",paddingTop:14,marginTop:4,display:"flex",justifyContent:"space-between",marginBottom:16 }}>
              <span style={{ color:"#94a3b8",fontSize:14 }}>Total deductions</span>
              <span style={{ color:"#f87171",fontWeight:700,fontSize:16 }}>−${selectedTotal.toFixed(2)}</span>
            </div>
            <button onClick={() => onConfirm(missed.filter((_,i)=>selected[i]))}
              disabled={selectedTotal === 0}
              style={{ width:"100%",background:"#f87171",border:"none",borderRadius:12,padding:"14px 0",fontWeight:800,fontSize:16,color:"#080d12",cursor:"pointer",opacity:selectedTotal===0?0.4:1 }}>
              Apply {selectedTotal > 0 ? `−$${selectedTotal.toFixed(2)}` : ""} deductions
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Kids View ─────────────────────────────────────────────────────────────────
function KidsView({ balances, transactions, allowances, chores, completions, weekStart, onToggleChore }) {
  const [activeKid, setActiveKid] = useState("Noah");
  const [tab, setTab] = useState("balance"); // balance | chores | history
  const t = THEME[activeKid];
  const balance = balances[activeKid];
  const txList = transactions[activeKid];
  const allowance = allowances[activeKid] || DEFAULT_ALLOWANCE[activeKid];
  const pct = Math.max(0, Math.min(100, (balance / allowance) * 100));
  const isNeg = balance < 0;
  const kidChores = chores[activeKid] || [];
  const todayDow = getTodayDow();

  return (
    <div style={{ background:"#080d12",minHeight:"100vh",fontFamily:"'Inter', system-ui, sans-serif",paddingBottom:48 }}>
      <div style={{ background:"#0c1117",borderBottom:"1px solid #1e293b",padding:"16px 20px",textAlign:"center" }}>
        <div style={{ fontSize:11,color:"#475569",letterSpacing:"0.12em",textTransform:"uppercase" }}>☀️ Summer Ledger</div>
        <div style={{ fontSize:15,fontWeight:700,color:"#f1f5f9",marginTop:1 }}>
          Week of {new Date(weekStart+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
        </div>
      </div>

      {/* Kid selector */}
      <div style={{ display:"flex",gap:10,padding:"14px 16px 0" }}>
        {KIDS.map(k => {
          const bal = balances[k];
          const th = THEME[k];
          return (
            <button key={k} onClick={()=>{setActiveKid(k);setTab("balance");}}
              style={{ flex:1,background:activeKid===k?th.card:"#0c1117",border:`1px solid ${activeKid===k?th.accent+"60":"#1e293b"}`,borderRadius:14,padding:"12px 8px",cursor:"pointer" }}>
              <div style={{ fontSize:18 }}>{th.emoji}</div>
              <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>{k}</div>
              <div style={{ fontSize:18,fontWeight:800,color:bal<0?"#f87171":th.accent,letterSpacing:"-0.5px",marginTop:2 }}>{fmtBal(bal)}</div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",marginInline:16,marginTop:14,background:"#0c1117",borderRadius:10,padding:3 }}>
        {["balance","chores","history"].map(tb=>(
          <button key={tb} onClick={()=>setTab(tb)}
            style={{ flex:1,border:"none",borderRadius:8,padding:"9px 0",fontSize:13,cursor:"pointer",fontWeight:tab===tb?700:400,background:tab===tb?t.card:"transparent",color:tab===tb?t.accent:"#475569" }}>
            {tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {/* Balance tab */}
      {tab==="balance" && (
        <div style={{ background:t.card,margin:16,borderRadius:20,padding:22,border:`1px solid ${t.accent}20` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
            <div>
              <div style={{ fontSize:12,color:t.text,opacity:0.6,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em" }}>Balance</div>
              <div style={{ fontSize:48,fontWeight:800,color:isNeg?"#f87171":t.accent,letterSpacing:"-2px",lineHeight:1 }}>{fmtBal(balance)}</div>
              <div style={{ fontSize:12,color:t.text,opacity:0.5,marginTop:4 }}>of ${allowance.toFixed(2)} this week</div>
            </div>
            <div style={{ fontSize:36 }}>{t.emoji}</div>
          </div>
          <div style={{ background:"#ffffff12",borderRadius:99,height:8 }}>
            <div style={{ background:isNeg?"#f87171":t.accent,width:`${pct}%`,height:"100%",borderRadius:99,transition:"width 0.5s ease" }}/>
          </div>
        </div>
      )}

      {/* Chores tab */}
      {tab==="chores" && (
        <div style={{ marginInline:16,marginTop:4,background:t.card,borderRadius:16,padding:16,border:`1px solid ${t.accent}15` }}>
          <div style={{ fontSize:13,fontWeight:600,color:t.text,marginBottom:12 }}>My chores</div>
          {kidChores.length===0 && <div style={{ color:"#475569",fontSize:13 }}>No chores assigned yet.</div>}
          {kidChores.map(c => {
            const isWeekly = c.chore_type==="weekly";
            const weeklyKey = `${c.id}-${weekStart}-w`;
            const weeklyDone = completions[weeklyKey];
            return (
              <div key={c.id} style={{ background:"#ffffff08",borderRadius:12,padding:12,marginBottom:8 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isWeekly?0:8 }}>
                  <span style={{ color:"#e2e8f0",fontSize:13,fontWeight:600 }}>{c.label}</span>
                  {isWeekly && (
                    <button onClick={()=>onToggleChore(c,null,!weeklyDone)}
                      style={{ width:28,height:28,borderRadius:8,border:`2px solid ${weeklyDone?t.accent:"#334155"}`,background:weeklyDone?t.accent:"transparent",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {weeklyDone?"✓":""}
                    </button>
                  )}
                </div>
                {!isWeekly && (
                  <div style={{ display:"flex",gap:5 }}>
                    {DAYS.map((day,dow)=>{
                      const done = completions[`${c.id}-${weekStart}-${dow}`];
                      const isToday = dow===todayDow;
                      return (
                        <button key={dow} onClick={()=>onToggleChore(c,dow,!done)}
                          style={{ flex:1,padding:"5px 0",borderRadius:6,border:`1.5px solid ${done?t.accent:isToday?t.accent+"60":"#334155"}`,background:done?t.accent:"transparent",cursor:"pointer",fontSize:10,color:done?"#080d12":isToday?t.text:"#475569",fontWeight:done||isToday?700:400 }}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History tab */}
      {tab==="history" && (
        <div style={{ marginInline:16,marginTop:4,background:t.card,borderRadius:16,padding:16,border:`1px solid ${t.accent}15` }}>
          <div style={{ fontSize:13,fontWeight:600,color:t.text,marginBottom:12 }}>This week</div>
          {txList.length===0 && <div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0" }}>No transactions yet</div>}
          {txList.map(tx=>(
            <div key={tx.id} style={{ background:"#ffffff08",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
              <div>
                <div style={{ color:"#e2e8f0",fontSize:13,fontWeight:500 }}>{tx.reason}</div>
                <div style={{ color:"#475569",fontSize:11,marginTop:2 }}>{fmtTime(tx.created_at)}</div>
              </div>
              <span style={{ fontWeight:700,fontSize:14,color:tx.amount<0?"#f87171":"#4ade80" }}>{fmt(tx.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const weekStart = getWeekStart();
  const isKidsView = new URLSearchParams(window.location.search).get("view") === "kids";

  const pin = usePIN();
  const toast = useToast();

  const [balances, setBalances] = useState({ Noah:40, Jonah:40, Leah:40 });
  const [transactions, setTransactions] = useState({ Noah:[], Jonah:[], Leah:[] });
  const [presets, setPresets] = useState({ Noah:[], Jonah:[], Leah:[] });
  const [transferPresets, setTransferPresets] = useState([]);
  const [allowances, setAllowances] = useState({ ...DEFAULT_ALLOWANCE });
  const [chores, setChores] = useState({ Noah:[], Jonah:[], Leah:[] });
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeKid, setActiveKid] = useState("Noah");
  const [activeTab, setActiveTab] = useState("balance"); // balance | history | presets | chores

  // Modals
  const [txModal, setTxModal] = useState(false);
  const [txType, setTxType] = useState("deduct"); // deduct | bonus | transfer
  const [txAmount, setTxAmount] = useState("");
  const [txReason, setTxReason] = useState("");
  const [txToKid, setTxToKid] = useState("");
  const [showAllowances, setShowAllowances] = useState(false);
  const [allowanceEdit, setAllowanceEdit] = useState({ ...DEFAULT_ALLOWANCE });
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [presetForm, setPresetForm] = useState({ label:"", amount:"", type:"deduct" });
  const [editingPreset, setEditingPreset] = useState(null);
  const [showTransferPresets, setShowTransferPresets] = useState(false);
  const [tpForm, setTpForm] = useState({ from_kid:"Noah", to_kid:"Jonah", amount:"", reason:"" });
  const [editingTp, setEditingTp] = useState(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, presetRes, tpRes, settingsRes, choresRes, compRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("week_start", weekStart).order("created_at", { ascending:false }),
        supabase.from("presets").select("*").order("label"),
        supabase.from("transfer_presets").select("*").order("reason"),
        supabase.from("settings").select("*"),
        supabase.from("chores").select("*").order("sort_order"),
        supabase.from("chore_completions").select("*").eq("week_start", weekStart),
      ]);

      const newAllowances = { ...DEFAULT_ALLOWANCE };
      (settingsRes.data||[]).forEach(s => {
        const kid = s.key.replace("allowance_","");
        if (KIDS.includes(kid)) newAllowances[kid] = parseFloat(s.value);
      });

      const newBalances = { Noah:newAllowances.Noah, Jonah:newAllowances.Jonah, Leah:newAllowances.Leah };
      const newTx = { Noah:[], Jonah:[], Leah:[] };
      (txRes.data||[]).forEach(tx => {
        if (newBalances[tx.kid] !== undefined) {
          newBalances[tx.kid] = parseFloat((newBalances[tx.kid] + tx.amount).toFixed(2));
          newTx[tx.kid].push(tx);
        }
      });

      const newPresets = { Noah:[], Jonah:[], Leah:[] };
      (presetRes.data||[]).forEach(p => { if (newPresets[p.kid]) newPresets[p.kid].push(p); });

      const newChores = { Noah:[], Jonah:[], Leah:[] };
      (choresRes.data||[]).forEach(c => { if (newChores[c.kid]) newChores[c.kid].push(c); });

      const newCompletions = {};
      (compRes.data||[]).forEach(c => {
        const key = `${c.chore_id}-${c.week_start}-${c.day_of_week ?? "w"}`;
        newCompletions[key] = c.completed;
      });

      setAllowances(newAllowances);
      setAllowanceEdit(newAllowances);
      setBalances(newBalances);
      setTransactions(newTx);
      setPresets(newPresets);
      setTransferPresets(tpRes.data||[]);
      setChores(newChores);
      setCompletions(newCompletions);
    } catch { toast.show("Failed to load data","error"); }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Toggle chore completion ─────────────────────────────────────────────────
  async function toggleChore(chore, dow, newVal) {
    const key = `${chore.id}-${weekStart}-${dow ?? "w"}`;
    setCompletions(c => ({ ...c, [key]: newVal }));
    try {
      if (newVal) {
        await supabase.from("chore_completions").upsert({
          chore_id: chore.id, kid: chore.kid, week_start: weekStart,
          day_of_week: dow ?? null, completed: true
        }, { onConflict: "chore_id,week_start,day_of_week" });
      } else {
        await supabase.from("chore_completions").delete()
          .eq("chore_id", chore.id).eq("week_start", weekStart)
          .is(dow === null ? "day_of_week" : "id", dow === null ? null : -1);
        if (dow !== null) {
          await supabase.from("chore_completions").delete()
            .eq("chore_id", chore.id).eq("week_start", weekStart).eq("day_of_week", dow);
        }
      }
    } catch { toast.show("Failed to save","error"); }
  }

  // ── Transactions ────────────────────────────────────────────────────────────
  function openTxModal(preset=null, tPreset=null) {
    pin.require(() => {
      if (tPreset) {
        setTxType("transfer");
        setTxAmount(String(tPreset.amount));
        setTxReason(tPreset.reason);
        setTxToKid(tPreset.to_kid);
        setActiveKid(tPreset.from_kid);
      } else if (preset) {
        setTxType(preset.type);
        setTxAmount(String(Math.abs(preset.amount)));
        setTxReason(preset.label);
        setTxToKid("");
      } else {
        setTxType("deduct");
        setTxAmount("");
        setTxReason("");
        setTxToKid(KIDS.filter(k=>k!==activeKid)[0]);
      }
      setTxModal(true);
    });
  }

  async function submitTx() {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0 || !txReason.trim()) return;
    if (txType === "transfer" && !txToKid) return;

    try {
      if (txType === "transfer") {
        const inserts = [
          { kid: activeKid, amount: -amt, reason: `Transfer to ${txToKid}: ${txReason.trim()}`, week_start: weekStart },
          { kid: txToKid,   amount:  amt, reason: `Transfer from ${activeKid}: ${txReason.trim()}`, week_start: weekStart },
        ];
        const { error } = await supabase.from("transactions").insert(inserts);
        if (error) throw error;
        const now = new Date().toISOString();
        setBalances(b => ({
          ...b,
          [activeKid]: parseFloat((b[activeKid] - amt).toFixed(2)),
          [txToKid]:   parseFloat((b[txToKid]   + amt).toFixed(2)),
        }));
        setTransactions(t => ({
          ...t,
          [activeKid]: [{ id: Date.now(),   kid: activeKid, amount: -amt, reason: inserts[0].reason, created_at: now }, ...t[activeKid]],
          [txToKid]:   [{ id: Date.now()+1, kid: txToKid,   amount:  amt, reason: inserts[1].reason, created_at: now }, ...t[txToKid]],
        }));
        toast.show(`Transferred $${amt.toFixed(2)} from ${activeKid} to ${txToKid}`);
      } else {
        const delta = txType === "deduct" ? -amt : amt;
        const { error } = await supabase.from("transactions").insert({ kid: activeKid, amount: delta, reason: txReason.trim(), week_start: weekStart });
        if (error) throw error;
        setBalances(b => ({ ...b, [activeKid]: parseFloat((b[activeKid]+delta).toFixed(2)) }));
        setTransactions(t => ({ ...t, [activeKid]: [{ id: Date.now(), kid: activeKid, amount: delta, reason: txReason.trim(), created_at: new Date().toISOString() }, ...t[activeKid]] }));
        toast.show(`${txType==="deduct"?"Deducted":"Added"} $${amt.toFixed(2)} for ${activeKid}`);
      }
      setTxModal(false);
    } catch { toast.show("Failed to save transaction","error"); }
  }

  async function deleteTx(txId) {
    try {
      const tx = transactions[activeKid].find(t=>t.id===txId);
      if (!tx) return;
      await supabase.from("transactions").delete().eq("id", txId);
      setBalances(b=>({...b,[activeKid]:parseFloat((b[activeKid]-tx.amount).toFixed(2))}));
      setTransactions(t=>({...t,[activeKid]:t[activeKid].filter(x=>x.id!==txId)}));
      toast.show("Transaction removed");
    } catch { toast.show("Failed to remove","error"); }
  }

  // ── Presets ─────────────────────────────────────────────────────────────────
  async function savePreset() {
    const amt = parseFloat(presetForm.amount);
    if (!presetForm.label.trim() || !amt || amt <= 0) return;
    const delta = presetForm.type==="deduct" ? -amt : amt;
    try {
      if (editingPreset) {
        await supabase.from("presets").update({ label:presetForm.label.trim(), amount:delta, type:presetForm.type }).eq("id",editingPreset);
        setPresets(p=>({...p,[activeKid]:p[activeKid].map(x=>x.id===editingPreset?{...x,label:presetForm.label.trim(),amount:delta,type:presetForm.type}:x)}));
      } else {
        const { data } = await supabase.from("presets").insert({ kid:activeKid, label:presetForm.label.trim(), amount:delta, type:presetForm.type }).select().single();
        setPresets(p=>({...p,[activeKid]:[...p[activeKid],data].sort((a,b)=>a.label.localeCompare(b.label))}));
      }
      setPresetForm({ label:"", amount:"", type:"deduct" });
      setEditingPreset(null);
      toast.show(editingPreset?"Preset updated":"Preset saved");
    } catch { toast.show("Failed to save preset","error"); }
  }

  async function deletePreset(id) {
    await supabase.from("presets").delete().eq("id",id);
    setPresets(p=>({...p,[activeKid]:p[activeKid].filter(x=>x.id!==id)}));
    toast.show("Preset deleted");
  }

  // ── Transfer Presets ─────────────────────────────────────────────────────────
  async function saveTp() {
    const amt = parseFloat(tpForm.amount);
    if (!tpForm.reason.trim() || !amt || amt<=0 || tpForm.from_kid===tpForm.to_kid) return;
    try {
      if (editingTp) {
        await supabase.from("transfer_presets").update({ from_kid:tpForm.from_kid, to_kid:tpForm.to_kid, amount:amt, reason:tpForm.reason.trim() }).eq("id",editingTp);
        setTransferPresets(tp=>tp.map(x=>x.id===editingTp?{...x,...tpForm,amount:amt}:x));
      } else {
        const { data } = await supabase.from("transfer_presets").insert({ from_kid:tpForm.from_kid, to_kid:tpForm.to_kid, amount:amt, reason:tpForm.reason.trim() }).select().single();
        setTransferPresets(tp=>[...tp,data]);
      }
      setTpForm({ from_kid:"Noah", to_kid:"Jonah", amount:"", reason:"" });
      setEditingTp(null);
      toast.show(editingTp?"Transfer preset updated":"Transfer preset saved");
    } catch { toast.show("Failed to save","error"); }
  }

  async function deleteTp(id) {
    await supabase.from("transfer_presets").delete().eq("id",id);
    setTransferPresets(tp=>tp.filter(x=>x.id!==id));
    toast.show("Transfer preset deleted");
  }

  // ── Chore management ─────────────────────────────────────────────────────────
  async function saveChore(form, editingId, onDone) {
    const penalty = parseFloat(form.penalty) || 0;
    if (!form.label.trim()) return;
    try {
      if (editingId) {
        await supabase.from("chores").update({ label:form.label.trim(), chore_type:form.type, penalty }).eq("id",editingId);
        setChores(c=>({...c,[activeKid]:c[activeKid].map(x=>x.id===editingId?{...x,label:form.label.trim(),chore_type:form.type,penalty}:x)}));
      } else {
        const { data } = await supabase.from("chores").insert({ kid:activeKid, label:form.label.trim(), chore_type:form.type, penalty }).select().single();
        setChores(c=>({...c,[activeKid]:[...c[activeKid],data]}));
      }
      toast.show(editingId?"Chore updated":"Chore added");
      onDone();
    } catch { toast.show("Failed to save chore","error"); }
  }

  async function deleteChore(id) {
    await supabase.from("chores").delete().eq("id",id);
    setChores(c=>({...c,[activeKid]:c[activeKid].filter(x=>x.id!==id)}));
    toast.show("Chore deleted");
  }

  // ── Settle Up ────────────────────────────────────────────────────────────────
  async function confirmSettleUp(missed) {
    if (!missed.length) return;
    const byKid = {};
    KIDS.forEach(k=>{ byKid[k]=[]; });
    missed.forEach(m=>{ byKid[m.kid].push(m); });
    try {
      const inserts = [];
      KIDS.forEach(kid => {
        const items = byKid[kid];
        if (!items.length) return;
        const total = items.reduce((s,m)=>s+m.penalty,0);
        if (total > 0) {
          inserts.push({ kid, amount:-total, reason:`Missed chores: ${items.map(m=>m.label).join(", ")}`, week_start:weekStart });
        }
      });
      if (inserts.length) {
        const { error } = await supabase.from("transactions").insert(inserts);
        if (error) throw error;
        const now = new Date().toISOString();
        inserts.forEach(ins => {
          setBalances(b=>({...b,[ins.kid]:parseFloat((b[ins.kid]+ins.amount).toFixed(2))}));
          setTransactions(t=>({...t,[ins.kid]:[{ id:Date.now()+Math.random(), ...ins, created_at:now },...t[ins.kid]]}));
        });
      }
      setShowSettleUp(false);
      toast.show("Settle up applied");
    } catch { toast.show("Failed to apply deductions","error"); }
  }

  // ── Allowances ───────────────────────────────────────────────────────────────
  async function saveAllowances() {
    try {
      const upserts = KIDS.map(k=>({ key:`allowance_${k}`, value:String(allowanceEdit[k]) }));
      await supabase.from("settings").upsert(upserts,{ onConflict:"key" });
      const newBalances = { ...allowanceEdit };
      KIDS.forEach(k => { transactions[k].forEach(tx=>{ newBalances[k]=parseFloat((newBalances[k]+tx.amount).toFixed(2)); }); });
      setAllowances({...allowanceEdit});
      setBalances(newBalances);
      setShowAllowances(false);
      toast.show("Allowances updated");
    } catch { toast.show("Failed to save allowances","error"); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background:"#080d12",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui" }}>
      <div style={{ color:"#334155",fontSize:15 }}>Loading…</div>
    </div>
  );

  if (isKidsView) return (
    <KidsView balances={balances} transactions={transactions} allowances={allowances}
      chores={chores} completions={completions} weekStart={weekStart} onToggleChore={toggleChore}/>
  );

  const t = THEME[activeKid];
  const balance = balances[activeKid];
  const txList = transactions[activeKid];
  const kidPresets = presets[activeKid];
  const allowance = allowances[activeKid];
  const pct = Math.max(0,Math.min(100,(balance/allowance)*100));
  const isNeg = balance < 0;

  return (
    <div style={{ background:"#080d12",minHeight:"100vh",fontFamily:"'Inter', system-ui, sans-serif",paddingBottom:48 }}>
      {toast.ToastEl}
      {pin.Modal}

      {/* Header */}
      <div style={{ background:"#0c1117",borderBottom:"1px solid #1e293b",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50 }}>
        <div>
          <div style={{ fontSize:11,color:"#475569",letterSpacing:"0.12em",textTransform:"uppercase" }}>☀️ Summer Ledger</div>
          <div style={{ fontSize:15,fontWeight:700,color:"#f1f5f9",marginTop:1 }}>
            Week of {new Date(weekStart+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          </div>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={()=>pin.require(()=>setShowSettleUp(true))}
            style={{ background:"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:"#64748b",cursor:"pointer",fontWeight:600 }}>
            🧹 Settle Up
          </button>
          <button onClick={()=>pin.require(()=>setShowAllowances(a=>!a))}
            style={{ background:showAllowances?"#1e3a5f":"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:showAllowances?"#93c5fd":"#64748b",cursor:"pointer",fontWeight:600 }}>
            💰
          </button>
          <button onClick={()=>pin.unlocked?pin.setUnlocked(false):pin.require(()=>{})}
            style={{ background:pin.unlocked?"#14532d":"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:pin.unlocked?"#86efac":"#64748b",cursor:"pointer",fontWeight:600 }}>
            {pin.unlocked?"🔓":"🔒"}
          </button>
        </div>
      </div>

      {/* Allowances editor */}
      {showAllowances && (
        <div style={{ margin:"12px 16px 0",background:"#0c1a2e",border:"1px solid #1e3a5f",borderRadius:16,padding:16 }}>
          <div style={{ fontSize:13,fontWeight:600,color:"#93c5fd",marginBottom:12 }}>Weekly starting allowances</div>
          {KIDS.map(k=>(
            <div key={k} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
              <span style={{ fontSize:18 }}>{THEME[k].emoji}</span>
              <span style={{ color:"#e2e8f0",fontSize:14,width:52 }}>{k}</span>
              <div style={{ display:"flex",alignItems:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"2px 10px",flex:1 }}>
                <span style={{ color:"#475569",fontSize:15 }}>$</span>
                <input type="number" inputMode="decimal" value={allowanceEdit[k]}
                  onChange={e=>setAllowanceEdit(a=>({...a,[k]:parseFloat(e.target.value)||0}))}
                  style={{ background:"none",border:"none",color:"#f1f5f9",fontSize:16,fontWeight:700,outline:"none",width:"100%",padding:"8px 4px" }}/>
              </div>
            </div>
          ))}
          <div style={{ display:"flex",gap:8,marginTop:4 }}>
            <button onClick={()=>setShowAllowances(false)} style={{ flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"10px 0",color:"#64748b",fontSize:13,cursor:"pointer" }}>Cancel</button>
            <button onClick={saveAllowances} style={{ flex:2,background:"#3b82f6",border:"none",borderRadius:8,padding:"10px 0",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Save</button>
          </div>
        </div>
      )}

      {/* Kid tabs */}
      <div style={{ display:"flex",background:"#0c1117",borderBottom:"1px solid #1e293b" }}>
        {KIDS.map(k=>(
          <button key={k} onClick={()=>{setActiveKid(k);setActiveTab("balance");setShowAllowances(false);}}
            style={{ flex:1,border:"none",background:"none",padding:"13px 0",cursor:"pointer",borderBottom:activeKid===k?`2px solid ${THEME[k].accent}`:"2px solid transparent",color:activeKid===k?THEME[k].accent:"#475569",fontWeight:activeKid===k?700:400,fontSize:14,transition:"all 0.15s" }}>
            {THEME[k].emoji} {k}
          </button>
        ))}
      </div>

      {/* Balance card */}
      <div style={{ background:t.card,margin:16,borderRadius:20,padding:22,border:`1px solid ${t.accent}20` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12,color:t.text,opacity:0.6,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em" }}>Balance</div>
            <div style={{ fontSize:42,fontWeight:800,color:isNeg?"#f87171":t.accent,letterSpacing:"-2px",lineHeight:1 }}>{fmtBal(balance)}</div>
            <div style={{ fontSize:12,color:t.text,opacity:0.5,marginTop:4 }}>of ${allowance.toFixed(2)} this week</div>
          </div>
          <div style={{ fontSize:11,color:t.text,opacity:0.5 }}>{txList.length} transaction{txList.length!==1?"s":""}</div>
        </div>
        <div style={{ background:"#ffffff12",borderRadius:99,height:5,marginBottom:18 }}>
          <div style={{ background:isNeg?"#f87171":t.accent,width:`${pct}%`,height:"100%",borderRadius:99,transition:"width 0.5s ease" }}/>
        </div>
        {/* Action row */}
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>openTxModal()}
            style={{ flex:1,background:pin.unlocked?t.accent:t.muted,color:pin.unlocked?"#080d12":t.text,border:"none",borderRadius:12,padding:"12px 0",fontWeight:700,fontSize:14,cursor:"pointer",opacity:pin.unlocked?1:0.6 }}>
            {pin.unlocked?"+ / − Add":"🔒 Unlock"}
          </button>
          {["history","presets","chores"].map(tb=>(
            <button key={tb} onClick={()=>setActiveTab(activeTab===tb?"balance":tb)}
              style={{ background:activeTab===tb?t.muted:"#ffffff08",color:t.text,border:"none",borderRadius:12,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:activeTab===tb?600:400,textTransform:"capitalize" }}>
              {tb}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-add preset chips */}
      {activeTab==="balance" && (kidPresets.length>0 || transferPresets.length>0) && (
        <div style={{ paddingInline:16,marginBottom:4 }}>
          <div style={{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Quick add</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
            {kidPresets.map(p=>(
              <button key={p.id} onClick={()=>openTxModal(p)}
                style={{ background:p.type==="deduct"?"#3f0a0a":"#0a2e18",border:`1px solid ${p.type==="deduct"?"#f8717140":"#4ade8040"}`,color:p.type==="deduct"?"#fca5a5":"#86efac",borderRadius:99,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:500 }}>
                {p.type==="deduct"?"−":"+"} {p.label} · ${Math.abs(p.amount).toFixed(2)}
              </button>
            ))}
            {transferPresets.filter(tp=>tp.from_kid===activeKid||tp.to_kid===activeKid).map(tp=>(
              <button key={tp.id} onClick={()=>openTxModal(null,tp)}
                style={{ background:"#1e1b4b",border:"1px solid #7c6ff740",color:"#c4bfff",borderRadius:99,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:500 }}>
                ⇄ {tp.from_kid}→{tp.to_kid} · ${tp.amount.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History panel */}
      {activeTab==="history" && (
        <div style={{ marginInline:16,background:t.card,borderRadius:16,padding:16,border:`1px solid ${t.accent}15` }}>
          <div style={{ fontSize:13,fontWeight:600,color:t.text,marginBottom:12 }}>This week's history</div>
          {txList.length===0 && <div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0" }}>No transactions yet</div>}
          {txList.map(tx=>(
            <div key={tx.id} style={{ background:"#ffffff08",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
              <div>
                <div style={{ color:"#e2e8f0",fontSize:13,fontWeight:500 }}>{tx.reason}</div>
                <div style={{ color:"#475569",fontSize:11,marginTop:2 }}>{fmtTime(tx.created_at)}</div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontWeight:700,fontSize:14,color:tx.amount<0?"#f87171":"#4ade80" }}>{fmt(tx.amount)}</span>
                {pin.unlocked && (
                  <button onClick={()=>deleteTx(tx.id)} style={{ background:"none",border:"none",color:"#334155",fontSize:15,cursor:"pointer",padding:"0 2px" }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Presets panel */}
      {activeTab==="presets" && (
        <div style={{ marginInline:16,background:t.card,borderRadius:16,padding:16,border:`1px solid ${t.accent}15` }}>
          <div style={{ fontSize:13,fontWeight:600,color:t.text,marginBottom:12 }}>{activeKid}'s presets</div>
          {kidPresets.length===0&&<div style={{ color:"#475569",fontSize:13,marginBottom:14 }}>No presets yet.</div>}
          {kidPresets.map(p=>(
            <div key={p.id} style={{ background:"#ffffff08",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
              <div>
                <span style={{ color:p.type==="deduct"?"#f87171":"#4ade80",fontWeight:700,marginRight:6 }}>{p.type==="deduct"?"−":"+"}</span>
                <span style={{ color:"#e2e8f0",fontSize:13 }}>{p.label}</span>
                <span style={{ color:"#64748b",fontSize:13 }}> · ${Math.abs(p.amount).toFixed(2)}</span>
              </div>
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={()=>{setEditingPreset(p.id);setPresetForm({label:p.label,amount:String(Math.abs(p.amount)),type:p.type});}} style={{ background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer" }}>Edit</button>
                <button onClick={()=>deletePreset(p.id)} style={{ background:"none",border:"none",color:"#475569",fontSize:15,cursor:"pointer" }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ borderTop:"1px solid #1e293b",paddingTop:14,marginTop:8 }}>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:10,fontWeight:600 }}>{editingPreset?"Edit preset":"New preset"}</div>
            <div style={{ display:"flex",background:"#0f172a",borderRadius:8,padding:2,marginBottom:10 }}>
              {["deduct","bonus"].map(tp=>(
                <button key={tp} onClick={()=>setPresetForm(f=>({...f,type:tp}))}
                  style={{ flex:1,border:"none",borderRadius:6,padding:"8px 0",fontSize:13,cursor:"pointer",fontWeight:600,background:presetForm.type===tp?(tp==="deduct"?"#f87171":"#4ade80"):"transparent",color:presetForm.type===tp?"#080d12":"#475569" }}>
                  {tp==="deduct"?"− Deduction":"+ Bonus"}
                </button>
              ))}
            </div>
            <input value={presetForm.label} onChange={e=>setPresetForm(f=>({...f,label:e.target.value}))} placeholder="Label"
              style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box",marginBottom:8 }}/>
            <input value={presetForm.amount} onChange={e=>setPresetForm(f=>({...f,amount:e.target.value}))} type="number" inputMode="decimal" placeholder="Amount"
              style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box",marginBottom:10 }}/>
            <div style={{ display:"flex",gap:8 }}>
              {editingPreset&&<button onClick={()=>{setEditingPreset(null);setPresetForm({label:"",amount:"",type:"deduct"});}} style={{ flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"10px 0",color:"#64748b",fontSize:13,cursor:"pointer" }}>Cancel</button>}
              <button onClick={savePreset} disabled={!presetForm.label.trim()||!presetForm.amount||parseFloat(presetForm.amount)<=0}
                style={{ flex:2,background:t.accent,border:"none",borderRadius:8,padding:"10px 0",color:"#080d12",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!presetForm.label.trim()||!presetForm.amount||parseFloat(presetForm.amount)<=0)?0.4:1 }}>
                {editingPreset?"Save changes":"Add preset"}
              </button>
            </div>
          </div>

          {/* Transfer presets section */}
          <div style={{ borderTop:"1px solid #1e293b",paddingTop:14,marginTop:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontSize:12,color:"#a78bfa",fontWeight:600 }}>⇄ Transfer Presets</div>
              <button onClick={()=>setShowTransferPresets(s=>!s)} style={{ background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer" }}>
                {showTransferPresets?"Hide":"Manage"}
              </button>
            </div>
            {showTransferPresets && (
              <>
                {transferPresets.map(tp=>(
                  <div key={tp.id} style={{ background:"#ffffff08",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                    <div>
                      <span style={{ color:"#a78bfa",fontWeight:700,fontSize:13 }}>{tp.from_kid}→{tp.to_kid}</span>
                      <span style={{ color:"#e2e8f0",fontSize:13 }}> {tp.reason}</span>
                      <span style={{ color:"#64748b",fontSize:13 }}> · ${tp.amount.toFixed(2)}</span>
                    </div>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>{setEditingTp(tp.id);setTpForm({from_kid:tp.from_kid,to_kid:tp.to_kid,amount:String(tp.amount),reason:tp.reason});}} style={{ background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer" }}>Edit</button>
                      <button onClick={()=>deleteTp(tp.id)} style={{ background:"none",border:"none",color:"#475569",fontSize:15,cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                    {["from_kid","to_kid"].map(field=>(
                      <div key={field} style={{ flex:1 }}>
                        <div style={{ fontSize:11,color:"#64748b",marginBottom:4 }}>{field==="from_kid"?"From":"To"}</div>
                        <select value={tpForm[field]} onChange={e=>setTpForm(f=>({...f,[field]:e.target.value}))}
                          style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"9px 10px",fontSize:13,color:"#f1f5f9",outline:"none" }}>
                          {KIDS.map(k=><option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <input value={tpForm.reason} onChange={e=>setTpForm(f=>({...f,reason:e.target.value}))} placeholder="Reason (e.g. Hit sibling)"
                    style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box",marginBottom:8 }}/>
                  <input value={tpForm.amount} onChange={e=>setTpForm(f=>({...f,amount:e.target.value}))} type="number" inputMode="decimal" placeholder="Amount"
                    style={{ width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box",marginBottom:10 }}/>
                  <div style={{ display:"flex",gap:8 }}>
                    {editingTp&&<button onClick={()=>{setEditingTp(null);setTpForm({from_kid:"Noah",to_kid:"Jonah",amount:"",reason:""});}} style={{ flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"10px 0",color:"#64748b",fontSize:13,cursor:"pointer" }}>Cancel</button>}
                    <button onClick={saveTp} disabled={!tpForm.reason.trim()||!tpForm.amount||parseFloat(tpForm.amount)<=0||tpForm.from_kid===tpForm.to_kid}
                      style={{ flex:2,background:"#7c6ff7",border:"none",borderRadius:8,padding:"10px 0",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!tpForm.reason.trim()||!tpForm.amount||parseFloat(tpForm.amount)<=0||tpForm.from_kid===tpForm.to_kid)?0.4:1 }}>
                      {editingTp?"Save changes":"Add transfer preset"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chores panel */}
      {activeTab==="chores" && (
        <ChoresPanel kid={activeKid} chores={chores} completions={completions} weekStart={weekStart}
          pin={pin} onToggle={toggleChore} onSave={saveChore} onDelete={deleteChore}/>
      )}

      {/* Settle Up modal */}
      {showSettleUp && (
        <SettleUpModal chores={chores} completions={completions} weekStart={weekStart}
          balances={balances} allowances={allowances}
          onConfirm={confirmSettleUp} onClose={()=>setShowSettleUp(false)}/>
      )}

      {/* Transaction modal */}
      {txModal && (
        <div style={{ position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200 }}
          onClick={()=>setTxModal(false)}>
          <div style={{ background:"#1e293b",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:480 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div style={{ color:"#f1f5f9",fontWeight:700,fontSize:18 }}>{THEME[activeKid].emoji} {activeKid}</div>
              <button onClick={()=>setTxModal(false)} style={{ background:"none",border:"none",color:"#475569",fontSize:22,cursor:"pointer" }}>✕</button>
            </div>
            {/* Type toggle */}
            <div style={{ display:"flex",background:"#0f172a",borderRadius:10,padding:3,marginBottom:16 }}>
              {[["deduct","− Deduct"],["bonus","+ Bonus"],["transfer","⇄ Transfer"]].map(([tp,label])=>(
                <button key={tp} onClick={()=>{setTxType(tp);if(tp==="transfer"&&!txToKid)setTxToKid(KIDS.filter(k=>k!==activeKid)[0]);}}
                  style={{ flex:1,border:"none",borderRadius:8,padding:"10px 0",fontWeight:600,fontSize:12,cursor:"pointer",
                    background:txType===tp?(tp==="deduct"?"#f87171":tp==="bonus"?"#4ade80":"#7c6ff7"):"transparent",
                    color:txType===tp?"#0f172a":"#64748b" }}>
                  {label}
                </button>
              ))}
            </div>
            {/* Transfer: to kid picker */}
            {txType==="transfer" && (
              <div style={{ marginBottom:12 }}>
                <div style={{ color:"#64748b",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>To</div>
                <div style={{ display:"flex",gap:8 }}>
                  {KIDS.filter(k=>k!==activeKid).map(k=>(
                    <button key={k} onClick={()=>setTxToKid(k)}
                      style={{ flex:1,border:`2px solid ${txToKid===k?THEME[k].accent:"#334155"}`,borderRadius:10,padding:"10px 0",background:txToKid===k?THEME[k].card:"transparent",cursor:"pointer",color:txToKid===k?THEME[k].accent:"#475569",fontWeight:txToKid===k?700:400,fontSize:14 }}>
                      {THEME[k].emoji} {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <div style={{ color:"#64748b",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Amount</div>
              <input type="number" inputMode="decimal" value={txAmount} onChange={e=>setTxAmount(e.target.value)} placeholder="0.00" autoFocus
                style={{ width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:"12px 14px",fontSize:20,color:"#f1f5f9",outline:"none",boxSizing:"border-box" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ color:"#64748b",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Reason</div>
              <input type="text" value={txReason} onChange={e=>setTxReason(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitTx()} placeholder="What happened?"
                style={{ width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:"12px 14px",fontSize:15,color:"#f1f5f9",outline:"none",boxSizing:"border-box" }}/>
            </div>
            <button onClick={submitTx}
              disabled={!txAmount||parseFloat(txAmount)<=0||!txReason.trim()||(txType==="transfer"&&!txToKid)}
              style={{ width:"100%",background:txType==="deduct"?"#f87171":txType==="bonus"?"#4ade80":"#7c6ff7",border:"none",borderRadius:12,padding:"14px 0",fontWeight:800,fontSize:16,color:"#0f172a",cursor:"pointer",
                opacity:(!txAmount||parseFloat(txAmount)<=0||!txReason.trim()||(txType==="transfer"&&!txToKid))?0.4:1 }}>
              {txType==="transfer"?`⇄ Transfer $${parseFloat(txAmount||0).toFixed(2)} to ${txToKid}`:txType==="deduct"?`− Deduct $${parseFloat(txAmount||0).toFixed(2)}`:`+ Add $${parseFloat(txAmount||0).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
