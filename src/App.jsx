import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────
const PALETTE = {
  primary:"#4F46E5", primaryLight:"#818CF8", primaryDark:"#3730A3",
  accent:"#22C55E",  accentLight:"#86EFAC",
  warning:"#EF4444", warningLight:"#FCA5A5",
  amber:"#F59E0B",   amberLight:"#FCD34D",
  cyan:"#06B6D4",    violet:"#7C3AED",
  bg:"#0D0D1A",      surface:"#13132B",
  card:"#1A1A35",    cardHover:"#1E1E3E",
  border:"rgba(99,102,241,0.18)",
  text:"#F0F0FF",    muted:"#8B8BA8",  dim:"#3D3D5C",
};

const CATS = {
  Food:          { color:"#6366F1", icon:"🛒" },
  Rent:          { color:"#7C3AED", icon:"🏠" },
  Transport:     { color:"#06B6D4", icon:"🚌" },
  Entertainment: { color:"#F59E0B", icon:"🎬" },
  Health:        { color:"#22C55E", icon:"💊" },
  Shopping:      { color:"#EC4899", icon:"🛍️" },
  Utilities:     { color:"#8B5CF6", icon:"⚡" },
  Education:     { color:"#14B8A6", icon:"📚" },
  Savings:       { color:"#10B981", icon:"🏦" },
  Other:         { color:"#94A3B8", icon:"📌" },
};
const CAT_KEYS = Object.keys(CATS);

const DEBT_TYPES = { credit_card:"💳", personal_loan:"🏦", car_loan:"🚗", mortgage:"🏠", student_loan:"🎓", other:"💸" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt   = n => "$" + Math.abs(Number(n)||0).toLocaleString("en-US", {minimumFractionDigits:0, maximumFractionDigits:0});
const fmtD  = d => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
const today = () => new Date().toISOString().split("T")[0];
const nid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const pct   = (v,m) => Math.min(100, Math.round((v/Math.max(m,1))*100));
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_EXP = [
  {id:nid(),date:"2025-03-01",cat:"Rent",     amount:1200,note:"March rent"},
  {id:nid(),date:"2025-03-03",cat:"Food",     amount:87,  note:"Weekly groceries"},
  {id:nid(),date:"2025-03-07",cat:"Transport",amount:45,  note:"Bus pass"},
  {id:nid(),date:"2025-03-09",cat:"Food",     amount:32,  note:"Dinner out"},
  {id:nid(),date:"2025-03-12",cat:"Utilities",amount:80,  note:"Electric bill"},
  {id:nid(),date:"2025-03-14",cat:"Food",     amount:94,  note:"Groceries"},
  {id:nid(),date:"2025-03-17",cat:"Entertainment",amount:25,note:"Netflix + Spotify"},
  {id:nid(),date:"2025-03-20",cat:"Health",   amount:60,  note:"Gym membership"},
  {id:nid(),date:"2025-03-22",cat:"Food",     amount:41,  note:"Lunch"},
  {id:nid(),date:"2025-03-25",cat:"Shopping", amount:120, note:"Clothing"},
];
const SEED_DEBTS = [
  {id:nid(),name:"Visa Credit Card",type:"credit_card",  balance:3400, rate:19.99, minPayment:85,  color:"#EF4444"},
  {id:nid(),name:"Student Loan",    type:"student_loan", balance:12000,rate:5.5,   minPayment:130, color:"#F59E0B"},
  {id:nid(),name:"Car Loan",        type:"car_loan",     balance:8500, rate:7.2,   minPayment:210, color:"#7C3AED"},
];
const SEED_NOTES = [
  {id:nid(),type:"monthly",date:"2025-03-01",title:"March Goals",content:"Cut dining out by 20%. Start emergency fund contributions."},
  {id:nid(),type:"weekly", date:"2025-03-17",title:"Week 3 Check-in",content:"Overspent on food this week. Need to meal prep more."},
];
const SEED_PROFILE = {
  name:"Alex Johnson", income:5500, savings:8200, budget:3500,
  limits:{Food:500,Rent:1400,Transport:200,Entertainment:150,Health:100,Shopping:200,Utilities:150,Education:100,Savings:300,Other:100},
};

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────
const LS = {
  get: (k,d) => { try{const v=localStorage.getItem(k); return v?JSON.parse(v):d;}catch{return d;} },
  set: (k,v) => { try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
};

// ─────────────────────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  card: { background:PALETTE.card, borderRadius:16, border:`1px solid ${PALETTE.border}`, boxShadow:"0 4px 24px rgba(0,0,0,0.35)" },
  inp:  { width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.05)", border:`1px solid ${PALETTE.border}`, borderRadius:10, color:PALETTE.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color 0.2s" },
  lbl:  { display:"block", fontSize:11, fontWeight:700, color:PALETTE.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 },
};

const Chip = ({children, color}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:99,background:color+"22",color,border:`1px solid ${color}44`,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>
);

const ProgBar = ({value,max,color,label,subLabel,h=8}) => {
  const p = pct(value,max);
  const c = p>=100?PALETTE.warning:p>=85?PALETTE.amber:color||PALETTE.primary;
  return (
    <div>
      {(label||subLabel)&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        {label&&<span style={{fontSize:12,color:PALETTE.muted}}>{label}</span>}
        {subLabel&&<span style={{fontSize:12,fontWeight:700,color:c}}>{subLabel}</span>}
      </div>}
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:99,height:h,overflow:"hidden"}}>
        <div style={{width:p+"%",height:"100%",background:c,borderRadius:99,transition:"width 0.8s cubic-bezier(.34,1.56,.64,1)"}}/>
      </div>
    </div>
  );
};

