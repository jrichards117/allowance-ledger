import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIDS = ["Noah", "Jonah", "Leah"];
const DEFAULT_ALLOWANCE = { Noah: 40, Jonah: 40, Leah: 40 };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const THEME = {
  Noah:  { card: "#0d1424", accent: "#60a5fa", muted: "#152040", text: "#bfdbfe", emoji: "🚴" },
  Jonah: { card: "#0d2410", accent: "#4ade80", muted: "#163d1e", text: "#a7f3c0", emoji: "🥋" },
  Leah:  { card: "#2a1022", accent: "#f472b6", muted: "#3d1530", text: "#fbb8d8", emoji: "🌸" },
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(now); m.setDate(diff); m.setHours(0,0,0,0);
  return m.toISOString().split("T")[0];
}
function getTodayDow() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; }
function fmt(n) { return (n < 0 ? "−" : "+") + "$" + Math.abs(n).toFixed(2); }
function fmtBal(n) { return (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2); }
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}

function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),2800); }
  const El = toast ? (
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#7f1d1d":"#14532d",color:toast.type==="error"?"#fca5a5":"#86efac",padding:"10px 20px",borderRadius:99,fontSize:13,fontWeight:600,zIndex:999,whiteSpace:"nowrap",boxShadow:"0 4px 20px #00000060",maxWidth:"90vw",textAlign:"center"}}>
      {toast.msg}
    </div>
  ) : null;
  return { show, El };
}

const inp = { width:"100%", background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:"10px 12px", fontSize:14, color:"#f1f5f9", outline:"none", boxSizing:"border-box" };

// ── Chore row (reused in parent + kids views) ─────────────────────────────────
function ChoreRow({ chore, completions, weekStart, accent, onToggle, onEdit, onDelete, showManage }) {
  const isWeekly = chore.chore_type === "weekly";
  const isTally  = chore.chore_type === "tally";
  const todayDow = getTodayDow();
  const wDone      = completions[`${chore.id}-${weekStart}-w`];
  const tallyCount = completions[`${chore.id}-${weekStart}-tally`] || 0;
  const tallyTarget = chore.weekly_target || null;
  const tallyHit = tallyTarget ? tallyCount >= tallyTarget : false;
  const tallyColor = tallyTarget ? (tallyHit ? "#4ade80" : tallyCount > 0 ? "#fbbf24" : "#475569") : accent;
  const typeLabel = isWeekly ? "weekly" : isTally ? "as needed" : "daily";

  return (
    <div style={{background:"#ffffff08",borderRadius:10,padding:10,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isWeekly||isTally?0:8}}>
        <div style={{flex:1,minWidth:0}}>
          <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{chore.label}</span>
          <span style={{color:"#475569",fontSize:11,marginLeft:6}}>
            {typeLabel}{chore.penalty>0?` · $${Number(chore.penalty).toFixed(2)} penalty`:""}
            {isTally&&tallyTarget?` · target: ${tallyTarget}x`:""}
          </span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8}}>
          {isWeekly && (
            <button onClick={()=>onToggle(chore,null,!wDone)}
              style={{width:28,height:28,borderRadius:7,border:`2px solid ${wDone?accent:"#334155"}`,background:wDone?accent:"transparent",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",color:wDone?"#080d12":"transparent"}}>
              ✓
            </button>
          )}
          {isTally && (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <button onClick={()=>onToggle(chore,"tally-dec",tallyCount)}
                style={{width:26,height:26,borderRadius:6,border:"1px solid #334155",background:"#ffffff08",cursor:"pointer",color:"#94a3b8",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                −
              </button>
              <span style={{color:tallyColor,fontWeight:700,fontSize:15,minWidth:20,textAlign:"center"}}>{tallyCount}</span>
              <button onClick={()=>onToggle(chore,"tally-inc",tallyCount)}
                style={{width:26,height:26,borderRadius:6,border:`1px solid ${accent}60`,background:accent+"18",cursor:"pointer",color:accent,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                +
              </button>
              {tallyTarget&&<span style={{color:tallyColor,fontSize:10,marginLeft:2}}>{tallyHit?"✓":""}/{tallyTarget}</span>}
            </div>
          )}
          {showManage && <>
            <button onClick={()=>onEdit(chore)} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",padding:"2px 4px"}}>Edit</button>
            <button onClick={()=>onDelete(chore.id)} style={{background:"none",border:"none",color:"#475569",fontSize:15,cursor:"pointer",padding:"2px 4px"}}>✕</button>
          </>}
        </div>
      </div>
      {!isWeekly && !isTally && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {DAYS.map((day,dow) => {
            const done = completions[`${chore.id}-${weekStart}-${dow}`];
            const isToday = dow===todayDow;
            return (
              <button key={dow} onClick={()=>onToggle(chore,dow,!done)}
                style={{padding:"5px 0",borderRadius:5,border:`1.5px solid ${done?accent:isToday?accent+"60":"#334155"}`,background:done?accent:"transparent",cursor:"pointer",fontSize:9,color:done?"#080d12":isToday?"#e2e8f0":"#475569",fontWeight:done||isToday?700:400,textAlign:"center"}}>
                {day}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chore add/edit form ───────────────────────────────────────────────────────
function ChoreForm({ accent, isShared, editingId, initial, onSave, onCancel }) {
  const blank = { label:"", type:"weekly", penalty:"", target:"" };
  const [form, setForm] = useState(initial || blank);
  useEffect(()=>{ if(initial) setForm(initial); },[JSON.stringify(initial)]);
  return (
    <div style={{borderTop:"1px solid #1e293b",paddingTop:12,marginTop:4}}>
      <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>{editingId?"Edit":"New"} {isShared?"shared ":""}chore</div>
      <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="Chore label" style={{...inp,marginBottom:8}}/>
      <div style={{display:"flex",background:"#0f172a",borderRadius:8,padding:2,marginBottom:8}}>
        {["weekly","daily","tally"].map(tp=>(
          <button key={tp} onClick={()=>setForm(f=>({...f,type:tp}))}
            style={{flex:1,border:"none",borderRadius:6,padding:"8px 0",fontSize:11,cursor:"pointer",fontWeight:600,background:form.type===tp?accent:"transparent",color:form.type===tp?"#080d12":"#475569"}}>
            {tp==="tally"?"As Needed":tp[0].toUpperCase()+tp.slice(1)}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {!isShared && (
          <div style={{display:"flex",alignItems:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"0 10px",flex:1}}>
            <span style={{color:"#475569",fontSize:13,marginRight:2}}>$</span>
            <input type="number" inputMode="decimal" value={form.penalty} onChange={e=>setForm(f=>({...f,penalty:e.target.value}))} placeholder="Penalty"
              style={{background:"none",border:"none",color:"#f1f5f9",fontSize:14,outline:"none",width:"100%",padding:"10px 0"}}/>
          </div>
        )}
        {form.type==="tally" && (
          <div style={{display:"flex",alignItems:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"0 10px",flex:1}}>
            <span style={{color:"#475569",fontSize:11,marginRight:4,whiteSpace:"nowrap"}}>Target/wk</span>
            <input type="number" inputMode="numeric" value={form.target||""} onChange={e=>setForm(f=>({...f,target:e.target.value}))} placeholder="Optional"
              style={{background:"none",border:"none",color:"#f1f5f9",fontSize:14,outline:"none",width:"100%",padding:"10px 0"}}/>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8}}>
        {editingId && <button onClick={onCancel} style={{flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"10px 0",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancel</button>}
        <button onClick={()=>onSave(form,editingId,()=>setForm(blank))} disabled={!form.label.trim()}
          style={{flex:2,background:accent,border:"none",borderRadius:8,padding:"10px 0",color:"#080d12",fontSize:13,fontWeight:700,cursor:"pointer",opacity:!form.label.trim()?0.4:1}}>
          {editingId?"Save changes":"Add chore"}
        </button>
      </div>
    </div>
  );
}

// ── Chores Panel (parent view) ────────────────────────────────────────────────
function ChoresPanel({ kid, chores, sharedChores, completions, weekStart, onToggle, onSave, onDelete, onSaveShared, onDeleteShared }) {
  const t = THEME[kid];
  const [editing, setEditing] = useState(null);
  const [editingShared, setEditingShared] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showSharedForm, setShowSharedForm] = useState(false);
  const kidChores = chores[kid] || [];

  function startEdit(c) { setEditing(c.id); setEditingShared(null); setEditForm({label:c.label,type:c.chore_type,penalty:String(c.penalty)}); }
  function startEditShared(c) { setEditingShared(c.id); setEditing(null); setEditForm({label:c.label,type:c.chore_type,penalty:"0"}); setShowSharedForm(true); }
  function clearEdit() { setEditing(null); setEditingShared(null); setEditForm(null); }

  return (
    <div style={{margin:"0 12px",background:t.card,borderRadius:16,padding:14,border:`1px solid ${t.accent}15`}}>

      {/* Kid's own chores */}
      <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:10}}>{kid}'s chores</div>
      {kidChores.length===0 && !editing && <div style={{color:"#475569",fontSize:13,marginBottom:10}}>No chores yet.</div>}
      {kidChores.map(c=>(
        <ChoreRow key={c.id} chore={c} completions={completions} weekStart={weekStart} accent={t.accent}
          onToggle={onToggle} onEdit={startEdit} onDelete={onDelete} showManage={true}/>
      ))}
      <ChoreForm accent={t.accent} isShared={false} editingId={editing} initial={editing?editForm:null}
        onSave={(form,id,reset)=>{ onSave(form,id,()=>{clearEdit();reset();}); }} onCancel={clearEdit}/>

      {/* Shared chores */}
      <div style={{borderTop:"1px solid #1e293b",marginTop:14,paddingTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fbbf24"}}>🏠 Shared chores</div>
          <button onClick={()=>{setShowSharedForm(s=>!s);setEditingShared(null);setEditForm(null);}}
            style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>
            {showSharedForm&&!editingShared?"Hide":"+ Add"}
          </button>
        </div>
        {sharedChores.length===0&&!showSharedForm&&<div style={{color:"#475569",fontSize:13}}>No shared chores yet.</div>}
        {sharedChores.map(c=>(
          <ChoreRow key={c.id} chore={c} completions={completions} weekStart={weekStart} accent="#fbbf24"
            onToggle={onToggle} onEdit={startEditShared} onDelete={onDeleteShared} showManage={true}/>
        ))}
        {showSharedForm && (
          <ChoreForm accent="#fbbf24" isShared={true} editingId={editingShared} initial={editingShared?editForm:null}
            onSave={(form,id,reset)=>{ onSaveShared(form,id,()=>{setShowSharedForm(false);setEditingShared(null);setEditForm(null);reset();}); }}
            onCancel={()=>{setShowSharedForm(false);setEditingShared(null);setEditForm(null);}}/>
        )}
      </div>
    </div>
  );
}

// ── Settle Up Modal ───────────────────────────────────────────────────────────
function SettleUpModal({ chores, sharedChores, completions, weekStart, onConfirm, onClose }) {
  // Per-kid missed
  const missed = [];
  KIDS.forEach(kid => {
    (chores[kid]||[]).forEach(c => {
      if (c.chore_type==="weekly") {
        if (!completions[`${c.id}-${weekStart}-w`]) missed.push({kid,chore:c,label:c.label,penalty:c.penalty});
      } else {
        DAYS.forEach((day,dow)=>{
          if (!completions[`${c.id}-${weekStart}-${dow}`]) missed.push({kid,chore:c,label:`${c.label} (${day})`,penalty:c.penalty,day:dow});
        });
      }
    });
  });

  // Shared missed
  const sharedMissed = [];
  sharedChores.forEach(c => {
    if (c.chore_type==="weekly") {
      if (!completions[`${c.id}-${weekStart}-w`]) sharedMissed.push({chore:c,label:c.label});
    } else {
      DAYS.forEach((day,dow)=>{
        if (!completions[`${c.id}-${weekStart}-${dow}`]) sharedMissed.push({chore:c,label:`${c.label} (${day})`,day:dow});
      });
    }
  });

  const [selected, setSelected] = useState(()=>{ const s={}; missed.forEach((_,i)=>{s[i]=missed[i].penalty>0;}); return s; });
  const selectedTotal = missed.reduce((s,_,i)=>s+(selected[i]?missed[i].penalty:0),0);

  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:250}} onClick={onClose}>
      <div style={{background:"#1e293b",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:17}}>🧹 Settle Up</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {missed.length===0&&sharedMissed.length===0 && (
          <div style={{color:"#4ade80",fontSize:14,textAlign:"center",padding:"20px 0"}}>✓ All chores completed this week!</div>
        )}

        {/* Per-kid missed */}
        {missed.length>0 && (
          <>
            <div style={{color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Individual missed chores</div>
            {KIDS.map(kid=>{
              const items=missed.filter(m=>m.kid===kid);
              if (!items.length) return null;
              const t=THEME[kid];
              return (
                <div key={kid} style={{marginBottom:12}}>
                  <div style={{color:t.accent,fontWeight:700,fontSize:13,marginBottom:6}}>{t.emoji} {kid}</div>
                  {items.map(m=>{
                    const gi=missed.indexOf(m);
                    return (
                      <div key={gi} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#ffffff08",borderRadius:8,padding:"9px 12px",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                          <input type="checkbox" checked={!!selected[gi]} onChange={e=>setSelected(s=>({...s,[gi]:e.target.checked}))} style={{width:16,height:16,accentColor:t.accent,cursor:"pointer",flexShrink:0}}/>
                          <span style={{color:"#e2e8f0",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</span>
                        </div>
                        <span style={{color:"#f87171",fontSize:13,fontWeight:600,flexShrink:0,marginLeft:8}}>−${m.penalty.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,paddingTop:4,borderTop:"1px solid #1e293b"}}>
              <span style={{color:"#94a3b8",fontSize:14}}>Total deductions</span>
              <span style={{color:"#f87171",fontWeight:700,fontSize:16}}>−${selectedTotal.toFixed(2)}</span>
            </div>
            <button onClick={()=>onConfirm(missed.filter((_,i)=>selected[i]))} disabled={selectedTotal===0}
              style={{width:"100%",background:"#f87171",border:"none",borderRadius:12,padding:"13px 0",fontWeight:800,fontSize:15,color:"#080d12",cursor:"pointer",opacity:selectedTotal===0?0.4:1,marginBottom:sharedMissed.length>0?14:0}}>
              Apply deductions
            </button>
          </>
        )}

        {/* Shared missed — reminder only */}
        {sharedMissed.length>0 && (
          <div style={{background:"#1a1400",border:"1px solid #fbbf2440",borderRadius:12,padding:12}}>
            <div style={{color:"#fbbf24",fontWeight:700,fontSize:13,marginBottom:8}}>🏠 Shared chores not completed</div>
            <div style={{color:"#64748b",fontSize:12,marginBottom:10}}>No automatic penalty — just a heads up.</div>
            {sharedMissed.map((m,i)=>(
              <div key={i} style={{color:"#e2e8f0",fontSize:13,padding:"6px 0",borderBottom:i<sharedMissed.length-1?"1px solid #ffffff10":"none"}}>
                {m.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared chores block (reused in kids view) ─────────────────────────────────
function SharedChoresBlock({ sharedChores, completions, weekStart, onToggle }) {
  const todayDow = getTodayDow();
  if (sharedChores.length===0) return null;
  return (
    <div style={{margin:"10px 12px 0",background:"#1a1400",borderRadius:14,padding:14,border:"1px solid #fbbf2430"}}>
      <div style={{fontSize:13,fontWeight:600,color:"#fbbf24",marginBottom:10}}>🏠 Shared chores</div>
      {sharedChores.map(c=>{
        const isWeekly = c.chore_type==="weekly";
        const wDone = completions[`${c.id}-${weekStart}-w`];
        return (
          <div key={c.id} style={{background:"#ffffff08",borderRadius:10,padding:10,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isWeekly?0:8}}>
              <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{c.label}</span>
              {isWeekly && (
                <button onClick={()=>onToggle(c,null,!wDone)}
                  style={{width:28,height:28,borderRadius:7,border:`2px solid ${wDone?"#fbbf24":"#334155"}`,background:wDone?"#fbbf24":"transparent",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",color:wDone?"#080d12":"transparent"}}>
                  ✓
                </button>
              )}
            </div>
            {!isWeekly && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {DAYS.map((day,dow)=>{
                  const done = completions[`${c.id}-${weekStart}-${dow}`];
                  const isToday = dow===todayDow;
                  return (
                    <button key={dow} onClick={()=>onToggle(c,dow,!done)}
                      style={{padding:"5px 0",borderRadius:5,border:`1.5px solid ${done?"#fbbf24":isToday?"#fbbf2460":"#334155"}`,background:done?"#fbbf24":"transparent",cursor:"pointer",fontSize:9,color:done?"#080d12":isToday?"#fde68a":"#475569",fontWeight:done||isToday?700:400,textAlign:"center"}}>
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
  );
}

// ── Kids View ─────────────────────────────────────────────────────────────────
function KidsView({ balances, transactions, allowances, chores, sharedChores, completions, weekStart, onToggleChore, presets, bonusRequests, onRequestBonus, streaks }) {
  const [activeKid, setActiveKid] = useState("Noah");
  const [tab, setTab] = useState("balance");
  const t = THEME[activeKid];
  const balance = balances[activeKid];
  const txList = transactions[activeKid];
  const allowance = allowances[activeKid]||DEFAULT_ALLOWANCE[activeKid];
  const pct = Math.max(0,Math.min(100,(balance/allowance)*100));
  const isNeg = balance<0;
  const kidChores = chores[activeKid]||[];

  return (
    <div style={{background:"#080d12",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:48,maxWidth:"100vw",overflowX:"hidden"}}>
      <div style={{background:"#0c1117",borderBottom:"1px solid #1e293b",padding:"14px 16px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"#475569",letterSpacing:"0.1em",textTransform:"uppercase"}}>☀️ Summer Ledger</div>
        <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",marginTop:1}}>
          Week of {new Date(weekStart+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:"12px 12px 0"}}>
        {KIDS.map(k=>{
          const bal=balances[k]; const th=THEME[k];
          return (
            <button key={k} onClick={()=>{setActiveKid(k);setTab("balance");}}
              style={{background:activeKid===k?th.card:"#0c1117",border:`1px solid ${activeKid===k?th.accent+"60":"#1e293b"}`,borderRadius:12,padding:"10px 4px",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:20}}>{th.emoji}</div>
              <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k}</div>
              <div style={{fontSize:16,fontWeight:800,color:bal<0?"#f87171":th.accent,letterSpacing:"-0.5px",marginTop:2}}>{fmtBal(bal)}</div>
            </button>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",margin:"12px 12px 0",background:"#0c1117",borderRadius:10,padding:3}}>
        {["balance","chores","history","rules"].map(tb=>(
          <button key={tb} onClick={()=>setTab(tb)}
            style={{border:"none",borderRadius:8,padding:"9px 0",fontSize:11,cursor:"pointer",fontWeight:tab===tb?700:400,background:tab===tb?t.card:"transparent",color:tab===tb?t.accent:"#475569"}}>
            {tb[0].toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>
      {tab==="balance" && (
        <div style={{background:t.card,margin:"12px 12px 0",borderRadius:16,padding:18,border:`1px solid ${t.accent}20`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontSize:11,color:t.text,opacity:0.6,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.1em"}}>Balance</div>
              <div style={{fontSize:42,fontWeight:800,color:isNeg?"#f87171":t.accent,letterSpacing:"-2px",lineHeight:1}}>{fmtBal(balance)}</div>
              <div style={{fontSize:11,color:t.text,opacity:0.5,marginTop:3}}>of ${allowance.toFixed(2)} this week</div>
            </div>
            <div>
              <div style={{fontSize:32}}>{t.emoji}</div>
              {(streaks||{})[activeKid]>0&&<div style={{fontSize:12,color:"#fbbf24",fontWeight:700,marginTop:3,textAlign:"right"}}>{"🔥"} {(streaks||{})[activeKid]} wk</div>}
            </div>
          </div>
          <div style={{background:"#ffffff12",borderRadius:99,height:7}}>
            <div style={{background:isNeg?"#f87171":t.accent,width:`${pct}%`,height:"100%",borderRadius:99,transition:"width 0.5s ease"}}/>
          </div>
        </div>
      )}
      {tab==="chores" && (
        <>
          <div style={{margin:"12px 12px 0",background:t.card,borderRadius:14,padding:14,border:`1px solid ${t.accent}15`}}>
            <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:10}}>My chores</div>
            {kidChores.length===0&&<div style={{color:"#475569",fontSize:13}}>No chores assigned yet.</div>}
            {kidChores.map(c=>(
              <ChoreRow key={c.id} chore={c} completions={completions} weekStart={weekStart} accent={t.accent}
                onToggle={onToggleChore} onEdit={()=>{}} onDelete={()=>{}} showManage={false}/>
            ))}
          </div>
          <SharedChoresBlock sharedChores={sharedChores} completions={completions} weekStart={weekStart} onToggle={onToggleChore}/>
        </>
      )}
      {tab==="history" && (
        <div style={{margin:"12px 12px 0",background:t.card,borderRadius:14,padding:14,border:`1px solid ${t.accent}15`}}>
          <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:10}}>This week</div>
          {(bonusRequests[activeKid]||[]).filter(r=>r.status==="pending").map(r=>(
            <div key={r.id} style={{background:"#1a2e1a",border:"1px solid #4ade8030",borderRadius:9,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{flex:1,minWidth:0,marginRight:8}}>
                <div style={{color:"#e2e8f0",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{"\u23F3"} {r.label}</div>
                <div style={{color:"#475569",fontSize:10,marginTop:1}}>Waiting for parent approval</div>
              </div>
              <span style={{fontWeight:700,fontSize:13,color:"#4ade80",flexShrink:0}}>+${r.amount.toFixed(2)}</span>
            </div>
          ))}
          {txList.length===0&&(bonusRequests[activeKid]||[]).filter(r=>r.status==="pending").length===0&&
            <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"14px 0"}}>No transactions yet</div>}
          {txList.map(tx=>(
            <div key={tx.id} style={{background:"#ffffff08",borderRadius:9,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{flex:1,minWidth:0,marginRight:8}}>
                <div style={{color:"#e2e8f0",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.reason}</div>
                {tx.note&&<div style={{color:"#fbbf24",fontSize:11,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.note}</div>}
                <div style={{color:"#475569",fontSize:10,marginTop:1}}>{fmtTime(tx.created_at)}</div>
              </div>
              <span style={{fontWeight:700,fontSize:13,color:tx.amount<0?"#f87171":"#4ade80",flexShrink:0}}>{fmt(tx.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {tab==="rules" && (() => {
        const kidPresets = presets[activeKid] || [];
        const deductions = kidPresets.filter(p=>p.type==="deduct");
        const bonuses    = kidPresets.filter(p=>p.type==="bonus");
        const pendingIds = new Set((bonusRequests[activeKid]||[]).filter(r=>r.status==="pending").map(r=>r.preset_id));
        const DeductRow = ({p}) => (
          <div style={{background:"#ffffff08",borderRadius:9,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#e2e8f0",fontSize:13,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.label}</span>
            <span style={{color:"#f87171",fontWeight:700,fontSize:13,flexShrink:0,marginLeft:8}}>{`−$${Math.abs(p.amount).toFixed(2)}`}</span>
          </div>
        );
        const BonusRow = ({p}) => (
          <div style={{background:"#ffffff08",borderRadius:9,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#e2e8f0",fontSize:13,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.label}</span>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
              <span style={{color:"#4ade80",fontWeight:700,fontSize:13}}>+${p.amount.toFixed(2)}</span>
              {pendingIds.has(p.id)
                ? <span style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>pending</span>
                : <button onClick={()=>onRequestBonus(activeKid,p)}
                    style={{background:"#14532d",border:"1px solid #4ade8040",color:"#86efac",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    Request
                  </button>
              }
            </div>
          </div>
        );
        return (
          <div style={{margin:"12px 12px 0",background:t.card,borderRadius:14,padding:14,border:`1px solid ${t.accent}15`}}>
            <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:12}}>My rules</div>
            {deductions.length===0&&bonuses.length===0&&<div style={{color:"#475569",fontSize:13}}>No rules set yet.</div>}
            {deductions.length>0&&(
              <>
                <div style={{fontSize:10,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:6}}>Penalties</div>
                {deductions.map(p=><DeductRow key={p.id} p={p}/>)}
              </>
            )}
            {bonuses.length>0&&(
              <>
                <div style={{fontSize:10,color:"#4ade80",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:6,marginTop:deductions.length>0?12:0}}>Bonuses</div>
                <div style={{fontSize:11,color:"#475569",marginBottom:8}}>Tap Request and a parent will approve it.</div>
                {bonuses.map(p=><BonusRow key={p.id} p={p}/>)}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const weekStart = getWeekStart();
  const isKidsView = new URLSearchParams(window.location.search).get("view")==="kids";
  const toast = useToast();

  const [balances, setBalances]             = useState({Noah:40,Jonah:40,Leah:40});
  const [transactions, setTransactions]     = useState({Noah:[],Jonah:[],Leah:[]});
  const [presets, setPresets]               = useState({Noah:[],Jonah:[],Leah:[]});
  const [transferPresets, setTransferPresets] = useState([]);
  const [allowances, setAllowances]         = useState({...DEFAULT_ALLOWANCE});
  const [chores, setChores]                 = useState({Noah:[],Jonah:[],Leah:[]});
  const [bonusRequests, setBonusRequests]   = useState({Noah:[],Jonah:[],Leah:[]});
  const [streaks, setStreaks]               = useState({Noah:0,Jonah:0,Leah:0});
  const [sharedChores, setSharedChores]     = useState([]);
  const [completions, setCompletions]       = useState({});
  const [loading, setLoading]               = useState(true);
  const [activeKid, setActiveKid]           = useState("Noah");
  const [activeTab, setActiveTab]           = useState("balance");

  const [txModal, setTxModal]               = useState(false);
  const [txType, setTxType]                 = useState("deduct");
  const [txAmount, setTxAmount]             = useState("");
  const [txReason, setTxReason]             = useState("");
  const [txToKid, setTxToKid]               = useState("");
  const [txNote, setTxNote]                 = useState("");
  const [showAllowances, setShowAllowances] = useState(false);
  const [allowanceEdit, setAllowanceEdit]   = useState({...DEFAULT_ALLOWANCE});
  const [showSettleUp, setShowSettleUp]     = useState(false);
  const [showBonusReview, setShowBonusReview] = useState(false);
  const [presetForm, setPresetForm]         = useState({label:"",amount:"",type:"deduct",toKid:""});
  const [editingPreset, setEditingPreset]   = useState(null);
  const [editingTp, setEditingTp]           = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes,presetRes,tpRes,settingsRes,choresRes,compRes,brRes,streakRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("week_start",weekStart).order("created_at",{ascending:false}),
        supabase.from("presets").select("*").order("label"),
        supabase.from("transfer_presets").select("*").order("reason"),
        supabase.from("settings").select("*"),
        supabase.from("chores").select("*").order("sort_order"),
        supabase.from("chore_completions").select("*").eq("week_start",weekStart),
        supabase.from("bonus_requests").select("*").order("created_at",{ascending:false}),
        supabase.from("streaks").select("*").order("week_start",{ascending:false}),
      ]);
      const newAllowances = {...DEFAULT_ALLOWANCE};
      (settingsRes.data||[]).forEach(s=>{ const k=s.key.replace("allowance_",""); if(KIDS.includes(k)) newAllowances[k]=parseFloat(s.value); });
      const newBalances = {Noah:newAllowances.Noah,Jonah:newAllowances.Jonah,Leah:newAllowances.Leah};
      const newTx = {Noah:[],Jonah:[],Leah:[]};
      (txRes.data||[]).forEach(tx=>{ if(newBalances[tx.kid]!==undefined){ newBalances[tx.kid]=parseFloat((newBalances[tx.kid]+tx.amount).toFixed(2)); newTx[tx.kid].push(tx); }});
      const newPresets={Noah:[],Jonah:[],Leah:[]};
      (presetRes.data||[]).forEach(p=>{ if(newPresets[p.kid]) newPresets[p.kid].push(p); });
      const newChores={Noah:[],Jonah:[],Leah:[]};
      const newShared=[];
      (choresRes.data||[]).forEach(c=>{ if(c.shared) newShared.push(c); else if(c.kid&&newChores[c.kid]) newChores[c.kid].push(c); });
      const newComp={};
      (compRes.data||[]).forEach(c=>{
        if(c.day_of_week===999) newComp[`${c.chore_id}-${c.week_start}-tally`]=c.count||0;
        else newComp[`${c.chore_id}-${c.week_start}-${c.day_of_week??'w'}`]=c.completed;
      });
      const newBr={Noah:[],Jonah:[],Leah:[]};
      (brRes.data||[]).forEach(r=>{ if(newBr[r.kid]) newBr[r.kid].push(r); });
      const newStreaks={Noah:0,Jonah:0,Leah:0};
      const streakData=streakRes.data||[];
      KIDS.forEach(kid=>{
        let count=0;
        const kidWeeks=streakData.filter(s=>s.kid===kid&&s.week_start<weekStart&&s.completed).map(s=>s.week_start).sort().reverse();
        let expected=null;
        for(const ws of kidWeeks){
          if(expected===null){expected=ws;}
          if(ws===expected){count++;const d=new Date(ws+"T12:00:00");d.setDate(d.getDate()-7);expected=d.toISOString().split("T")[0];}
          else break;
        }
        newStreaks[kid]=count;
      });
      setAllowances(newAllowances); setAllowanceEdit(newAllowances);
      setBalances(newBalances); setTransactions(newTx); setPresets(newPresets);
      setTransferPresets(tpRes.data||[]); setChores(newChores); setSharedChores(newShared); setCompletions(newComp);
      setBonusRequests(newBr); setStreaks(newStreaks);
    } catch(e) { toast.show("Failed to load data","error"); }
    setLoading(false);
  },[weekStart]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(()=>{
    // Transactions: update balances + tx list live
    const txSub = supabase.channel("rt-transactions")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"transactions"},(payload)=>{
        const tx = payload.new;
        if (!KIDS.includes(tx.kid)||tx.week_start!==weekStart) return;
        setTransactions(t=>({...t,[tx.kid]:[tx,...t[tx.kid].filter(x=>x.id!==tx.id)]}));
        setBalances(b=>({...b,[tx.kid]:parseFloat((b[tx.kid]+tx.amount).toFixed(2))}));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"transactions"},(payload)=>{
        const tx = payload.old;
        if (!KIDS.includes(tx.kid)) return;
        setTransactions(t=>({...t,[tx.kid]:t[tx.kid].filter(x=>x.id!==tx.id)}));
        setBalances(b=>({...b,[tx.kid]:parseFloat((b[tx.kid]-tx.amount).toFixed(2))}));
      })
      .subscribe();

    // Bonus requests: new requests + status changes
    const brSub = supabase.channel("rt-bonus-requests")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bonus_requests"},(payload)=>{
        const r = payload.new;
        if (!KIDS.includes(r.kid)) return;
        setBonusRequests(br=>({...br,[r.kid]:[r,...br[r.kid].filter(x=>x.id!==r.id)]}));
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bonus_requests"},(payload)=>{
        const r = payload.new;
        if (!KIDS.includes(r.kid)) return;
        setBonusRequests(br=>({...br,[r.kid]:br[r.kid].map(x=>x.id===r.id?r:x)}));
      })
      .subscribe();

    // Chore completions: shared chores update across all devices
    const choreSub = supabase.channel("rt-chore-completions")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chore_completions"},(payload)=>{
        const comp = payload.new;
        if (comp.week_start!==weekStart) return;
        const key = `${comp.chore_id}-${comp.week_start}-${comp.day_of_week??'w'}`;
        setCompletions(c=>({...c,[key]:true}));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"chore_completions"},(payload)=>{
        const comp = payload.old;
        const key = `${comp.chore_id}-${comp.week_start}-${comp.day_of_week??'w'}`;
        setCompletions(c=>{ const n={...c}; delete n[key]; return n; });
      })
      .subscribe();

    const streakSub = supabase.channel("rt-streaks")
      .on("postgres_changes",{event:"*",schema:"public",table:"streaks"},()=>{ loadAll(); })
      .subscribe();

    return ()=>{
      supabase.removeChannel(txSub);
      supabase.removeChannel(brSub);
      supabase.removeChannel(choreSub);
      supabase.removeChannel(streakSub);
    };
  },[weekStart]);

  async function toggleChore(chore, dow, currentVal) {
    if (chore.chore_type==="tally") {
      const key = `${chore.id}-${weekStart}-tally`;
      const newCount = dow==="tally-inc" ? currentVal+1 : Math.max(0,currentVal-1);
      setCompletions(c=>({...c,[key]:newCount}));
      try {
        await supabase.from("chore_completions").upsert({
          chore_id:chore.id, kid:chore.shared?null:chore.kid,
          week_start:weekStart, day_of_week:999, completed:true, count:newCount
        },{onConflict:"chore_id,week_start,day_of_week"});
      } catch { toast.show("Failed to save","error"); }
      return;
    }
    const key = `${chore.id}-${weekStart}-${dow??'w'}`;
    const newVal = !currentVal;
    setCompletions(c=>({...c,[key]:newVal}));
    try {
      if (newVal) {
        await supabase.from("chore_completions").upsert({
          chore_id:chore.id, kid:chore.shared?null:chore.kid,
          week_start:weekStart, day_of_week:dow??null, completed:true
        },{onConflict:"chore_id,week_start,day_of_week"});
      } else {
        let q = supabase.from("chore_completions").delete().eq("chore_id",chore.id).eq("week_start",weekStart);
        dow===null ? await q.is("day_of_week",null) : await q.eq("day_of_week",dow);
      }
    } catch { toast.show("Failed to save","error"); }
  }

  function openTxModal(preset=null, tPreset=null) {
    if (tPreset) {
      setTxType("transfer"); setTxAmount(String(tPreset.amount)); setTxReason(tPreset.reason);
      setTxToKid(tPreset.to_kid); setActiveKid(tPreset.from_kid);
    } else if (preset) {
      setTxType(preset.type); setTxAmount(String(Math.abs(preset.amount))); setTxReason(preset.label); setTxToKid("");
    } else {
      setTxType("deduct"); setTxAmount(""); setTxReason(""); setTxToKid(KIDS.filter(k=>k!==activeKid)[0]); setTxNote("");
    }
    setTxModal(true);
  }

  async function submitTx() {
    const amt=parseFloat(txAmount);
    if (!amt||amt<=0||!txReason.trim()) return;
    if (txType==="transfer"&&!txToKid) return;
    try {
      if (txType==="transfer") {
        const now=new Date().toISOString();
        const ins=[
          {kid:activeKid,amount:-amt,reason:`Transfer to ${txToKid}: ${txReason.trim()}`,week_start:weekStart},
          {kid:txToKid,amount:amt,reason:`Transfer from ${activeKid}: ${txReason.trim()}`,week_start:weekStart},
        ];
        const {error}=await supabase.from("transactions").insert(ins);
        if(error) throw error;
        setBalances(b=>({...b,[activeKid]:parseFloat((b[activeKid]-amt).toFixed(2)),[txToKid]:parseFloat((b[txToKid]+amt).toFixed(2))}));
        setTransactions(t=>({...t,[activeKid]:[{id:Date.now(),...ins[0],created_at:now},...t[activeKid]],[txToKid]:[{id:Date.now()+1,...ins[1],created_at:now},...t[txToKid]]}));
        toast.show(`Transferred $${amt.toFixed(2)} → ${txToKid}`);
      } else {
        const delta=txType==="deduct"?-amt:amt;
        const {error}=await supabase.from("transactions").insert({kid:activeKid,amount:delta,reason:txReason.trim(),week_start:weekStart,note:txNote.trim()||null});
        if(error) throw error;
        setBalances(b=>({...b,[activeKid]:parseFloat((b[activeKid]+delta).toFixed(2))}));
        setTransactions(t=>({...t,[activeKid]:[{id:Date.now(),kid:activeKid,amount:delta,reason:txReason.trim(),note:txNote.trim()||null,created_at:new Date().toISOString()},...t[activeKid]]}));
        toast.show(`${txType==="deduct"?"Deducted":"Added"} $${amt.toFixed(2)} for ${activeKid}`);
      }
      setTxModal(false);
    } catch { toast.show("Failed to save transaction","error"); }
  }

  async function deleteTx(txId) {
    const tx=transactions[activeKid].find(t=>t.id===txId); if(!tx) return;
    await supabase.from("transactions").delete().eq("id",txId);
    setBalances(b=>({...b,[activeKid]:parseFloat((b[activeKid]-tx.amount).toFixed(2))}));
    setTransactions(t=>({...t,[activeKid]:t[activeKid].filter(x=>x.id!==txId)}));
    toast.show("Transaction removed");
  }

  async function savePreset() {
    const amt=parseFloat(presetForm.amount);
    if (!presetForm.label.trim()||!amt||amt<=0) return;
    const delta=presetForm.type==="deduct"?-amt:amt;
    if (editingPreset) {
      await supabase.from("presets").update({label:presetForm.label.trim(),amount:delta,type:presetForm.type}).eq("id",editingPreset);
      setPresets(p=>({...p,[activeKid]:p[activeKid].map(x=>x.id===editingPreset?{...x,label:presetForm.label.trim(),amount:delta,type:presetForm.type}:x)}));
    } else {
      const {data}=await supabase.from("presets").insert({kid:activeKid,label:presetForm.label.trim(),amount:delta,type:presetForm.type}).select().single();
      setPresets(p=>({...p,[activeKid]:[...p[activeKid],data].sort((a,b)=>a.label.localeCompare(b.label))}));
    }
    setPresetForm({label:"",amount:"",type:"deduct",toKid:""}); setEditingPreset(null); setEditingTp(null);
    toast.show(editingPreset?"Preset updated":"Preset saved");
  }

  async function deletePreset(id) {
    await supabase.from("presets").delete().eq("id",id);
    setPresets(p=>({...p,[activeKid]:p[activeKid].filter(x=>x.id!==id)}));
    toast.show("Preset deleted");
  }

  async function saveTp() {
    const amt=parseFloat(presetForm.amount);
    const reason=presetForm.label.trim();
    const toKid=presetForm.toKid;
    if (!reason||!amt||amt<=0||!toKid||toKid===activeKid) return;
    const payload={from_kid:activeKid,to_kid:toKid,amount:amt,reason};
    if (editingTp) {
      await supabase.from("transfer_presets").update(payload).eq("id",editingTp);
      setTransferPresets(tp=>tp.map(x=>x.id===editingTp?{...x,...payload}:x));
    } else {
      const {data}=await supabase.from("transfer_presets").insert(payload).select().single();
      setTransferPresets(tp=>[...tp,data]);
    }
    setPresetForm({label:"",amount:"",type:"deduct",toKid:""}); setEditingTp(null); setEditingPreset(null);
    toast.show(editingTp?"Updated":"Saved");
  }

  async function deleteTp(id) {
    await supabase.from("transfer_presets").delete().eq("id",id);
    setTransferPresets(tp=>tp.filter(x=>x.id!==id));
    toast.show("Deleted");
  }

  async function saveChore(form, editingId, onDone) {
    const penalty=parseFloat(form.penalty)||0;
    const weekly_target=form.type==="tally"&&form.target?parseInt(form.target)||null:null;
    if (!form.label.trim()) return;
    if (editingId) {
      await supabase.from("chores").update({label:form.label.trim(),chore_type:form.type,penalty,weekly_target}).eq("id",editingId);
      setChores(c=>({...c,[activeKid]:c[activeKid].map(x=>x.id===editingId?{...x,label:form.label.trim(),chore_type:form.type,penalty,weekly_target}:x)}));
    } else {
      const {data}=await supabase.from("chores").insert({kid:activeKid,label:form.label.trim(),chore_type:form.type,penalty,weekly_target,shared:false}).select().single();
      setChores(c=>({...c,[activeKid]:[...c[activeKid],data]}));
    }
    toast.show(editingId?"Updated":"Added"); onDone();
  }

  async function deleteChore(id) {
    await supabase.from("chores").delete().eq("id",id);
    setChores(c=>({...c,[activeKid]:c[activeKid].filter(x=>x.id!==id)}));
    toast.show("Deleted");
  }

  async function saveSharedChore(form, editingId, onDone) {
    const weekly_target_s=form.type==="tally"&&form.target?parseInt(form.target)||null:null;
    if (!form.label.trim()) return;
    if (editingId) {
      await supabase.from("chores").update({label:form.label.trim(),chore_type:form.type,weekly_target:weekly_target_s}).eq("id",editingId);
      setSharedChores(s=>s.map(x=>x.id===editingId?{...x,label:form.label.trim(),chore_type:form.type,weekly_target:weekly_target_s}:x));
    } else {
      const {data}=await supabase.from("chores").insert({kid:null,label:form.label.trim(),chore_type:form.type,penalty:0,weekly_target:weekly_target_s,shared:true}).select().single();
      setSharedChores(s=>[...s,data]);
    }
    toast.show(editingId?"Updated":"Added"); onDone();
  }

  async function deleteSharedChore(id) {
    await supabase.from("chores").delete().eq("id",id);
    setSharedChores(s=>s.filter(x=>x.id!==id));
    toast.show("Deleted");
  }

  async function requestBonus(kid, preset) {
    try {
      const {data,error} = await supabase.from("bonus_requests").insert({
        kid, preset_id:preset.id, label:preset.label, amount:preset.amount, week_start:weekStart, status:"pending"
      }).select().single();
      if (error) throw error;
      setBonusRequests(br=>({...br,[kid]:[data,...br[kid]]}));
      toast.show(kid+" requested \""+preset.label+"\"");
    } catch { toast.show("Failed to submit request","error"); }
  }

  async function toggleStreak(kid) {
    const {data:cur} = await supabase.from("streaks").select("*").eq("kid",kid).eq("week_start",weekStart).maybeSingle();
    if (cur) {
      await supabase.from("streaks").update({completed:!cur.completed}).eq("id",cur.id);
    } else {
      await supabase.from("streaks").insert({kid,week_start:weekStart,completed:true});
    }
    const {data:all} = await supabase.from("streaks").select("*").order("week_start",{ascending:false});
    const kidWeeks=(all||[]).filter(s=>s.kid===kid&&s.week_start<weekStart&&s.completed).map(s=>s.week_start).sort().reverse();
    let count=0; let expected=null;
    for(const ws of kidWeeks){
      if(expected===null){expected=ws;}
      if(ws===expected){count++;const d=new Date(ws+"T12:00:00");d.setDate(d.getDate()-7);expected=d.toISOString().split("T")[0];}
      else break;
    }
    setStreaks(s=>({...s,[kid]:count}));
    toast.show("Week marked for "+kid);
  }

  async function confirmSettleUp(missed) {
    if (!missed.length) return;
    const byKid={}; KIDS.forEach(k=>{byKid[k]=[];});
    missed.forEach(m=>byKid[m.kid].push(m));
    const inserts=[];
    KIDS.forEach(kid=>{
      const items=byKid[kid]; if(!items.length) return;
      const total=items.reduce((s,m)=>s+m.penalty,0);
      if(total>0) inserts.push({kid,amount:-total,reason:`Missed chores: ${items.map(m=>m.label).join(", ")}`,week_start:weekStart});
    });
    if (inserts.length) {
      const {error}=await supabase.from("transactions").insert(inserts);
      if(error){ toast.show("Failed","error"); return; }
      const now=new Date().toISOString();
      inserts.forEach(ins=>{
        setBalances(b=>({...b,[ins.kid]:parseFloat((b[ins.kid]+ins.amount).toFixed(2))}));
        setTransactions(t=>({...t,[ins.kid]:[{id:Date.now()+Math.random(),...ins,created_at:now},...t[ins.kid]]}));
      });
    }
    setShowSettleUp(false); toast.show("Settle up applied");
  }

  async function saveAllowances() {
    const upserts=KIDS.map(k=>({key:`allowance_${k}`,value:String(allowanceEdit[k])}));
    await supabase.from("settings").upsert(upserts,{onConflict:"key"});
    const newBal={...allowanceEdit};
    KIDS.forEach(k=>transactions[k].forEach(tx=>{newBal[k]=parseFloat((newBal[k]+tx.amount).toFixed(2));}));
    setAllowances({...allowanceEdit}); setBalances(newBal);
    setShowAllowances(false); toast.show("Allowances updated");
  }

  if (loading) return (
    <div style={{background:"#080d12",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>
      <div style={{color:"#334155",fontSize:15}}>Loading…</div>
    </div>
  );

  if (isKidsView) return (
    <KidsView balances={balances} transactions={transactions} allowances={allowances}
      chores={chores} sharedChores={sharedChores} completions={completions}
      weekStart={weekStart} onToggleChore={toggleChore} presets={presets}
      bonusRequests={bonusRequests} onRequestBonus={requestBonus} streaks={streaks}/>
  );

  const t=THEME[activeKid], balance=balances[activeKid], txList=transactions[activeKid];
  const kidPresets=presets[activeKid], allowance=allowances[activeKid];
  const pct=Math.max(0,Math.min(100,(balance/allowance)*100)), isNeg=balance<0;

  return (
    <div style={{background:"#080d12",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:48,maxWidth:"100vw",overflowX:"hidden"}}>
      {toast.El}

      <div style={{background:"#0c1117",borderBottom:"1px solid #1e293b",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
        <div>
          <div style={{fontSize:10,color:"#475569",letterSpacing:"0.1em",textTransform:"uppercase"}}>☀️ Summer Ledger</div>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginTop:1}}>
            Week of {new Date(weekStart+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
          </div>
        </div>
        {(()=>{
          const allPending=KIDS.flatMap(k=>(bonusRequests[k]||[]).filter(r=>r.status==="pending"));
          return (
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {allPending.length>0&&(
                <button onClick={()=>setShowBonusReview(s=>!s)}
                  style={{position:"relative",background:showBonusReview?"#14532d":"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:showBonusReview?"#86efac":"#64748b",cursor:"pointer",fontWeight:600}}>
                  🎁
                  <span style={{position:"absolute",top:-5,right:-5,background:"#f87171",color:"#fff",borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 5px",lineHeight:1}}>
                    {allPending.length}
                  </span>
                </button>
              )}
              <button onClick={()=>setShowSettleUp(true)} style={{background:"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:"#64748b",cursor:"pointer",fontWeight:600}}>🧹</button>
              <button onClick={()=>setShowAllowances(a=>!a)} style={{background:showAllowances?"#1e3a5f":"#1e293b",border:"none",borderRadius:8,padding:"7px 10px",fontSize:12,color:showAllowances?"#93c5fd":"#64748b",cursor:"pointer",fontWeight:600}}>💰</button>
            </div>
          );
        })()}
      </div>

      {showAllowances && (
        <div style={{margin:"10px 12px 0",background:"#0c1a2e",border:"1px solid #1e3a5f",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:600,color:"#93c5fd",marginBottom:10}}>Weekly allowances</div>
          {KIDS.map(k=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>{THEME[k].emoji}</span>
              <span style={{color:"#e2e8f0",fontSize:13,width:46}}>{k}</span>
              <div style={{display:"flex",alignItems:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"2px 10px",flex:1}}>
                <span style={{color:"#475569"}}>$</span>
                <input type="number" inputMode="decimal" value={allowanceEdit[k]} onChange={e=>setAllowanceEdit(a=>({...a,[k]:parseFloat(e.target.value)||0}))}
                  style={{background:"none",border:"none",color:"#f1f5f9",fontSize:15,fontWeight:700,outline:"none",width:"100%",padding:"8px 4px"}}/>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setShowAllowances(false)} style={{flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"9px 0",color:"#64748b",fontSize:13,cursor:"pointer"}}>Cancel</button>
            <button onClick={saveAllowances} style={{flex:2,background:"#3b82f6",border:"none",borderRadius:8,padding:"9px 0",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
          </div>
        </div>
      )}

      {showBonusReview && (()=>{
        const pending=KIDS.flatMap(k=>(bonusRequests[k]||[]).filter(r=>r.status==="pending").map(r=>({...r})));
        return (
          <div style={{margin:"10px 12px 0",background:"#0d2010",border:"1px solid #4ade8030",borderRadius:14,padding:14}}>
            <div style={{fontSize:13,fontWeight:600,color:"#4ade80",marginBottom:12}}>Bonus Requests</div>
            {pending.length===0&&<div style={{color:"#475569",fontSize:13}}>No pending requests.</div>}
            {pending.map(r=>{
              const th=THEME[r.kid];
              const weekHist=(bonusRequests[r.kid]||[]).filter(x=>x.preset_id===r.preset_id&&x.week_start===weekStart&&x.id!==r.id);
              const allTimeApproved=(bonusRequests[r.kid]||[]).filter(x=>x.preset_id===r.preset_id&&x.status==="approved").length;
              return (
                <div key={r.id} style={{background:"#ffffff08",borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <span style={{fontSize:15}}>{th.emoji}</span>
                      <span style={{color:th.accent,fontWeight:700,fontSize:13,marginLeft:6}}>{r.kid}</span>
                      <span style={{color:"#e2e8f0",fontSize:14,fontWeight:600,marginLeft:8}}>{r.label}</span>
                    </div>
                    <span style={{color:"#4ade80",fontWeight:800,fontSize:15,flexShrink:0,marginLeft:8}}>+${r.amount.toFixed(2)}</span>
                  </div>
                  <div style={{color:"#475569",fontSize:10,marginBottom:8}}>{fmtTime(r.created_at)}</div>
                  <div style={{background:"#ffffff06",borderRadius:7,padding:"6px 10px",marginBottom:10,fontSize:11,color:"#64748b"}}>
                    {weekHist.length===0?"First request this week":`${weekHist.length} other request${weekHist.length!==1?"s":""} this week (${weekHist.filter(x=>x.status==="approved").length} approved)`}
                    {" · "}All-time approved: {allTimeApproved}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={async()=>{
                      await supabase.from("bonus_requests").update({status:"denied"}).eq("id",r.id);
                      setBonusRequests(br=>({...br,[r.kid]:br[r.kid].map(x=>x.id===r.id?{...x,status:"denied"}:x)}));
                      toast.show("Request denied");
                    }} style={{flex:1,background:"#3f0a0a",border:"1px solid #f8717140",color:"#fca5a5",borderRadius:8,padding:"9px 0",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                      Deny
                    </button>
                    <button onClick={async()=>{
                      const delta=r.amount;
                      await supabase.from("transactions").insert({kid:r.kid,amount:delta,reason:"Bonus approved: "+r.label,week_start:weekStart});
                      await supabase.from("bonus_requests").update({status:"approved"}).eq("id",r.id);
                      setBalances(b=>({...b,[r.kid]:parseFloat((b[r.kid]+delta).toFixed(2))}));
                      setTransactions(t=>({...t,[r.kid]:[{id:Date.now(),kid:r.kid,amount:delta,reason:"Bonus approved: "+r.label,created_at:new Date().toISOString()},...t[r.kid]]}));
                      setBonusRequests(br=>({...br,[r.kid]:br[r.kid].map(x=>x.id===r.id?{...x,status:"approved"}:x)}));
                      toast.show("Approved +$"+delta.toFixed(2)+" for "+r.kid);
                    }} style={{flex:2,background:"#14532d",border:"1px solid #4ade8040",color:"#86efac",borderRadius:8,padding:"9px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                      Approve +${r.amount.toFixed(2)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{display:"flex",background:"#0c1117",borderBottom:"1px solid #1e293b"}}>
        {KIDS.map(k=>(
          <button key={k} onClick={()=>{setActiveKid(k);setActiveTab("balance");setShowAllowances(false);}}
            style={{flex:1,border:"none",background:"none",padding:"11px 0",cursor:"pointer",borderBottom:activeKid===k?`2px solid ${THEME[k].accent}`:"2px solid transparent",color:activeKid===k?THEME[k].accent:"#475569",fontWeight:activeKid===k?700:400,fontSize:13,transition:"all 0.15s"}}>
            {THEME[k].emoji} {k}
          </button>
        ))}
      </div>

      <div style={{background:t.card,margin:"12px 12px 0",borderRadius:18,padding:18,border:`1px solid ${t.accent}20`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:t.text,opacity:0.6,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.1em"}}>Balance</div>
            <div style={{fontSize:40,fontWeight:800,color:isNeg?"#f87171":t.accent,letterSpacing:"-2px",lineHeight:1}}>{fmtBal(balance)}</div>
            <div style={{fontSize:11,color:t.text,opacity:0.5,marginTop:3}}>of ${allowance.toFixed(2)} this week</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:t.text,opacity:0.5}}>{txList.length} tx</div>
            {streaks[activeKid]>0&&<div style={{fontSize:13,color:"#fbbf24",fontWeight:700,marginTop:2}}>{"🔥"} {streaks[activeKid]} wk streak</div>}
            <button onClick={()=>toggleStreak(activeKid)}
              style={{marginTop:4,background:"none",border:"1px solid #1e293b",borderRadius:6,padding:"3px 8px",fontSize:10,color:"#475569",cursor:"pointer"}}>
              {"✓"} mark week
            </button>
          </div>
        </div>
        <div style={{background:"#ffffff12",borderRadius:99,height:5,marginBottom:14}}>
          <div style={{background:isNeg?"#f87171":t.accent,width:`${pct}%`,height:"100%",borderRadius:99,transition:"width 0.5s ease"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:6}}>
          <button onClick={()=>openTxModal()} style={{background:t.accent,color:"#080d12",border:"none",borderRadius:10,padding:"11px 0",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ / − Add</button>
          {["history","presets","chores"].map(tb=>(
            <button key={tb} onClick={()=>setActiveTab(activeTab===tb?"balance":tb)}
              style={{background:activeTab===tb?t.muted:"#ffffff08",color:t.text,border:"none",borderRadius:10,padding:"11px 10px",fontSize:12,cursor:"pointer",fontWeight:activeTab===tb?600:400,textTransform:"capitalize",whiteSpace:"nowrap"}}>
              {tb}
            </button>
          ))}
        </div>
      </div>

      {activeTab==="balance" && (kidPresets.length>0||transferPresets.some(tp=>tp.from_kid===activeKid)) && (() => {
        const deductions = kidPresets.filter(p=>p.type==="deduct");
        const bonuses    = kidPresets.filter(p=>p.type==="bonus");
        const transfers  = transferPresets.filter(tp=>tp.from_kid===activeKid);
        const Section = ({label,color,items}) => items.length===0 ? null : (
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:5}}>{label}</div>
            {items.map((p,i)=>(
              <button key={p.id??i} onClick={()=>p.from_kid?openTxModal(null,p):openTxModal(p)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:"#ffffff06",border:`1px solid ${color}30`,borderRadius:9,padding:"9px 12px",fontSize:13,cursor:"pointer",marginBottom:4,textAlign:"left"}}>
                <span style={{color:"#e2e8f0",fontWeight:500,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {p.from_kid ? `${p.from_kid} → ${p.to_kid}: ${p.reason}` : p.label}
                </span>
                <span style={{color,fontWeight:700,flexShrink:0,marginLeft:10}}>
                  {p.from_kid ? `⇄ $${p.amount.toFixed(2)}` : `${p.type==="deduct"?"−":"+"}$${Math.abs(p.amount).toFixed(2)}`}
                </span>
              </button>
            ))}
          </div>
        );
        return (
          <div style={{padding:"10px 12px 0"}}>
            <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Quick add</div>
            <Section label="Deductions" color="#f87171" items={deductions}/>
            <Section label="Bonuses"    color="#4ade80" items={bonuses}/>
            <Section label="Transfers"  color="#a78bfa" items={transfers}/>
          </div>
        );
      })()}

      {activeTab==="history" && (
        <div style={{margin:"10px 12px 0",background:t.card,borderRadius:14,padding:14,border:`1px solid ${t.accent}15`}}>
          <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:10}}>This week</div>
          {txList.length===0&&<div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"14px 0"}}>No transactions yet</div>}
          {txList.map(tx=>(
            <div key={tx.id} style={{background:"#ffffff08",borderRadius:9,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{flex:1,minWidth:0,marginRight:8}}>
                <div style={{color:"#e2e8f0",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.reason}</div>
                {tx.note&&<div style={{color:"#fbbf24",fontSize:11,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.note}</div>}
                <div style={{color:"#475569",fontSize:10,marginTop:1}}>{fmtTime(tx.created_at)}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontWeight:700,fontSize:13,color:tx.amount<0?"#f87171":"#4ade80"}}>{fmt(tx.amount)}</span>
                <button onClick={()=>deleteTx(tx.id)} style={{background:"none",border:"none",color:"#334155",fontSize:14,cursor:"pointer",padding:"0 2px"}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="presets" && (
        <div style={{margin:"10px 12px 0",background:t.card,borderRadius:14,padding:14,border:`1px solid ${t.accent}15`}}>
          <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:10}}>{activeKid}'s presets</div>

          {(() => {
            const deductions = kidPresets.filter(p=>p.type==="deduct");
            const bonuses    = kidPresets.filter(p=>p.type==="bonus");
            const transfers  = transferPresets.filter(tp=>tp.from_kid===activeKid);
            const allEmpty   = deductions.length===0&&bonuses.length===0&&transfers.length===0;
            if (allEmpty) return <div style={{color:"#475569",fontSize:13,marginBottom:10}}>No presets yet.</div>;
            const PresetRow = ({p}) => (
              <div style={{background:"#ffffff08",borderRadius:9,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{color:p.type==="deduct"?"#f87171":"#4ade80",fontWeight:700,marginRight:4}}>{p.type==="deduct"?"−":"+"}</span>
                  <span style={{color:"#e2e8f0",fontSize:13}}>{p.label}</span>
                  <span style={{color:"#64748b",fontSize:12}}> · ${Math.abs(p.amount).toFixed(2)}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>{setEditingPreset(p.id);setEditingTp(null);setPresetForm({label:p.label,amount:String(Math.abs(p.amount)),type:p.type,toKid:""}); }} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>deletePreset(p.id)} style={{background:"none",border:"none",color:"#475569",fontSize:14,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            );
            const TpRow = ({tp}) => (
              <div style={{background:"#ffffff08",borderRadius:9,padding:"9px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{color:"#a78bfa",fontWeight:700,marginRight:4}}>⇄</span>
                  <span style={{color:"#e2e8f0",fontSize:13}}>{tp.reason}</span>
                  <span style={{color:"#64748b",fontSize:12}}> · {tp.from_kid}→{tp.to_kid} · ${tp.amount.toFixed(2)}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>{setEditingTp(tp.id);setEditingPreset("__tp__");setPresetForm({label:tp.reason,amount:String(tp.amount),type:"transfer",toKid:tp.to_kid}); }} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>deleteTp(tp.id)} style={{background:"none",border:"none",color:"#475569",fontSize:14,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            );
            return (<>
              {deductions.length>0&&<><div style={{fontSize:10,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:5,marginTop:4}}>Deductions</div>{deductions.map(p=><PresetRow key={p.id} p={p}/>)}</>}
              {bonuses.length>0&&<><div style={{fontSize:10,color:"#4ade80",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:5,marginTop:deductions.length>0?10:4}}>Bonuses</div>{bonuses.map(p=><PresetRow key={p.id} p={p}/>)}</>}
              {transfers.length>0&&<><div style={{fontSize:10,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:5,marginTop:(deductions.length>0||bonuses.length>0)?10:4}}>Transfers</div>{transfers.map(tp=><TpRow key={tp.id} tp={tp}/>)}</>}
            </>);
          })()}

          <div style={{borderTop:"1px solid #1e293b",paddingTop:12,marginTop:8}}>
            <div style={{fontSize:12,color:"#64748b",marginBottom:8,fontWeight:600}}>{editingPreset?"Edit preset":"New preset"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#0f172a",borderRadius:8,padding:2,marginBottom:8}}>
              {[["deduct","− Deduct"],["bonus","+ Bonus"],["transfer","⇄ Transfer"]].map(([tp,label])=>(
                <button key={tp} onClick={()=>setPresetForm(f=>({...f,type:tp,toKid:tp==="transfer"&&!f.toKid?KIDS.filter(k=>k!==activeKid)[0]:f.toKid}))}
                  style={{border:"none",borderRadius:6,padding:"8px 0",fontSize:11,cursor:"pointer",fontWeight:600,
                    background:presetForm.type===tp?(tp==="deduct"?"#f87171":tp==="bonus"?"#4ade80":"#7c6ff7"):"transparent",
                    color:presetForm.type===tp?"#080d12":"#475569"}}>
                  {label}
                </button>
              ))}
            </div>
            {presetForm.type==="transfer" && (
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                {KIDS.filter(k=>k!==activeKid).map(k=>(
                  <button key={k} onClick={()=>setPresetForm(f=>({...f,toKid:k}))}
                    style={{flex:1,border:`2px solid ${presetForm.toKid===k?THEME[k].accent:"#334155"}`,borderRadius:8,padding:"7px 0",background:presetForm.toKid===k?THEME[k].card:"transparent",cursor:"pointer",color:presetForm.toKid===k?THEME[k].accent:"#475569",fontSize:12,fontWeight:presetForm.toKid===k?700:400}}>
                    {THEME[k].emoji} {k}
                  </button>
                ))}
              </div>
            )}
            <input value={presetForm.label} onChange={e=>setPresetForm(f=>({...f,label:e.target.value}))} placeholder="Label / reason" style={{...inp,marginBottom:6}}/>
            <input value={presetForm.amount} onChange={e=>setPresetForm(f=>({...f,amount:e.target.value}))} type="number" inputMode="decimal" placeholder="Amount" style={{...inp,marginBottom:8}}/>
            <div style={{display:"flex",gap:6}}>
              {editingPreset&&<button onClick={()=>{setEditingPreset(null);setEditingTp(null);setPresetForm({label:"",amount:"",type:"deduct",toKid:""}); }} style={{flex:1,background:"#1e293b",border:"none",borderRadius:8,padding:"9px 0",color:"#64748b",fontSize:12,cursor:"pointer"}}>Cancel</button>}
              <button
                onClick={()=>{ presetForm.type==="transfer" ? saveTp() : savePreset(); }}
                disabled={!presetForm.label.trim()||!presetForm.amount||parseFloat(presetForm.amount)<=0||(presetForm.type==="transfer"&&!presetForm.toKid)}
                style={{flex:2,background:presetForm.type==="transfer"?"#7c6ff7":t.accent,border:"none",borderRadius:8,padding:"9px 0",color:"#080d12",fontSize:12,fontWeight:700,cursor:"pointer",
                  opacity:(!presetForm.label.trim()||!presetForm.amount||parseFloat(presetForm.amount)<=0||(presetForm.type==="transfer"&&!presetForm.toKid))?0.4:1}}>
                {editingPreset?"Save changes":"Add preset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab==="chores" && (
        <div style={{marginTop:10}}>
          <ChoresPanel kid={activeKid} chores={chores} sharedChores={sharedChores}
            completions={completions} weekStart={weekStart}
            onToggle={toggleChore} onSave={saveChore} onDelete={deleteChore}
            onSaveShared={saveSharedChore} onDeleteShared={deleteSharedChore}/>
        </div>
      )}

      {showSettleUp && (
        <SettleUpModal chores={chores} sharedChores={sharedChores} completions={completions}
          weekStart={weekStart} onConfirm={confirmSettleUp} onClose={()=>setShowSettleUp(false)}/>
      )}

      {txModal && (
        <div style={{position:"fixed",inset:0,background:"#000000bb",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={()=>setTxModal(false)}>
          <div style={{background:"#1e293b",borderRadius:"18px 18px 0 0",padding:20,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:17}}>{THEME[activeKid].emoji} {activeKid}</div>
              <button onClick={()=>setTxModal(false)} style={{background:"none",border:"none",color:"#475569",fontSize:22,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#0f172a",borderRadius:10,padding:3,marginBottom:14}}>
              {[["deduct","− Deduct"],["bonus","+ Bonus"],["transfer","⇄ Transfer"]].map(([tp,label])=>(
                <button key={tp} onClick={()=>{setTxType(tp);if(tp==="transfer"&&!txToKid)setTxToKid(KIDS.filter(k=>k!==activeKid)[0]);}}
                  style={{border:"none",borderRadius:8,padding:"9px 0",fontWeight:600,fontSize:12,cursor:"pointer",background:txType===tp?(tp==="deduct"?"#f87171":tp==="bonus"?"#4ade80":"#7c6ff7"):"transparent",color:txType===tp?"#0f172a":"#64748b"}}>
                  {label}
                </button>
              ))}
            </div>
            {txType==="transfer" && (
              <div style={{marginBottom:12}}>
                <div style={{color:"#64748b",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>To</div>
                <div style={{display:"flex",gap:6}}>
                  {KIDS.filter(k=>k!==activeKid).map(k=>(
                    <button key={k} onClick={()=>setTxToKid(k)}
                      style={{flex:1,border:`2px solid ${txToKid===k?THEME[k].accent:"#334155"}`,borderRadius:9,padding:"9px 0",background:txToKid===k?THEME[k].card:"transparent",cursor:"pointer",color:txToKid===k?THEME[k].accent:"#475569",fontWeight:txToKid===k?700:400,fontSize:13}}>
                      {THEME[k].emoji} {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{marginBottom:10}}>
              <div style={{color:"#64748b",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Amount</div>
              <input type="number" inputMode="decimal" value={txAmount} onChange={e=>setTxAmount(e.target.value)} placeholder="0.00" autoFocus
                style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:"11px 12px",fontSize:20,color:"#f1f5f9",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:txType!=="transfer"?10:16}}>
              <div style={{color:"#64748b",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Reason</div>
              <input type="text" value={txReason} onChange={e=>setTxReason(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitTx()} placeholder="What happened?"
                style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:"11px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box"}}/>
            </div>
            {txType!=="transfer" && (
              <div style={{marginBottom:16}}>
                <div style={{color:"#64748b",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>Note for kid <span style={{color:"#334155",fontWeight:400}}>(optional)</span></div>
                <input type="text" value={txNote} onChange={e=>setTxNote(e.target.value)} placeholder='e.g. Left bike in the driveway'
                  style={{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:10,padding:"11px 12px",fontSize:14,color:"#f1f5f9",outline:"none",boxSizing:"border-box"}}/>
              </div>
            )}
            <button onClick={submitTx} disabled={!txAmount||parseFloat(txAmount)<=0||!txReason.trim()||(txType==="transfer"&&!txToKid)}
              style={{width:"100%",background:txType==="deduct"?"#f87171":txType==="bonus"?"#4ade80":"#7c6ff7",border:"none",borderRadius:11,padding:"13px 0",fontWeight:800,fontSize:15,color:"#0f172a",cursor:"pointer",opacity:(!txAmount||parseFloat(txAmount)<=0||!txReason.trim()||(txType==="transfer"&&!txToKid))?0.4:1}}>
              {txType==="transfer"?`⇄ Transfer $${parseFloat(txAmount||0).toFixed(2)} to ${txToKid}`:txType==="deduct"?`− Deduct $${parseFloat(txAmount||0).toFixed(2)}`:`+ Add $${parseFloat(txAmount||0).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