const StatCard = ({icon,label,value,sub,color,onClick}) => (
  <div onClick={onClick} style={{...s.card,padding:"18px 20px",cursor:onClick?"pointer":"default",transition:"transform 0.15s, box-shadow 0.15s"}}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.45)";}}}
    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.35)";}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
      <div style={{width:38,height:38,borderRadius:10,background:(color||PALETTE.primary)+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
    </div>
    <div style={{fontSize:11,color:PALETTE.muted,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
    <div style={{fontSize:24,fontWeight:800,color:PALETTE.text,letterSpacing:"-0.03em"}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:PALETTE.muted,marginTop:4}}>{sub}</div>}
  </div>
);

const Btn = ({children,onClick,variant="primary",size="md",full,disabled,style:sx={}}) => {
  const bg = {primary:`linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})`,danger:`linear-gradient(135deg,${PALETTE.warning},#B91C1C)`,success:`linear-gradient(135deg,${PALETTE.accent},#16A34A)`,ghost:"rgba(255,255,255,0.06)",subtle:"rgba(255,255,255,0.04)"}[variant];
  const brd = {ghost:`1px solid ${PALETTE.border}`,subtle:`1px solid ${PALETTE.border}`}[variant]||"none";
  const col = {ghost:PALETTE.muted,subtle:PALETTE.muted}[variant]||"#fff";
  const pd  = {sm:"6px 14px",md:"10px 20px",lg:"12px 26px"}[size]||"10px 20px";
  return <button onClick={onClick} disabled={disabled} style={{padding:pd,background:disabled?"rgba(255,255,255,0.05)":bg,border:brd,borderRadius:10,color:disabled?PALETTE.dim:col,fontSize:size==="sm"?12:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",width:full?"100%":"auto",transition:"opacity 0.15s,transform 0.1s",boxShadow:variant==="primary"&&!disabled?"0 4px 16px rgba(79,70,229,0.35)":"none",...sx}}>{children}</button>;
};

const Modal = ({open,onClose,title,children,width=500}) => {
  if(!open)return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{...s.card,padding:"28px 26px",width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${PALETTE.border}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:PALETTE.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:PALETTE.muted,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Toast = ({toasts,dismiss}) => (
  <div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none",width:320}}>
    {toasts.map(t=>(
      <div key={t.id} style={{background:PALETTE.card,border:`1px solid ${t.type==="error"?PALETTE.warning:t.type==="warn"?PALETTE.amber:PALETTE.accent}44`,borderLeft:`3px solid ${t.type==="error"?PALETTE.warning:t.type==="warn"?PALETTE.amber:PALETTE.accent}`,borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",pointerEvents:"all",animation:"slideIn 0.25s ease"}}>
        <span style={{fontSize:16,flexShrink:0}}>{t.type==="error"?"🚨":t.type==="warn"?"⚠️":"✅"}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:PALETTE.text,marginBottom:2}}>{t.title}</div>
          <div style={{fontSize:12,color:PALETTE.muted,lineHeight:1.4}}>{t.body}</div>
        </div>
        <button onClick={()=>dismiss(t.id)} style={{background:"none",border:"none",color:PALETTE.dim,cursor:"pointer",fontSize:14,padding:0,flexShrink:0,pointerEvents:"all"}}>×</button>
      </div>
    ))}
  </div>
);

const AlertStrip = ({alerts}) => {
  const [dismissed,setDismissed]=useState([]);
  const visible=alerts.filter(a=>!dismissed.includes(a.id));
  if(!visible.length)return null;
  return <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
    {visible.map(a=>(
      <div key={a.id} style={{background:a.level==="error"?`${PALETTE.warning}12`:`${PALETTE.amber}12`,border:`1px solid ${a.level==="error"?PALETTE.warning:PALETTE.amber}44`,borderLeft:`3px solid ${a.level==="error"?PALETTE.warning:PALETTE.amber}`,borderRadius:10,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
          <span style={{fontSize:15,flexShrink:0}}>{a.level==="error"?"🚨":"⚠️"}</span>
          <div style={{fontSize:13,color:PALETTE.text,lineHeight:1.45}}>{a.msg}</div>
        </div>
        <button onClick={()=>setDismissed(d=>[...d,a.id])} style={{background:"none",border:"none",color:PALETTE.dim,cursor:"pointer",fontSize:15,flexShrink:0}}>×</button>
      </div>
    ))}
  </div>;
};


// ─────────────────────────────────────────────────────────────────────────────
// EXPENDITURE CHART — Estimated vs Actual with Daily/Weekly/Monthly/Yearly views
// ─────────────────────────────────────────────────────────────────────────────
function ExpenditureChart({ expenses, profile }) {
  const [view, setView] = useState("daily");

  const VIEWS = ["daily","weekly","monthly","yearly"];
  const VIEW_LABELS = { daily:"Daily", weekly:"Weekly", monthly:"Monthly", yearly:"Yearly" };

  const chartData = useMemo(() => {
    const now = new Date();

    if (view === "daily") {
      // Last 30 days — cumulative actual vs ideal straight-line estimate
      const days = 30;
      const dailyIdeal = profile.budget / days; // ideal spend per day
      let cumActual = 0;
      let cumIdeal  = 0;
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        const ds = d.toISOString().split("T")[0];
        const daySpent = expenses
          .filter(e => e.date === ds)
          .reduce((s, e) => s + Number(e.amount), 0);
        cumActual += daySpent;
        cumIdeal  += dailyIdeal;
        return {
          label: fmtD(ds),
          actual: parseFloat(cumActual.toFixed(2)),
          estimated: parseFloat(cumIdeal.toFixed(2)),
          daily: parseFloat(daySpent.toFixed(2)),
          dailyIdeal: parseFloat(dailyIdeal.toFixed(2)),
        };
      });
    }

    if (view === "weekly") {
      // Last 12 weeks — weekly actual vs weekly ideal
      const weeks = 12;
      const weeklyIdeal = profile.budget / 4.33; // avg weeks per month
      return Array.from({ length: weeks }, (_, i) => {
        const weekEnd   = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (weeks - 1 - i) * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const ws = weekStart.toISOString().split("T")[0];
        const we = weekEnd.toISOString().split("T")[0];
        const weekSpent = expenses
          .filter(e => e.date >= ws && e.date <= we)
          .reduce((s, e) => s + Number(e.amount), 0);
        const weekLabel = "W" + (weeks - i);
        return {
          label: weekLabel,
          actual: parseFloat(weekSpent.toFixed(2)),
          estimated: parseFloat(weeklyIdeal.toFixed(2)),
        };
      });
    }

    if (view === "monthly") {
      // Last 12 months — monthly actual vs monthly budget
      const months = 12;
      return Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        const yr  = d.getFullYear();
        const mo  = String(d.getMonth() + 1).padStart(2, "0");
        const prefix = `${yr}-${mo}`;
        const monthSpent = expenses
          .filter(e => e.date.startsWith(prefix))
          .reduce((s, e) => s + Number(e.amount), 0);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        // For past months use actual; for current month project to end-of-month
        const daysInMonth = new Date(yr, d.getMonth() + 1, 0).getDate();
        const dayOfMonth  = i === months - 1 ? now.getDate() : daysInMonth;
        const projected   = i === months - 1 && monthSpent > 0
          ? parseFloat((monthSpent / dayOfMonth * daysInMonth).toFixed(2))
          : monthSpent;
        return {
          label,
          actual: parseFloat(monthSpent.toFixed(2)),
          estimated: profile.budget,
          projected: i === months - 1 ? projected : null,
        };
      });
    }

    if (view === "yearly") {
      // Last 4 years — annual actual vs annual budget
      return Array.from({ length: 4 }, (_, i) => {
        const yr = now.getFullYear() - (3 - i);
        const yearSpent = expenses
          .filter(e => e.date.startsWith(String(yr)))
          .reduce((s, e) => s + Number(e.amount), 0);
        return {
          label: String(yr),
          actual: parseFloat(yearSpent.toFixed(2)),
          estimated: profile.budget * 12,
        };
      });
    }

    return [];
  }, [view, expenses, profile]);

  // Insight stats
  const totalActual    = chartData.reduce((s, d) => s + (d.actual || 0), 0);
  const totalEstimated = chartData.reduce((s, d) => s + (d.estimated || 0), 0);
  const diff           = totalActual - totalEstimated;
  const overBudget     = diff > 0;
  const lastPoint      = chartData[chartData.length - 1] || {};
  const trend          = chartData.length >= 2
    ? (chartData[chartData.length-1].actual || 0) - (chartData[chartData.length-2].actual || 0)
    : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{background:PALETTE.card,border:`1px solid ${PALETTE.border}`,borderRadius:12,padding:"12px 16px",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",minWidth:160}}>
        <div style={{fontSize:11,color:PALETTE.muted,marginBottom:8,fontWeight:700}}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/>
              <span style={{fontSize:12,color:PALETTE.muted}}>{p.name}</span>
            </div>
            <span style={{fontSize:13,fontWeight:800,color:p.color}}>{fmt(p.value)}</span>
          </div>
        ))}
        {payload.length === 2 && (
          <div style={{borderTop:`1px solid ${PALETTE.border}`,marginTop:8,paddingTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:PALETTE.muted}}>Δ Difference</span>
              <span style={{fontSize:12,fontWeight:800,color:(payload[0].value||0)>(payload[1].value||0)?PALETTE.warning:PALETTE.accent}}>
                {(payload[0].value||0)>(payload[1].value||0)?"+":""}{fmt((payload[0].value||0)-(payload[1].value||0))}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{...s.card, padding:22, marginBottom:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:PALETTE.text,marginBottom:3}}>
            Estimated vs Actual Expenditure
          </div>
          <div style={{fontSize:12,color:PALETTE.muted}}>
            {VIEW_LABELS[view]} view · Compare your spending against the ideal plan
          </div>
        </div>
        {/* View toggles */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:3,border:`1px solid ${PALETTE.border}`,gap:2}}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"5px 12px", border:"none", borderRadius:8,
              background: view===v ? `linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})` : "transparent",
              color: view===v ? "#fff" : PALETTE.muted,
              fontSize:12, fontWeight:view===v?700:500,
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.18s",
              boxShadow: view===v ? `0 2px 8px ${PALETTE.primary}55` : "none",
            }}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Stat pills */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
        {[
          { label:"Actual Spend",   value:fmt(totalActual),    color:PALETTE.primary,   icon:"💸" },
          { label:"Estimated",      value:fmt(totalEstimated), color:PALETTE.accent,    icon:"🎯" },
          { label:overBudget?"Over Budget":"Under Budget",
            value:fmt(Math.abs(diff)),
            color:overBudget?PALETTE.warning:PALETTE.accent,
            icon:overBudget?"🚨":"✅" },
          { label:"Latest Trend",
            value:(trend>=0?"+":"")+fmt(trend),
            color:trend>0?PALETTE.warning:PALETTE.accent,
            icon:trend>0?"📈":"📉" },
        ].map(stat => (
          <div key={stat.label} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"rgba(255,255,255,0.04)",border:`1px solid ${stat.color}22`,borderRadius:10}}>
            <span style={{fontSize:14}}>{stat.icon}</span>
            <div>
              <div style={{fontSize:10,color:PALETTE.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{stat.label}</div>
              <div style={{fontSize:13,fontWeight:800,color:stat.color}}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:18,marginBottom:12,flexWrap:"wrap"}}>
        {[
          { color:PALETTE.primary,     label:"Actual expenditure",   dash:false },
          { color:PALETTE.accent,      label:"Estimated / Budget",   dash:true  },
          ...(view==="monthly" ? [{ color:PALETTE.amber, label:"Projected (current month)", dash:true }] : []),
        ].map(l => (
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:6}}>
            <svg width={28} height={12}>
              {l.dash
                ? <line x1={0} y1={6} x2={28} y2={6} stroke={l.color} strokeWidth={2} strokeDasharray="5 3"/>
                : <line x1={0} y1={6} x2={28} y2={6} stroke={l.color} strokeWidth={2.5}/>}
              {!l.dash && <circle cx={14} cy={6} r={3} fill={l.color}/>}
            </svg>
            <span style={{fontSize:11,color:PALETTE.muted}}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* The chart */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{top:8,right:10,left:0,bottom:0}}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={PALETTE.primary}/>
              <stop offset="100%" stopColor={PALETTE.primaryLight}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false}/>
          <XAxis
            dataKey="label"
            tick={{fill:PALETTE.muted,fontSize:10}}
            tickLine={false} axisLine={false}
            interval={view==="daily"?4:view==="weekly"?1:0}
          />
          <YAxis
            tick={{fill:PALETTE.muted,fontSize:10}}
            tickLine={false} axisLine={false}
            tickFormatter={v => v>=1000?`$${(v/1000).toFixed(0)}k`:`$${v}`}
            width={46}
          />
          <Tooltip content={<CustomTooltip/>}/>

          {/* Estimated / ideal line — dashed green */}
          <Line
            type="monotone"
            dataKey="estimated"
            name="Estimated"
            stroke={PALETTE.accent}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            activeDot={{r:5,fill:PALETTE.accent,strokeWidth:0}}
          />

          {/* Projected line for monthly view — dashed amber */}
          {view==="monthly" && (
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke={PALETTE.amber}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              activeDot={{r:5,fill:PALETTE.amber,strokeWidth:0}}
            />
          )}

          {/* Actual spending line — solid indigo */}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="url(#actualGrad)"
            strokeWidth={2.5}
            dot={{ r:3, fill:PALETTE.primary, strokeWidth:0 }}
            activeDot={{ r:6, fill:PALETTE.primaryLight, stroke:PALETTE.primary, strokeWidth:2 }}
          />

          {/* Over-budget reference line */}
          {(view==="daily"||view==="monthly") && (
            <ReferenceLine
              y={view==="daily"?profile.budget:profile.budget}
              stroke={PALETTE.warning}
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{value:"Budget limit",fill:PALETTE.warning,fontSize:10,position:"insideTopRight"}}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Insight bar at bottom */}
      <div style={{marginTop:14,padding:"12px 16px",background:overBudget?`${PALETTE.warning}0D`:`${PALETTE.accent}0D`,borderRadius:10,border:`1px solid ${overBudget?PALETTE.warning:PALETTE.accent}22`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>{overBudget?"⚠️":"✅"}</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:overBudget?PALETTE.warning:PALETTE.accent}}>
            {overBudget
              ? `${fmt(diff)} over your estimated budget this period`
              : `${fmt(Math.abs(diff))} under your estimated budget — great job!`}
          </div>
          <div style={{fontSize:11,color:PALETTE.muted,marginTop:2}}>
            {view==="daily"   && "Daily ideal rate based on your monthly budget"}
            {view==="weekly"  && "Weekly ideal rate based on your monthly budget ÷ 4.33 weeks"}
            {view==="monthly" && "Monthly budget limit set in your profile. Current month shows projection."}
            {view==="yearly"  && "Annual budget = monthly budget × 12"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({expenses,profile,debts,setPage}) {
  const spent  = expenses.reduce((s,e)=>s+Number(e.amount),0);
  const remain = profile.budget - spent;
  const p      = pct(spent,profile.budget);
  const totalDebt = debts.reduce((s,d)=>s+Number(d.balance),0);

  const alerts = useMemo(()=>{
    const a=[];
    if(spent>profile.budget) a.push({id:"over",level:"error",msg:`🚨 You've exceeded your monthly budget by ${fmt(spent-profile.budget)}. Review your spending immediately.`});
    else if(p>=85) a.push({id:"near",level:"warn",msg:`⚠️ You've used ${p}% of your budget. Only ${fmt(remain)} remaining this month.`});
    CAT_KEYS.forEach(cat=>{
      const cs=expenses.filter(e=>e.cat===cat).reduce((s,e)=>s+e.amount,0);
      const lim=profile.limits[cat]||0;
      if(lim>0&&cs>lim) a.push({id:"cat_"+cat,level:"error",msg:`Warning: You exceeded your monthly ${cat} budget by ${fmt(cs-lim)}.`});
    });
    return a;
  },[expenses,profile,spent,remain,p]);

  const catSpend = CAT_KEYS.map(c=>({
    name:c, icon:CATS[c].icon, color:CATS[c].color,
    spent:expenses.filter(e=>e.cat===c).reduce((s,e)=>s+e.amount,0),
    limit:profile.limits[c]||0,
  })).filter(c=>c.spent>0||c.limit>0).sort((a,b)=>b.spent-a.spent);

  let cum=0;
  const trendData=Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(29-i));
    const ds=d.toISOString().split("T")[0];
    cum+=expenses.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0);
    return{date:fmtD(ds),spent:parseFloat(cum.toFixed(2)),budget:profile.budget};
  });

  const pieData=catSpend.filter(c=>c.spent>0).map(c=>({name:c.name,value:c.spent,color:c.color}));

  const hr=new Date().getHours();
  const greet=hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";

  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22,fontWeight:800,color:PALETTE.text}}>{greet} 👋</div>
        <div style={{fontSize:13,color:PALETTE.muted,marginTop:4}}>March 2025 — Here's your financial snapshot</div>
      </div>

      <AlertStrip alerts={alerts}/>

      {/* KPI Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:18}}>
        <StatCard icon="💼" label="Monthly Income"  value={fmt(profile.income)}   color={PALETTE.accent}  sub="This month"/>
        <StatCard icon="🏦" label="Total Savings"   value={fmt(profile.savings)}  color={PALETTE.primary} sub={`${((profile.income-spent)/profile.income*100).toFixed(0)}% save rate`}/>
        <StatCard icon="💸" label="Total Spent"     value={fmt(spent)}             color={spent>profile.budget?PALETTE.warning:PALETTE.amber} sub={`of ${fmt(profile.budget)} budget`}/>
        <StatCard icon={remain>=0?"✅":"🚨"} label="Remaining" value={fmt(Math.abs(remain))} color={remain>=0?PALETTE.accent:PALETTE.warning} sub={remain>=0?"Available":"Over budget!"}/>
        <StatCard icon="💳" label="Total Debt"      value={fmt(totalDebt)}         color={PALETTE.violet}  sub={`${debts.length} accounts`} onClick={()=>setPage("debts")}/>
      </div>

      {/* Budget progress + category bars */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:16}}>
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:16}}>Monthly Budget</div>
          <ProgBar value={spent} max={profile.budget} label="Overall spending" subLabel={`${p}% — ${fmt(spent)} of ${fmt(profile.budget)}`} h={10}/>
          <div style={{height:1,background:PALETTE.border,margin:"16px 0"}}/>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {catSpend.slice(0,6).map(c=><ProgBar key={c.name} value={c.spent} max={c.limit||1} color={c.color} label={`${c.icon} ${c.name}`} subLabel={`${fmt(c.spent)} / ${fmt(c.limit)}`} h={5}/>)}
          </div>
        </div>

        {/* Pie chart */}
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Spending by Category</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value">
                {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{background:PALETTE.card,border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px 14px",marginTop:8}}>
            {pieData.map(c=>(
              <div key={c.name} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:c.color}}/>
                <span style={{fontSize:11,color:PALETTE.muted}}>{c.name}</span>
                <span style={{fontSize:11,fontWeight:700,color:PALETTE.text}}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Estimated vs Actual Line Graph ── */}
      <ExpenditureChart expenses={expenses} profile={profile}/>

      {/* Recent transactions */}
      <div style={{...s.card,padding:22}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15}}>Recent Transactions</div>
          <button onClick={()=>setPage("expenses")} style={{background:"none",border:"none",color:PALETTE.primary,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>View all →</button>
        </div>
        {[...expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(e=>{
          const cm=CATS[e.cat]||CATS.Other;
          return(
            <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${PALETTE.border}`}}>
              <div style={{width:36,height:36,borderRadius:10,background:cm.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cm.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:PALETTE.text}}>{e.note||e.cat}</div>
                <div style={{fontSize:11,color:PALETTE.muted}}>{fmtD(e.date)} · {e.cat}</div>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:PALETTE.text}}>-{fmt(e.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────
function Expenses({expenses,setExpenses,profile}) {
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({date:today(),cat:"Food",amount:"",note:""});
  const [filt,setFilt]=useState({cat:"All",from:"",to:"",min:""});
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  const openAdd=()=>{setEditId(null);setForm({date:today(),cat:"Food",amount:"",note:""});setModal(true);};
  const openEdit=e=>{setEditId(e.id);setForm({date:e.date,cat:e.cat,amount:String(e.amount),note:e.note});setModal(true);};
  const del=id=>setExpenses(es=>es.filter(e=>e.id!==id));
  const save=()=>{
    if(!form.amount||!form.date)return;
    const entry={...form,amount:Number(form.amount)};
    if(editId) setExpenses(es=>es.map(e=>e.id===editId?{...entry,id:editId}:e));
    else setExpenses(es=>[{...entry,id:nid()},...es]);
    setModal(false);
  };

  const filtered=expenses.filter(e=>{
    if(filt.cat!=="All"&&e.cat!==filt.cat)return false;
    if(filt.from&&e.date<filt.from)return false;
    if(filt.to&&e.date>filt.to)return false;
    if(filt.min&&e.amount<Number(filt.min))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));

  const total=filtered.reduce((s,e)=>s+e.amount,0);
  const spent=expenses.reduce((s,e)=>s+e.amount,0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:PALETTE.text}}>Expenses</div>
          <div style={{fontSize:13,color:PALETTE.muted,marginTop:3}}>{filtered.length} transactions · {fmt(total)}</div>
        </div>
        <Btn onClick={openAdd}>+ Add Expense</Btn>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
        <StatCard icon="💰" label="Total Spent"  value={fmt(spent)} color={PALETTE.amber}/>
        <StatCard icon="📋" label="Budget Limit" value={fmt(profile.budget)} color={PALETTE.primary}/>
        <StatCard icon="📊" label="Transactions" value={expenses.length} color={PALETTE.cyan}/>
        <StatCard icon={spent<=profile.budget?"✅":"🚨"} label="Remaining" value={fmt(Math.abs(profile.budget-spent))} color={spent<=profile.budget?PALETTE.accent:PALETTE.warning}/>
      </div>

      {/* Filters */}
      <div style={{...s.card,padding:16,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
          <div>
            <label style={s.lbl}>Category</label>
            <select value={filt.cat} onChange={e=>setFilt(f=>({...f,cat:e.target.value}))} style={s.inp}>
              <option>All</option>{CAT_KEYS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.lbl}>From</label>
            <input type="date" value={filt.from} onChange={e=>setFilt(f=>({...f,from:e.target.value}))} style={s.inp}/>
          </div>
          <div>
            <label style={s.lbl}>To</label>
            <input type="date" value={filt.to} onChange={e=>setFilt(f=>({...f,to:e.target.value}))} style={s.inp}/>
          </div>
          <div>
            <label style={s.lbl}>Min Amount</label>
            <input type="number" placeholder="$0" value={filt.min} onChange={e=>setFilt(f=>({...f,min:e.target.value}))} style={s.inp}/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <Btn variant="ghost" onClick={()=>setFilt({cat:"All",from:"",to:"",min:""})} sx={{width:"100%"}}>Clear</Btn>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{...s.card,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${PALETTE.border}`}}>
                {["Date","Category","Amount","Description",""].map((h,i)=>(
                  <th key={i} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:PALETTE.muted,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={5} style={{textAlign:"center",padding:40,color:PALETTE.muted,fontSize:14}}>No expenses match your filters</td></tr>}
              {filtered.map(e=>{
                const cm=CATS[e.cat]||CATS.Other;
                return(
                  <tr key={e.id} style={{borderBottom:`1px solid ${PALETTE.border}`,transition:"background 0.1s"}}
                    onMouseEnter={ev=>ev.currentTarget.style.background=PALETTE.cardHover}
                    onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                    <td style={{padding:"12px 14px",fontSize:13,color:PALETTE.muted,whiteSpace:"nowrap"}}>{fmtD(e.date)}</td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{fontSize:15}}>{cm.icon}</span>
                        <Chip color={cm.color}>{e.cat}</Chip>
                      </div>
                    </td>
                    <td style={{padding:"12px 14px",fontSize:15,fontWeight:800,color:PALETTE.text}}>{fmt(e.amount)}</td>
                    <td style={{padding:"12px 14px",fontSize:13,color:PALETTE.muted,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note||"—"}</td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <Btn variant="ghost" size="sm" onClick={()=>openEdit(e)}>Edit</Btn>
                        <Btn variant="danger" size="sm" onClick={()=>del(e.id)}>Del</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length>0&&<div style={{padding:"10px 14px",borderTop:`1px solid ${PALETTE.border}`,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:PALETTE.muted}}>{filtered.length} records shown</span>
          <span style={{fontSize:14,fontWeight:800,color:PALETTE.text}}>Total: {fmt(total)}</span>
        </div>}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Edit Expense":"Add Expense"}>
        <div style={{marginBottom:14}}><label style={s.lbl}>Date *</label><input type="date" value={form.date} onChange={up("date")} style={s.inp}/></div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Category *</label><select value={form.cat} onChange={up("cat")} style={s.inp}>{CAT_KEYS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Amount ($) *</label><input type="number" value={form.amount} onChange={up("amount")} placeholder="0.00" style={s.inp} autoFocus/></div>
        <div style={{marginBottom:22}}><label style={s.lbl}>Description</label><input type="text" value={form.note} onChange={up("note")} placeholder="What was this for?" style={s.inp}/></div>
        <div style={{display:"flex",gap:10}}>
          <Btn full onClick={save}>{editId?"Save Changes":"Add Expense"}</Btn>
          <Btn full variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBT TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function DebtTracker({debts,setDebts}) {
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({name:"",type:"credit_card",balance:"",rate:"",minPayment:"",color:"#EF4444"});
  const [extra,setExtra]=useState(200);
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  const COLORS=["#EF4444","#F59E0B","#7C3AED","#06B6D4","#EC4899","#22C55E","#6366F1"];
  const openAdd=()=>{setEditId(null);setForm({name:"",type:"credit_card",balance:"",rate:"",minPayment:"",color:"#EF4444"});setModal(true);};
  const openEdit=d=>{setEditId(d.id);setForm({name:d.name,type:d.type,balance:String(d.balance),rate:String(d.rate),minPayment:String(d.minPayment),color:d.color});setModal(true);};
  const del=id=>setDebts(ds=>ds.filter(d=>d.id!==id));
  const save=()=>{
    if(!form.name||!form.balance)return;
    const entry={...form,balance:Number(form.balance),rate:Number(form.rate),minPayment:Number(form.minPayment)};
    if(editId) setDebts(ds=>ds.map(d=>d.id===editId?{...entry,id:editId}:d));
    else setDebts(ds=>[...ds,{...entry,id:nid()}]);
    setModal(false);
  };

  const totalDebt=debts.reduce((s,d)=>s+d.balance,0);
  const totalMin=debts.reduce((s,d)=>s+d.minPayment,0);
  const monthlyInterest=debts.reduce((s,d)=>s+(d.balance*(d.rate/100/12)),0);

  // Avalanche method — highest rate first
  const avalanche=[...debts].sort((a,b)=>b.rate-a.rate);
  const payoffMonths=(bal,rate,pay)=>{
    if(pay<=0||bal<=0)return 0;
    const r=rate/100/12;
    if(r===0)return Math.ceil(bal/pay);
    if(pay<=r*bal)return Infinity;
    return Math.ceil(-Math.log(1-r*bal/pay)/Math.log(1+r));
  };

  const chartData=debts.map(d=>({name:d.name.length>12?d.name.slice(0,12)+"…":d.name,balance:d.balance,color:d.color}));

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:PALETTE.text}}>Debt Tracker</div>
          <div style={{fontSize:13,color:PALETTE.muted,marginTop:3}}>Track loans, credit cards and payoff strategy</div>
        </div>
        <Btn onClick={openAdd}>+ Add Debt</Btn>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
        <StatCard icon="💸" label="Total Debt"      value={fmt(totalDebt)}          color={PALETTE.warning}/>
        <StatCard icon="📅" label="Min. Monthly"    value={fmt(totalMin)}            color={PALETTE.amber}  sub="Combined minimum payments"/>
        <StatCard icon="📈" label="Monthly Interest" value={fmt(monthlyInterest)}    color={PALETTE.violet} sub="Interest accruing"/>
        <StatCard icon="🏦" label="Accounts"        value={debts.length}             color={PALETTE.cyan}/>
      </div>

      {/* Avalanche calculator */}
      <div style={{...s.card,padding:22,marginBottom:16}}>
        <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:6}}>Avalanche Payoff Calculator</div>
        <div style={{fontSize:12,color:PALETTE.muted,marginBottom:16}}>Pay highest-interest debt first. Extra payment applied to top priority debt.</div>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:PALETTE.muted,whiteSpace:"nowrap"}}>Extra monthly payment:</span>
          <input type="range" min={0} max={1000} step={25} value={extra} onChange={e=>setExtra(Number(e.target.value))} style={{flex:1,minWidth:120,accentColor:PALETTE.primary}}/>
          <span style={{fontSize:16,fontWeight:800,color:PALETTE.primary,minWidth:60}}>{fmt(extra)}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {avalanche.map((d,i)=>{
            const pay=i===0?d.minPayment+extra:d.minPayment;
            const months=payoffMonths(d.balance,d.rate,pay);
            const intCost=months===Infinity?null:((d.rate/100/12)*d.balance*months).toFixed(0);
            return(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:i===0?`${PALETTE.primary}0E`:"rgba(255,255,255,0.03)",borderRadius:12,border:`1px solid ${i===0?PALETTE.primary+"33":PALETTE.border}`}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:PALETTE.text}}>{d.name}</div>
                  <div style={{fontSize:11,color:PALETTE.muted}}>{d.rate}% APR · {fmt(d.balance)} balance</div>
                </div>
                {i===0&&extra>0&&<Chip color={PALETTE.primary}>Priority</Chip>}
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:months===Infinity?PALETTE.warning:d.color}}>
                    {months===Infinity?"∞":months+" mo"}
                  </div>
                  {intCost&&<div style={{fontSize:11,color:PALETTE.muted}}>{fmt(Number(intCost))} interest</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Debt breakdown chart */}
      {debts.length>0&&<div style={{...s.card,padding:22,marginBottom:16}}>
        <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Debt Breakdown</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false}/>
            <XAxis type="number" tick={{fill:PALETTE.muted,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
            <YAxis dataKey="name" type="category" tick={{fill:PALETTE.muted,fontSize:11}} tickLine={false} axisLine={false} width={90}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:PALETTE.card,border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text}}/>
            <Bar dataKey="balance" radius={[0,6,6,0]}>
              {chartData.map((e,i)=><Cell key={i} fill={e.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>}

      {/* Debt cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {debts.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:50,color:PALETTE.muted,fontSize:14}}>No debts tracked yet. Add your first debt account.</div>}
        {debts.map(d=>(
          <div key={d.id} style={{...s.card,padding:22,borderLeft:`3px solid ${d.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{DEBT_TYPES[d.type]||"💸"}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:PALETTE.text}}>{d.name}</div>
                  <Chip color={d.color}>{d.type.replace("_"," ")}</Chip>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="ghost" size="sm" onClick={()=>openEdit(d)}>Edit</Btn>
                <Btn variant="danger" size="sm" onClick={()=>del(d.id)}>Del</Btn>
              </div>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:PALETTE.text,letterSpacing:"-0.03em",marginBottom:6}}>{fmt(d.balance)}</div>
            <div style={{display:"flex",gap:20,fontSize:12,color:PALETTE.muted}}>
              <span><span style={{color:d.color,fontWeight:700}}>{d.rate}%</span> APR</span>
              <span>Min: <span style={{color:PALETTE.text,fontWeight:700}}>{fmt(d.minPayment)}/mo</span></span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Edit Debt":"Add Debt Account"}>
        <div style={{marginBottom:14}}><label style={s.lbl}>Account Name *</label><input type="text" value={form.name} onChange={up("name")} placeholder="e.g. Visa Credit Card" style={s.inp}/></div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Type</label>
          <select value={form.type} onChange={up("type")} style={s.inp}>
            {Object.keys(DEBT_TYPES).map(t=><option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={s.lbl}>Balance ($) *</label><input type="number" value={form.balance} onChange={up("balance")} placeholder="3400" style={s.inp}/></div>
          <div><label style={s.lbl}>Interest Rate (%)</label><input type="number" value={form.rate} onChange={up("rate")} placeholder="19.99" style={s.inp}/></div>
        </div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Min. Monthly Payment ($)</label><input type="number" value={form.minPayment} onChange={up("minPayment")} placeholder="85" style={s.inp}/></div>
        <div style={{marginBottom:22}}>
          <label style={s.lbl}>Color</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?`3px solid #fff`:"3px solid transparent",transition:"border 0.15s"}}/>)}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn full onClick={save}>{editId?"Save Changes":"Add Debt"}</Btn>
          <Btn full variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
function Analytics({expenses,profile,debts}) {
  const [view,setView]=useState("monthly");
  const spent=expenses.reduce((s,e)=>s+e.amount,0);
  const catData=CAT_KEYS.map(c=>({name:c,icon:CATS[c].icon,color:CATS[c].color,spent:expenses.filter(e=>e.cat===c).reduce((s,e)=>s+e.amount,0),limit:profile.limits[c]||0})).filter(c=>c.spent>0);
  const months=["Oct","Nov","Dec","Jan","Feb","Mar"];
  const histData=months.map((m,i)=>({month:m,actual:i===5?spent:Math.round(profile.budget*(0.45+Math.random()*0.7)),budget:profile.budget}));
  const totalDebt=debts.reduce((s,d)=>s+d.balance,0);
  const savRate=((profile.income-spent)/profile.income*100).toFixed(1);

  return(
    <div>
      <div style={{fontSize:20,fontWeight:800,color:PALETTE.text,marginBottom:20}}>Analytics</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
        <StatCard icon="📈" label="Savings Rate" value={savRate+"%"} color={PALETTE.accent} sub="Of monthly income"/>
        <StatCard icon="📊" label="Budget Used"  value={pct(spent,profile.budget)+"%"} color={pct(spent,profile.budget)>85?PALETTE.warning:PALETTE.primary}/>
        <StatCard icon="💳" label="Debt/Income"  value={Math.round(totalDebt/profile.income*100)/100+"x"} color={PALETTE.violet}/>
        <StatCard icon="🎯" label="Categories"   value={catData.length+" active"} color={PALETTE.cyan}/>
      </div>

      {/* Budget vs Actual */}
      <div style={{...s.card,padding:22,marginBottom:16}}>
        <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Budget vs Actual — Last 6 Months</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histData} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border}/>
            <XAxis dataKey="month" tick={{fill:PALETTE.muted,fontSize:11}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fill:PALETTE.muted,fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={42}/>
            <Tooltip contentStyle={{background:PALETTE.card,border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text}} formatter={v=>fmt(v)}/>
            <Legend formatter={v=><span style={{fontSize:11,color:PALETTE.muted}}>{v}</span>}/>
            <Bar dataKey="actual" name="Actual" fill={PALETTE.primary} radius={[5,5,0,0]}/>
            <Bar dataKey="budget" name="Budget" fill={PALETTE.accent+"55"} radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        {/* Category pie */}
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Category Breakdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={catData.map(c=>({name:c.name,value:c.spent,color:c.color}))} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                {catData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)} contentStyle={{background:PALETTE.card,border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {catData.map(c=>(
              <div key={c.name} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                <span style={{flex:1,fontSize:12,color:PALETTE.muted}}>{c.icon} {c.name}</span>
                <span style={{fontSize:12,fontWeight:700,color:PALETTE.text}}>{fmt(c.spent)}</span>
                <span style={{fontSize:11,color:PALETTE.muted}}>{pct(c.spent,spent)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category vs limit */}
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Spent vs Limit</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {catData.map(c=>(
              <div key={c.name}>
                <ProgBar value={c.spent} max={c.limit||c.spent} color={c.color} h={5}
                  label={`${c.icon} ${c.name}`} subLabel={`${fmt(c.spent)} / ${fmt(c.limit||0)}`}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────────
function Notes({notes,setNotes}) {
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({type:"daily",date:today(),title:"",content:""});
  const [filter,setFilter]=useState("all");
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  const TYPES={daily:{icon:"📅",color:PALETTE.primary,label:"Daily"},weekly:{icon:"📆",color:PALETTE.cyan,label:"Weekly"},monthly:{icon:"🗓️",color:PALETTE.amber,label:"Monthly"},yearly:{icon:"🎯",color:PALETTE.accent,label:"Yearly Goal"}};
  const openAdd=()=>{setEditId(null);setForm({type:"daily",date:today(),title:"",content:""});setModal(true);};
  const openEdit=n=>{setEditId(n.id);setForm({type:n.type,date:n.date,title:n.title,content:n.content});setModal(true);};
  const del=id=>setNotes(ns=>ns.filter(n=>n.id!==id));
  const save=()=>{
    if(!form.title||!form.content)return;
    if(editId) setNotes(ns=>ns.map(n=>n.id===editId?{...form,id:editId}:n));
    else setNotes(ns=>[{...form,id:nid()},...ns]);
    setModal(false);
  };

  const filtered=notes.filter(n=>filter==="all"||n.type===filter).sort((a,b)=>b.date.localeCompare(a.date));

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:PALETTE.text}}>Financial Notes</div>
          <div style={{fontSize:13,color:PALETTE.muted,marginTop:3}}>Reflections, goals, and financial thoughts</div>
        </div>
        <Btn onClick={openAdd}>+ New Note</Btn>
      </div>

      {/* Type filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        {["all",...Object.keys(TYPES)].map(t=>{
          const ty=TYPES[t];
          const active=filter===t;
          return(
            <button key={t} onClick={()=>setFilter(t)} style={{padding:"6px 16px",background:active?(ty?.color||PALETTE.primary)+"20":"rgba(255,255,255,0.04)",border:`1px solid ${active?(ty?.color||PALETTE.primary)+"55":PALETTE.border}`,borderRadius:99,color:active?(ty?.color||PALETTE.primary):PALETTE.muted,fontSize:12,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
              {ty?.icon&&<span style={{fontSize:12}}>{ty.icon}</span>}{t==="all"?"All Notes":ty.label}
            </button>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:50,color:PALETTE.muted,fontSize:14}}>No notes yet. Create your first financial note!</div>}
        {filtered.map(n=>{
          const ty=TYPES[n.type]||TYPES.daily;
          return(
            <div key={n.id} style={{...s.card,padding:20,borderLeft:`3px solid ${ty.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <Chip color={ty.color}>{ty.icon} {ty.label}</Chip>
                  <div style={{fontSize:14,fontWeight:700,color:PALETTE.text,marginTop:8}}>{n.title}</div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:8}}>
                  <Btn variant="ghost" size="sm" onClick={()=>openEdit(n)}>Edit</Btn>
                  <Btn variant="danger" size="sm" onClick={()=>del(n.id)}>Del</Btn>
                </div>
              </div>
              <p style={{fontSize:13,color:PALETTE.muted,lineHeight:1.6,margin:0}}>{n.content}</p>
              <div style={{fontSize:11,color:PALETTE.dim,marginTop:10,paddingTop:10,borderTop:`1px solid ${PALETTE.border}`}}>{fmtD(n.date)}</div>
            </div>
          );
        })}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Edit Note":"New Note"}>
        <div style={{marginBottom:14}}><label style={s.lbl}>Note Type</label>
          <select value={form.type} onChange={up("type")} style={s.inp}>
            {Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Date</label><input type="date" value={form.date} onChange={up("date")} style={s.inp}/></div>
        <div style={{marginBottom:14}}><label style={s.lbl}>Title *</label><input type="text" value={form.title} onChange={up("title")} placeholder="e.g. March Financial Goals" style={s.inp}/></div>
        <div style={{marginBottom:22}}><label style={s.lbl}>Content *</label><textarea value={form.content} onChange={up("content")} rows={5} placeholder="Write your financial thoughts, goals, or reflections..." style={{...s.inp,resize:"vertical",lineHeight:1.6}}/></div>
        <div style={{display:"flex",gap:10}}>
          <Btn full onClick={save}>{editId?"Save Changes":"Add Note"}</Btn>
          <Btn full variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS / PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function Settings({profile,setProfile,pushToast}) {
  const [form,setForm]=useState(profile);
  const up=k=>e=>setForm(f=>({...f,[k]:e.target.type==="number"?Number(e.target.value):e.target.value}));
  const upLim=k=>e=>setForm(f=>({...f,limits:{...f.limits,[k]:Number(e.target.value)}}));
  const save=()=>{setProfile(form);pushToast({title:"Profile saved",body:"Your financial profile has been updated.",type:"success"});};

  return(
    <div>
      <div style={{fontSize:20,fontWeight:800,color:PALETTE.text,marginBottom:20}}>Settings & Profile</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:18}}>Financial Profile</div>
          <div style={{marginBottom:14}}><label style={s.lbl}>Your Name</label><input type="text" value={form.name} onChange={up("name")} style={s.inp}/></div>
          <div style={{marginBottom:14}}><label style={s.lbl}>Monthly Income ($)</label><input type="number" value={form.income} onChange={up("income")} style={s.inp}/></div>
          <div style={{marginBottom:14}}><label style={s.lbl}>Current Savings ($)</label><input type="number" value={form.savings} onChange={up("savings")} style={s.inp}/></div>
          <div style={{marginBottom:20}}><label style={s.lbl}>Monthly Budget Limit ($)</label><input type="number" value={form.budget} onChange={up("budget")} style={s.inp}/></div>
          <Btn full onClick={save}>Save Profile</Btn>
        </div>
        <div style={{...s.card,padding:22}}>
          <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:18}}>Category Limits</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:320,overflowY:"auto"}}>
            {CAT_KEYS.map(cat=>{
              const m=CATS[cat];
              return(
                <div key={cat} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16,width:24,textAlign:"center",flexShrink:0}}>{m.icon}</span>
                  <span style={{fontSize:12,color:PALETTE.muted,minWidth:90,fontWeight:600}}>{cat}</span>
                  <input type="number" value={form.limits[cat]||0} onChange={upLim(cat)} style={{...s.inp,fontSize:13}} placeholder="0"/>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:14}}><Btn full onClick={save}>Save Limits</Btn></div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function AIInsights({expenses,profile,debts}) {
  const [loading,setLoading]=useState(false);
  const [insights,setInsights]=useState(null);
  const [apiKey,setApiKey]=useState(LS.get("bg_gkey",""));
  const [showKey,setShowKey]=useState(!LS.get("bg_gkey",""));
  const [keyInput,setKeyInput]=useState("");

  const spent=expenses.reduce((s,e)=>s+e.amount,0);
  const topCat=CAT_KEYS.map(c=>({c,s:expenses.filter(e=>e.cat===c).reduce((t,e)=>t+e.amount,0)})).sort((a,b)=>b.s-a.s)[0];
  const totalDebt=debts.reduce((s,d)=>s+d.balance,0);

  const saveKey=()=>{if(keyInput.trim()){LS.set("bg_gkey",keyInput.trim());setApiKey(keyInput.trim());setShowKey(false);}};

  const generate=async()=>{
    if(!apiKey){setShowKey(true);return;}
    setLoading(true);setInsights(null);
    try{
      const prompt=`You are a CFP financial advisor AI. Analyze this user's finances and give precise, actionable advice.\n\nProfile: ${profile.name}, income $${profile.income}/mo, budget $${profile.budget}/mo, savings $${profile.savings}\nSpent this month: $${spent}\nTop category: ${topCat?.c} ($${topCat?.s})\nTotal debt: $${totalDebt}\nDebts: ${debts.map(d=>`${d.name} $${d.balance} @ ${d.rate}%`).join(", ")||"None"}\n\nRespond ONLY with valid JSON (no backticks):\n{"summary":"2-3 sentence honest assessment","score":75,"insights":[{"title":"","body":"","type":"positive|warning|tip"}],"topAction":"Single most impactful step","prediction":"What will happen next month if nothing changes"}`;
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
      if(!res.ok){setShowKey(true);setLoading(false);return;}
      const data=await res.json();
      const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text||"{}";
      setInsights(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    }catch{
      setInsights({summary:`You've spent ${fmt(spent)} of your ${fmt(profile.budget)} budget this month.`,score:Math.max(20,100-Math.round(spent/profile.budget*60)),insights:[{title:"Budget Status",body:`You've used ${pct(spent,profile.budget)}% of your budget.`,type:spent>profile.budget?"warning":"positive"},{title:"Top Spending",body:`Your biggest category is ${topCat?.c||"N/A"}.`,type:"tip"}],topAction:"Review your top spending category and set stricter limits.",prediction:"Spending patterns suggest you may exceed budget if current trends continue."});
    }
    setLoading(false);
  };

  const TYPE_COL={positive:PALETTE.accent,warning:PALETTE.warning,tip:PALETTE.amber};
  const TYPE_ICN={positive:"✅",warning:"⚠️",tip:"💡"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:PALETTE.text}}>AI Insights</div>
          <div style={{fontSize:13,color:PALETTE.muted,marginTop:3}}>Powered by Google Gemini — free 250 requests/day</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" size="sm" onClick={()=>{setShowKey(s=>!s);setKeyInput(apiKey);}}>{apiKey?"🔑 Change Key":"🔑 Set Key"}</Btn>
          <Btn onClick={generate} disabled={loading}>{loading?"Analyzing…":"✨ Generate"}</Btn>
        </div>
      </div>

      {(showKey||!apiKey)&&(
        <div style={{...s.card,padding:22,marginBottom:18,borderLeft:`3px solid #4285F4`}}>
          <div style={{fontSize:14,fontWeight:700,color:PALETTE.text,marginBottom:4}}>🔑 Connect Google Gemini — Free</div>
          <div style={{fontSize:12,color:PALETTE.muted,marginBottom:12}}>Get your free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:"#4285F4"}}>aistudio.google.com/apikey</a> — no credit card. 250 requests/day free.</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="AIza…" style={{...s.inp,flex:1,minWidth:180}}/>
            <Btn variant="success" size="sm" onClick={saveKey}>Save Key</Btn>
            {showKey&&apiKey&&<Btn variant="ghost" size="sm" onClick={()=>setShowKey(false)}>Cancel</Btn>}
          </div>
        </div>
      )}

      {/* Mini stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
        <StatCard icon="💸" label="Spent"      value={fmt(spent)} color={spent>profile.budget?PALETTE.warning:PALETTE.amber}/>
        <StatCard icon="🎯" label="Budget"     value={fmt(profile.budget)} color={PALETTE.primary}/>
        <StatCard icon="🏦" label="Savings"    value={fmt(profile.savings)} color={PALETTE.accent}/>
        <StatCard icon="💳" label="Total Debt" value={fmt(debts.reduce((s,d)=>s+d.balance,0))} color={PALETTE.violet}/>
      </div>

      {!insights&&!loading&&(
        <div style={{...s.card,padding:"50px 30px",textAlign:"center"}}>
          <div style={{fontSize:50,marginBottom:14,opacity:0.8}}>🤖</div>
          <div style={{fontSize:18,fontWeight:700,color:PALETTE.text,marginBottom:8}}>Ready for Analysis</div>
          <div style={{fontSize:13,color:PALETTE.muted,maxWidth:380,margin:"0 auto 24px",lineHeight:1.6}}>
            Gemini AI will analyze your spending, debts, and budget to give you a personalized financial action plan.
          </div>
          {apiKey&&<Btn onClick={generate}>✨ Generate Insights</Btn>}
        </div>
      )}

      {loading&&<div style={{...s.card,padding:"50px 30px",textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:14,animation:"spin 2s linear infinite",display:"inline-block"}}>✨</div>
        <div style={{fontSize:15,color:PALETTE.muted}}>Analyzing your complete financial picture…</div>
      </div>}

      {insights&&!loading&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Score + summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
            <div style={{...s.card,padding:24}}>
              <div style={{fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Financial Health Score</div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
                  <svg width={80} height={80} viewBox="0 0 80 80">
                    <circle cx={40} cy={40} r={34} fill="none" stroke={PALETTE.border} strokeWidth={8}/>
                    <circle cx={40} cy={40} r={34} fill="none" stroke={insights.score>=70?PALETTE.accent:insights.score>=45?PALETTE.amber:PALETTE.warning} strokeWidth={8} strokeDasharray={`${(insights.score/100)*213.6} ${213.6}`} strokeDashoffset={53.4} strokeLinecap="round"/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:PALETTE.text}}>{insights.score}</div>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:insights.score>=70?PALETTE.accent:insights.score>=45?PALETTE.amber:PALETTE.warning}}>{insights.score>=70?"Good":insights.score>=45?"Fair":"Needs Work"}</div>
                  <div style={{fontSize:12,color:PALETTE.muted,marginTop:4,lineHeight:1.5}}>Based on spending,<br/>savings & debt ratio</div>
                </div>
              </div>
            </div>
            <div style={{...s.card,padding:24,borderLeft:`3px solid ${PALETTE.primary}`}}>
              <div style={{fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>AI Assessment</div>
              <p style={{fontSize:14,color:PALETTE.text,lineHeight:1.7,margin:0}}>{insights.summary}</p>
            </div>
          </div>

          {/* Insights */}
          {insights.insights?.length>0&&<div style={{...s.card,padding:24}}>
            <div style={{fontWeight:700,color:PALETTE.text,fontSize:15,marginBottom:14}}>Key Insights</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {insights.insights.map((ins,i)=>(
                <div key={i} style={{background:(TYPE_COL[ins.type]||PALETTE.primary)+"0D",border:`1px solid ${(TYPE_COL[ins.type]||PALETTE.primary)}33`,borderRadius:10,padding:"13px 16px"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:14}}>{TYPE_ICN[ins.type]||"💡"}</span>
                    <span style={{fontSize:13,fontWeight:700,color:TYPE_COL[ins.type]||PALETTE.primary}}>{ins.title}</span>
                  </div>
                  <p style={{margin:0,fontSize:13,color:PALETTE.muted,lineHeight:1.55}}>{ins.body}</p>
                </div>
              ))}
            </div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
            <div style={{...s.card,padding:22,borderLeft:`3px solid ${PALETTE.accent}`}}>
              <div style={{fontSize:11,fontWeight:700,color:PALETTE.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Top Action</div>
              <p style={{fontSize:14,color:PALETTE.text,lineHeight:1.7,margin:0}}>{insights.topAction}</p>
            </div>
            <div style={{...s.card,padding:22,borderLeft:`3px solid ${PALETTE.amber}`}}>
              <div style={{fontSize:11,fontWeight:700,color:PALETTE.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Next Month Prediction</div>
              <p style={{fontSize:14,color:PALETTE.text,lineHeight:1.7,margin:0}}>{insights.prediction}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS CENTER
// ─────────────────────────────────────────────────────────────────────────────
function NotifCenter({expenses,profile,notifLog,setNotifLog,rules,setRules}) {
  const spent=expenses.reduce((s,e)=>s+e.amount,0);
  const p=pct(spent,profile.budget);
  if (!onboarded) return <OnboardingWizard onComplete={handleOnboardingComplete}/>;

  const unread=notifLog.filter(n=>!n.read).length;
  const markAll=()=>setNotifLog(ns=>ns.map(n=>({...n,read:true})));
  const clear=()=>setNotifLog([]);
  const RULES=[
    {k:"overallExc",  l:"Monthly budget exceeded",  d:"Immediate alert when spending exceeds limit",          sev:"Critical"},
    {k:"at85",        l:"85% of budget reached",    d:"Early warning before hitting the limit",               sev:"Warning"},
    {k:"at70",        l:"70% heads-up",             d:"Gentle notice at 70% usage",                          sev:"Info"},
    {k:"catExc",      l:"Category limit exceeded",  d:"Per-category alert when spending goes over",           sev:"Critical"},
    {k:"catAt80",     l:"Category at 80%",          d:"Per-category early warning",                           sev:"Warning"},
    {k:"largeTxn",    l:"Large expense (>$200)",    d:"Alert when a single transaction exceeds $200",         sev:"Info"},
  ];
  const SEV_COL={Critical:PALETTE.warning,Warning:PALETTE.amber,Info:PALETTE.primary};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:PALETTE.text}}>Notification Center</div>
          <div style={{fontSize:13,color:PALETTE.muted,marginTop:3}}>{notifLog.length} alerts · {unread} unread</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {unread>0&&<Btn variant="ghost" size="sm" onClick={markAll}>Mark all read</Btn>}
          {notifLog.length>0&&<Btn variant="danger" size="sm" onClick={clear}>Clear all</Btn>}
        </div>
      </div>

      {/* Live status */}
      <div style={{...s.card,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,color:PALETTE.text,fontSize:14,marginBottom:12}}>Current Budget Status</div>
        <ProgBar value={spent} max={profile.budget} h={10} label="Overall" subLabel={`${fmt(spent)} of ${fmt(profile.budget)} (${p}%)`}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginTop:14}}>
          {CAT_KEYS.map(cat=>{
            const cs=expenses.filter(e=>e.cat===cat).reduce((s,e)=>s+e.amount,0);
            const cl=profile.limits[cat]||0;
            if(!cs&&!cl)return null;
            const cp=cl>0?pct(cs,cl):0;
            return(
              <div key={cat} style={{background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"10px 12px",border:`1px solid ${cp>=100?PALETTE.warning+"44":PALETTE.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:PALETTE.muted}}>{CATS[cat].icon} {cat}</span>
                  <span style={{fontSize:10,fontWeight:700,color:cp>=100?PALETTE.warning:cp>=80?PALETTE.amber:PALETTE.muted}}>{cp}%</span>
                </div>
                <ProgBar value={cs} max={cl||1} color={CATS[cat].color} h={3}/>
                <div style={{fontSize:10,color:PALETTE.dim,marginTop:4}}>{fmt(cs)} / {fmt(cl)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules */}
      <div style={{...s.card,padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,color:PALETTE.text,fontSize:14,marginBottom:14}}>Alert Rules</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {RULES.map(r=>(
            <div key={r.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:`1px solid ${PALETTE.border}`,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:PALETTE.text}}>{r.l}</div>
                  <div style={{fontSize:11,color:PALETTE.muted,marginTop:2}}>{r.d}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Chip color={SEV_COL[r.sev]}>{r.sev}</Chip>
                <label style={{position:"relative",display:"inline-flex",alignItems:"center",cursor:"pointer"}}>
                  <input type="checkbox" checked={rules[r.k]!==false} onChange={e=>setRules(x=>({...x,[r.k]:e.target.checked}))} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
                  <div style={{width:38,height:21,borderRadius:99,background:rules[r.k]!==false?PALETTE.primary:"rgba(255,255,255,0.1)",transition:"background 0.2s",position:"relative"}}>
                    <div style={{width:15,height:15,borderRadius:"50%",background:"#fff",position:"absolute",top:3,transition:"left 0.2s",left:rules[r.k]!==false?19:3}}/>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log */}
      <div style={{...s.card,overflow:"hidden"}}>
        <div style={{padding:"16px 18px 10px",borderBottom:`1px solid ${PALETTE.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:PALETTE.text}}>Alert History</div>
          {unread>0&&<button onClick={markAll} style={{background:"none",border:"none",color:PALETTE.primary,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>Mark all read</button>}
        </div>
        {notifLog.length===0?(
          <div style={{textAlign:"center",padding:"48px 20px",color:PALETTE.muted}}>
            <div style={{fontSize:36,marginBottom:10,opacity:0.3}}>🔔</div>
            <div style={{fontSize:14,fontWeight:600,color:PALETTE.text,marginBottom:5}}>No alerts yet</div>
            <div style={{fontSize:12}}>Alerts appear here when spending triggers a rule</div>
          </div>
        ):(
          [...notifLog].reverse().map(n=>{
            const col=n.type==="error"?PALETTE.warning:n.type==="warn"?PALETTE.amber:PALETTE.primary;
            return(
              <div key={n.id} onClick={()=>setNotifLog(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x))} style={{display:"flex",gap:12,padding:"13px 18px",borderBottom:`1px solid ${PALETTE.border}`,background:n.read?"transparent":"rgba(99,102,241,0.04)",cursor:"pointer",transition:"background 0.15s"}}>
                <div style={{width:32,height:32,borderRadius:9,background:col+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{n.type==="error"?"🚨":n.type==="warn"?"⚠️":"💡"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:n.read?500:700,color:PALETTE.text}}>{n.title}</span>
                    {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:PALETTE.primary,flexShrink:0}}/>}
                  </div>
                  <div style={{fontSize:12,color:PALETTE.muted,lineHeight:1.45}}>{n.body}</div>
                  <div style={{fontSize:10,color:PALETTE.dim,marginTop:4}}>{n.time}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING WIZARD  — 5-step guided setup
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_ICONS = ["🛡️","✈️","🏠","🚗","💻","📚","💍","🏋️","🎸","🌱","🏖️","💊"];
const GOAL_COLORS = ["#22C55E","#06B6D4","#4F46E5","#F59E0B","#EC4899","#7C3AED"];

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    name:"", income:"", savings:"", budget:"",
    goalName:"Emergency Fund", goalTarget:"5000", goalIcon:"🛡️", goalColor:"#22C55E",
    expDate: today(), expCat:"Food", expAmount:"", expNote:"",
  });
  const up = k => e => setD(x => ({...x, [k]: e.target.value}));

  const STEPS = [
    { title:"Welcome to Budget Guardian 🛡️",  sub:"Your personal finance command center. Let's set you up in 5 quick steps." },
    { title:"Your financial baseline",         sub:"Tell us about your income and savings so we can calculate your health score." },
    { title:"Set your monthly budget",         sub:"This becomes your spending ceiling. We'll alert you when you approach it." },
    { title:"Create your first savings goal",  sub:"Having a goal makes saving 73% more effective on average." },
    { title:"Log your first expense",          sub:"Add any recent expense to get your dashboard started right away." },
  ];

  const canNext = () => {
    if (step === 1) return d.name.trim() && d.income && d.savings;
    if (step === 2) return d.budget;
    if (step === 3) return d.goalName.trim() && d.goalTarget;
    if (step === 4) return true; // expense is optional
    return true;
  };

  const finish = () => {
    const profile = {
      name: d.name.trim() || "My Account",
      income: Number(d.income) || 5000,
      savings: Number(d.savings) || 0,
      budget: Number(d.budget) || 3500,
      limits: {Food:500,Rent:1400,Transport:200,Entertainment:150,Health:100,Shopping:200,Utilities:150,Education:100,Savings:300,Other:100},
    };
    const goal = d.goalName.trim() ? [{
      id: nid(), name: d.goalName.trim(), target: Number(d.goalTarget)||5000,
      saved: 0, icon: d.goalIcon, color: d.goalColor, deadline:"",
    }] : [];
    const expense = d.expAmount ? [{
      id: nid(), date: d.expDate, cat: d.expCat,
      amount: Number(d.expAmount), note: d.expNote.trim(),
    }] : [];
    onComplete({ profile, goal, expense });
  };

  const budgetPct = d.income && d.budget
    ? Math.min(100, Math.round(Number(d.budget)/Number(d.income)*100)) : 0;

  const featurePills = [
    ["📊","Smart dashboard"],["💸","Expense tracking"],
    ["💳","Debt tracker"],["🔔","Budget alerts"],
    ["📈","Analytics"],["✨","AI insights"],
  ];

  return (
    <div style={{minHeight:"100vh",background:PALETTE.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:${PALETTE.dim}}
        input:focus,select:focus{border-color:${PALETTE.primary}!important;outline:none}
        select option{background:${PALETTE.card}}
        button:active{opacity:0.85}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,0.4)}50%{box-shadow:0 0 0 12px rgba(79,70,229,0)}}
      `}</style>

      {/* Background glows */}
      <div style={{position:"fixed",top:"-20%",left:"-20%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-20%",right:"-20%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:500,position:"relative",animation:"fadeUp 0.4s ease"}}>
        {/* Brand mark */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:18,background:`linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px",boxShadow:`0 0 32px ${PALETTE.primary}55`,animation:"pulse 2.5s infinite"}}>🛡️</div>
          <div style={{fontSize:14,color:PALETTE.muted,fontWeight:500}}>Budget Guardian</div>
        </div>

        {/* Card */}
        <div style={{background:PALETTE.card,borderRadius:20,border:`1px solid ${PALETTE.border}`,padding:"30px 28px",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>

          {/* Progress bar */}
          <div style={{display:"flex",gap:5,marginBottom:26}}>
            {STEPS.map((_,i) => (
              <div key={i} style={{flex:1,height:3,borderRadius:99,background:i<step?PALETTE.primary:i===step?PALETTE.primaryLight:"rgba(255,255,255,0.08)",transition:"background 0.3s"}}/>
            ))}
          </div>

          <div style={{fontSize:10,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.08em",marginBottom:6}}>STEP {step+1} OF {STEPS.length}</div>
          <h2 style={{fontSize:20,fontWeight:900,color:PALETTE.text,marginBottom:6,letterSpacing:"-0.02em"}}>{STEPS[step].title}</h2>
          <p style={{fontSize:13,color:PALETTE.muted,lineHeight:1.6,marginBottom:24}}>{STEPS[step].sub}</p>

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {featurePills.map(([ic,txt]) => (
                <div key={txt} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${PALETTE.border}`,borderRadius:12,padding:"13px 14px",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:20}}>{ic}</span>
                  <span style={{fontSize:13,color:PALETTE.muted,fontWeight:500}}>{txt}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 1: Income & Savings ── */}
          {step === 1 && (
            <div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Your Name *</label>
                <input type="text" placeholder="e.g. Alex Johnson" value={d.name} onChange={up("name")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Monthly Income ($) *</label>
                <input type="number" placeholder="5500" value={d.income} onChange={up("income")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Current Total Savings ($) *</label>
                <input type="number" placeholder="8200" value={d.savings} onChange={up("savings")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
                <div style={{fontSize:11,color:PALETTE.muted,marginTop:5}}>Across all savings accounts and cash</div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Budget with live preview ── */}
          {step === 2 && (
            <div>
              <div style={{marginBottom:18}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Monthly Budget Limit ($) *</label>
                <input type="number" placeholder="3500" value={d.budget} onChange={up("budget")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:15,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
              </div>
              {/* Live preview */}
              {d.income && d.budget && (
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"16px 18px",border:`1px solid ${PALETTE.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:PALETTE.muted,marginBottom:12}}>LIVE PREVIEW</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:13,color:PALETTE.muted}}>Budget as % of income</span>
                    <span style={{fontSize:13,fontWeight:800,color:budgetPct>80?PALETTE.warning:budgetPct>60?PALETTE.amber:PALETTE.accent}}>{budgetPct}%</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.07)",borderRadius:99,height:8,overflow:"hidden",marginBottom:10}}>
                    <div style={{width:budgetPct+"%",height:"100%",background:budgetPct>80?PALETTE.warning:budgetPct>60?PALETTE.amber:PALETTE.accent,borderRadius:99,transition:"width 0.5s ease"}}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {[
                      {l:"Income",    v:"$"+Number(d.income).toLocaleString(),  c:PALETTE.accent},
                      {l:"Budget",    v:"$"+Number(d.budget).toLocaleString(),  c:PALETTE.primary},
                      {l:"Remaining", v:"$"+(Number(d.income)-Number(d.budget)).toLocaleString(), c:Number(d.income)>Number(d.budget)?PALETTE.accent:PALETTE.warning},
                    ].map(x=>(
                      <div key={x.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:PALETTE.muted,marginBottom:4}}>{x.l}</div>
                        <div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                  {budgetPct>80&&<div style={{fontSize:11,color:PALETTE.amber,marginTop:10}}>💡 Tip: Keeping budget under 70% of income leaves healthy room for savings.</div>}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: First savings goal ── */}
          {step === 3 && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Icon</label>
                  <select value={d.goalIcon} onChange={up("goalIcon")} style={{width:"100%",padding:"12px 4px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:20,fontFamily:"inherit",textAlign:"center",cursor:"pointer"}}>
                    {GOAL_ICONS.map(ic=><option key={ic}>{ic}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Goal Name *</label>
                  <input type="text" placeholder="Emergency Fund" value={d.goalName} onChange={up("goalName")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Target Amount ($) *</label>
                <input type="number" placeholder="5000" value={d.goalTarget} onChange={up("goalTarget")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Color</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {GOAL_COLORS.map(c=>(
                    <div key={c} onClick={()=>setD(x=>({...x,goalColor:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:d.goalColor===c?"3px solid #fff":"3px solid transparent",transition:"border 0.15s,transform 0.15s",transform:d.goalColor===c?"scale(1.15)":"scale(1)"}}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: First expense ── */}
          {step === 4 && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Date</label>
                  <input type="date" value={d.expDate} onChange={up("expDate")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Category</label>
                  <select value={d.expCat} onChange={up("expCat")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",cursor:"pointer"}}>
                    {CAT_KEYS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Amount ($) <span style={{textTransform:"none",fontWeight:400,color:PALETTE.dim}}>(optional — skip to finish)</span></label>
                <input type="number" placeholder="0.00" value={d.expAmount} onChange={up("expAmount")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:PALETTE.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Description</label>
                <input type="text" placeholder="What was this for?" value={d.expNote} onChange={up("expNote")} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.05)",border:`1px solid ${PALETTE.border}`,borderRadius:10,color:PALETTE.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{display:"flex",gap:10,marginTop:26}}>
            {step > 0 && (
              <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.06)",border:`1px solid ${PALETTE.border}`,borderRadius:11,color:PALETTE.muted,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
            )}
            <button
              onClick={step===STEPS.length-1 ? finish : ()=>setStep(s=>s+1)}
              disabled={!canNext()}
              style={{flex:2,padding:"12px",background:canNext()?`linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})`:"rgba(255,255,255,0.06)",border:"none",borderRadius:11,color:canNext()?"#fff":PALETTE.dim,fontSize:14,fontWeight:800,cursor:canNext()?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:canNext()?`0 6px 20px ${PALETTE.primary}55`:"none",transition:"all 0.2s",letterSpacing:"0.01em"}}>
              {step===STEPS.length-1 ? "🚀 Launch Budget Guardian" : "Continue →"}
            </button>
          </div>

          {/* Skip link on expense step */}
          {step===4&&<div style={{textAlign:"center",marginTop:12}}><button onClick={finish} style={{background:"none",border:"none",color:PALETTE.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Skip and go to dashboard →</button></div>}
        </div>

        <p style={{textAlign:"center",color:PALETTE.dim,fontSize:11,marginTop:16}}>Free · No account required · Data stays on your device</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [onboarded,  setOnboarded]  = useState(()=>LS.get("bg_onboarded", false));
  const [page,       setPage]       = useState("dashboard");
  const [expenses,   setExpenses]   = useState(()=>LS.get("bg_exp",  SEED_EXP));
  const [profile,    setProfile]    = useState(()=>LS.get("bg_prof", SEED_PROFILE));
  const [debts,      setDebts]      = useState(()=>LS.get("bg_dbt",  SEED_DEBTS));
  const [goals,      setGoals]      = useState(()=>LS.get("bg_goals", []));
  const [notes,      setNotes]      = useState(()=>LS.get("bg_nts",  SEED_NOTES));
  const [notifLog,   setNotifLog]   = useState(()=>LS.get("bg_nlog", []));
  const [rules,      setRules]      = useState(()=>LS.get("bg_rules",{overallExc:true,at85:true,at70:false,catExc:true,catAt80:true,largeTxn:true}));
  const [toasts,     setToasts]     = useState([]);
  const [sideOpen,   setSideOpen]   = useState(false);
  const [w,          setW]          = useState(window.innerWidth);
  const fired = useRef(new Set());
  const prevSpent = useRef(null);

  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  // Persist to localStorage
  useEffect(()=>LS.set("bg_exp",  expenses),  [expenses]);
  useEffect(()=>LS.set("bg_prof", profile),   [profile]);
  useEffect(()=>LS.set("bg_dbt",  debts),     [debts]);
  useEffect(()=>LS.set("bg_goals", goals),     [goals]);
  useEffect(()=>LS.set("bg_nts",  notes),     [notes]);
  useEffect(()=>LS.set("bg_nlog", notifLog),  [notifLog]);
  useEffect(()=>LS.set("bg_rules",rules),     [rules]);

  const handleOnboardingComplete = ({profile: p, goal, expense}) => {
    setProfile(p);
    if (goal.length) setGoals(goal);
    if (expense.length) setExpenses(expense);
    LS.set("bg_onboarded", true);
    setOnboarded(true);
  };
  const resetOnboarding = () => {
    LS.set("bg_onboarded", false);
    setOnboarded(false);
  };

  const pushToast=useCallback((t)=>{
    const id=nid();
    setToasts(ts=>[...ts.slice(-3),{...t,id}]);
    setTimeout(()=>setToasts(ts=>ts.filter(x=>x.id!==id)),5500);
  },[]);
  const dismissToast=id=>setToasts(ts=>ts.filter(t=>t.id!==id));

  // Alert engine
  useEffect(()=>{
    const spent=expenses.reduce((s,e)=>s+e.amount,0);
    const p=pct(spent,profile.budget);
    if(prevSpent.current!==null&&spent<prevSpent.current)fired.current.clear();
    prevSpent.current=spent;
    const fire=(id,title,body,type="warn")=>{
      if(fired.current.has(id))return;
      fired.current.add(id);
      const entry={id:nid(),alertId:id,title,body,type,read:false,time:new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})};
      setNotifLog(nl=>[...nl.slice(-49),entry]);
      pushToast({title,body,type});
    };
    if(rules.overallExc&&spent>profile.budget) fire("overallExc","🚨 Budget Exceeded",`You've spent ${fmt(spent)} — ${fmt(spent-profile.budget)} over your ${fmt(profile.budget)} budget.`,"error");
    if(rules.at85&&p>=85&&p<100)              fire("at85","📊 85% Budget Used",`You've used ${p}% of your budget. Only ${fmt(profile.budget-spent)} remaining.`,"warn");
    if(rules.at70&&p>=70&&p<85)              fire("at70","💡 70% Budget Used",`You've used ${p}% of your ${fmt(profile.budget)} budget.`,"success");
    CAT_KEYS.forEach(cat=>{
      const cs=expenses.filter(e=>e.cat===cat).reduce((s,e)=>s+e.amount,0);
      const cl=profile.limits[cat]||0; if(!cl)return;
      const cp=pct(cs,cl);
      if(rules.catExc&&cs>cl)    fire(`catExc_${cat}`,`🚨 ${cat} Over Budget`,`You exceeded your ${cat} budget by ${fmt(cs-cl)}.`,"error");
      else if(rules.catAt80&&cp>=80) fire(`catAt80_${cat}`,`⚠️ ${cat} at ${cp}%`,`${fmt(cs)} of ${fmt(cl)} ${cat} budget used.`,"warn");
    });
    if(rules.largeTxn&&expenses.length>0){
      const lx=expenses[0];
      if(lx?.amount>=200)fire(`lg_${lx.id}`,"💸 Large Expense",`${lx.note||lx.cat}: ${fmt(lx.amount)} logged.`,"warn");
    }
  },[expenses,profile,rules,pushToast]);

  if (!onboarded) return <OnboardingWizard onComplete={handleOnboardingComplete}/>;

  const unread=notifLog.filter(n=>!n.read).length;
  const mob=w<768;

  const NAV=[
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"expenses", icon:"💸",label:"Expenses"},
    {id:"debts",    icon:"💳",label:"Debt Tracker"},
    {id:"analytics",icon:"📈",label:"Analytics"},
    {id:"notes",    icon:"📝",label:"Notes"},
    {id:"ai",       icon:"✨",label:"AI Insights"},
    {id:"notifs",   icon:"🔔",label:"Alerts",badge:unread},
    {id:"settings", icon:"⚙️",label:"Settings"},
  ];
  const MOB_TABS=[
    {id:"dashboard",icon:"📊",label:"Home"},
    {id:"expenses", icon:"💸",label:"Expenses"},
    {id:"debts",    icon:"💳",label:"Debts"},
    {id:"notifs",   icon:"🔔",label:"Alerts",badge:unread},
    {id:"settings", icon:"⚙️",label:"More"},
  ];

  const renderPage=()=>{
    switch(page){
      case "dashboard": return <Dashboard expenses={expenses} profile={profile} debts={debts} setPage={setPage}/>;
      case "expenses":  return <Expenses  expenses={expenses} setExpenses={setExpenses} profile={profile}/>;
      case "debts":     return <DebtTracker debts={debts} setDebts={setDebts}/>;
      case "analytics": return <Analytics expenses={expenses} profile={profile} debts={debts}/>;
      case "notes":     return <Notes     notes={notes} setNotes={setNotes}/>;
      case "ai":        return <AIInsights expenses={expenses} profile={profile} debts={debts}/>;
      case "notifs":    return <NotifCenter expenses={expenses} profile={profile} notifLog={notifLog} setNotifLog={setNotifLog} rules={rules} setRules={setRules}/>;
      case "settings":  return <Settings  profile={profile} setProfile={setProfile} pushToast={pushToast}/>;
      default:          return null;
    }
  };

  const sideBtn=(n)=>{
    const active=page===n.id;
    return(
      <button key={n.id} onClick={()=>{setPage(n.id);setSideOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 10px",marginBottom:2,border:active?`1px solid ${PALETTE.primary}30`:"1px solid transparent",borderRadius:9,background:active?`${PALETTE.primary}14`:"transparent",color:active?PALETTE.text:PALETTE.muted,fontSize:13,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.12s"}}>
        <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>{n.icon}</span>
        <span style={{flex:1}}>{n.label}</span>
        {n.badge>0&&<span style={{background:PALETTE.warning,color:"#fff",borderRadius:99,minWidth:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,flexShrink:0}}>{n.badge>9?"9+":n.badge}</span>}
      </button>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:PALETTE.bg,display:"flex",color:PALETTE.text,fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${PALETTE.border};border-radius:99px}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.5)}
        input::placeholder,textarea::placeholder{color:${PALETTE.dim}}
        select option{background:${PALETTE.card}}
        input:focus,select:focus,textarea:focus{border-color:${PALETTE.primary}!important;outline:none}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
        button:active{opacity:0.85}
      `}</style>

      <Toast toasts={toasts} dismiss={dismissToast}/>

      {/* Desktop sidebar */}
      {!mob&&(
        <aside style={{width:218,background:PALETTE.surface,borderRight:`1px solid ${PALETTE.border}`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:100}}>
          <div style={{padding:"20px 14px 16px",borderBottom:`1px solid ${PALETTE.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🛡️</div>
              <div><div style={{fontSize:13,fontWeight:900,color:PALETTE.text}}>Budget Guardian</div><div style={{fontSize:10,color:PALETTE.dim,marginTop:1}}>Financial command center</div></div>
            </div>
          </div>
          <nav style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>{NAV.map(sideBtn)}</nav>
          <div style={{padding:"10px 12px 16px",borderTop:`1px solid ${PALETTE.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:PALETTE.text}}>{profile.name}</div>
                <div style={{fontSize:10,color:PALETTE.dim,marginTop:2}}>Income: {fmt(profile.income)}/mo</div>
              </div>
              <button onClick={resetOnboarding} title="Restart onboarding" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${PALETTE.border}`,borderRadius:7,width:26,height:26,color:PALETTE.muted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↺</button>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile drawer */}
      {mob&&sideOpen&&(
        <>
          <div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,backdropFilter:"blur(4px)"}}/>
          <aside style={{position:"fixed",left:0,top:0,bottom:0,width:236,background:PALETTE.surface,borderRight:`1px solid ${PALETTE.border}`,zIndex:300,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"18px 14px 14px",borderBottom:`1px solid ${PALETTE.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:30,height:30,borderRadius:8,background:`linear-gradient(135deg,${PALETTE.primary},${PALETTE.primaryLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🛡️</div>
                <div style={{fontSize:13,fontWeight:800,color:PALETTE.text}}>Budget Guardian</div>
              </div>
              <button onClick={()=>setSideOpen(false)} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:7,width:28,height:28,color:PALETTE.muted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <nav style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>{NAV.map(sideBtn)}</nav>
          </aside>
        </>
      )}

      {/* Main */}
      <main style={{flex:1,marginLeft:mob?0:218,minHeight:"100vh",paddingBottom:mob?74:0,overflowX:"hidden"}}>
        {/* Top bar */}
        <div style={{padding:mob?"12px 14px":"11px 22px",background:PALETTE.surface,borderBottom:`1px solid ${PALETTE.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:99}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {mob&&<button onClick={()=>setSideOpen(true)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${PALETTE.border}`,borderRadius:8,padding:"7px 13px",color:PALETTE.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600}}>☰</button>}
            <span style={{fontSize:15,fontWeight:800,color:PALETTE.text}}>{NAV.find(n=>n.id===page)?.label||"Budget Guardian"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setPage("notifs")} style={{position:"relative",background:"rgba(255,255,255,0.06)",border:`1px solid ${PALETTE.border}`,borderRadius:9,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>
              🔔
              {unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:PALETTE.warning,color:"#fff",borderRadius:99,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,border:`2px solid ${PALETTE.surface}`}}>{unread>9?"9+":unread}</span>}
            </button>
          </div>
        </div>

        <div style={{padding:mob?"14px 12px":"24px",maxWidth:1120,margin:"0 auto"}}>
          {renderPage()}
        </div>
      </main>

      {/* Mobile bottom nav */}
      {mob&&(
        <nav style={{position:"fixed",bottom:0,left:0,right:0,background:PALETTE.surface,borderTop:`1px solid ${PALETTE.border}`,display:"flex",zIndex:150,paddingBottom:"env(safe-area-inset-bottom,0)"}}>
          {MOB_TABS.map(n=>{
            const active=page===n.id;
            return(
              <button key={n.id} onClick={()=>{setPage(n.id);setSideOpen(false);}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 4px 10px",border:"none",background:"none",cursor:"pointer",position:"relative",gap:2,fontFamily:"inherit"}}>
                {active&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:PALETTE.primary,borderRadius:"0 0 2px 2px"}}/>}
                <div style={{position:"relative"}}>
                  <span style={{fontSize:22,opacity:active?1:0.4,transition:"opacity 0.15s"}}>{n.icon}</span>
                  {n.badge>0&&<span style={{position:"absolute",top:-4,right:-6,background:PALETTE.warning,color:"#fff",borderRadius:99,minWidth:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900}}>{n.badge}</span>}
                </div>
                <span style={{fontSize:10,fontWeight:active?700:500,color:active?PALETTE.primary:PALETTE.dim}}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
