import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, Utensils, Dumbbell, TrendingUp, Settings,
  Plus, Search, X, Check, Star, Timer, Flame,
  Trash2, ArrowLeft, Zap, ChevronDown
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Utils ─────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 11);
const todayDate = () => new Date().toISOString().split("T")[0];
const round = (v) => Math.round(v || 0);
const numFmt = (v) => Number(v || 0).toLocaleString();

const EX_DB = [
  { id: "bench", name: "Bench Press", cat: "Chest" },
  { id: "incline", name: "Incline Bench Press", cat: "Chest" },
  { id: "decline", name: "Decline Bench Press", cat: "Chest" },
  { id: "cfly", name: "Cable Fly", cat: "Chest" },
  { id: "dbfly", name: "Dumbbell Fly", cat: "Chest" },
  { id: "pushup", name: "Push Up", cat: "Chest" },
  { id: "chestdip", name: "Chest Dip", cat: "Chest" },
  { id: "deadlift", name: "Deadlift", cat: "Back" },
  { id: "brow", name: "Barbell Row", cat: "Back" },
  { id: "pullup", name: "Pull Up", cat: "Back" },
  { id: "latpull", name: "Lat Pulldown", cat: "Back" },
  { id: "cabrow", name: "Seated Cable Row", cat: "Back" },
  { id: "dbrow", name: "Dumbbell Row", cat: "Back" },
  { id: "facepull", name: "Face Pull", cat: "Back" },
  { id: "squat", name: "Back Squat", cat: "Legs" },
  { id: "frontsq", name: "Front Squat", cat: "Legs" },
  { id: "legpress", name: "Leg Press", cat: "Legs" },
  { id: "rdl", name: "Romanian Deadlift", cat: "Legs" },
  { id: "legcurl", name: "Leg Curl", cat: "Legs" },
  { id: "legext", name: "Leg Extension", cat: "Legs" },
  { id: "lunge", name: "Lunge", cat: "Legs" },
  { id: "calf", name: "Calf Raise", cat: "Legs" },
  { id: "ohp", name: "Overhead Press", cat: "Shoulders" },
  { id: "dbohp", name: "Dumbbell OHP", cat: "Shoulders" },
  { id: "latrise", name: "Lateral Raise", cat: "Shoulders" },
  { id: "frontrise", name: "Front Raise", cat: "Shoulders" },
  { id: "reardelt", name: "Rear Delt Fly", cat: "Shoulders" },
  { id: "bbcurl", name: "Barbell Curl", cat: "Arms" },
  { id: "dbcurl", name: "Dumbbell Curl", cat: "Arms" },
  { id: "hammer", name: "Hammer Curl", cat: "Arms" },
  { id: "tpush", name: "Tricep Pushdown", cat: "Arms" },
  { id: "skull", name: "Skull Crusher", cat: "Arms" },
  { id: "tdip", name: "Tricep Dip", cat: "Arms" },
  { id: "plank", name: "Plank", cat: "Core" },
  { id: "crunch", name: "Crunch", cat: "Core" },
  { id: "legraise", name: "Leg Raise", cat: "Core" },
  { id: "rtwist", name: "Russian Twist", cat: "Core" },
  { id: "abwheel", name: "Ab Wheel Rollout", cat: "Core" },
];

const CATS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const DEFAULTS = {
  calorieGoal: 2500, proteinGoal: 160, carbsGoal: 280,
  fatGoal: 75, fiberGoal: 30, restTime: 90, units: "kg"
};

// ── Storage Hook (localStorage) ───────────────────────────────────────────────
function useStorage(key, def) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : def;
    } catch { return def; }
  });

  const save = useCallback((updater) => {
    setVal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [val, save];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dayTotals(entries) {
  return (entries || []).reduce(
    (t, e) => ({ cal: t.cal + (e.calories||0), protein: t.protein + (e.protein||0),
      carbs: t.carbs + (e.carbs||0), fat: t.fat + (e.fat||0), fiber: t.fiber + (e.fiber||0) }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w => w.date));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toISOString().split("T")[0])) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().split("T")[0])) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function calcVolume(exercises) {
  return (exercises || []).reduce((t, ex) =>
    t + (ex.sets || []).filter(s => s.done).reduce((s, set) =>
      s + (parseFloat(set.weight)||0) * (parseInt(set.reps)||0), 0), 0);
}

function getPR(exId, weight, reps, workouts) {
  const w = parseFloat(weight), r = parseInt(reps);
  if (!w || !r) return false;
  const allSets = workouts.flatMap(wk =>
    (wk.exercises||[]).filter(e => e.id === exId).flatMap(e => (e.sets||[]).filter(s => s.done))
  );
  if (!allSets.length) return false;
  const maxW = Math.max(...allSets.map(s => parseFloat(s.weight)||0));
  if (w > maxW) return true;
  const bestR = Math.max(...allSets.filter(s => (parseFloat(s.weight)||0) >= w).map(s => parseInt(s.reps)||0), 0);
  return r > bestR;
}

function getLastSession(exId, workouts) {
  const relevant = (workouts||[]).filter(w => (w.exercises||[]).some(e => e.id === exId));
  if (!relevant.length) return null;
  const last = relevant.reduce((a, b) => a.date > b.date ? a : b);
  return (last.exercises||[]).find(e => e.id === exId)?.sets?.filter(s => s.done) || null;
}

// ── Shared Components ─────────────────────────────────────────────────────────
const H = { fontFamily: "Barlow Condensed, sans-serif" };

function CalRing({ eaten, goal }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(eaten / Math.max(goal, 1), 1);
  const over = eaten > goal;
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="#27272a" strokeWidth="9" />
          <circle cx="64" cy="64" r={r} fill="none"
            stroke={over ? "#f87171" : "#a3e635"} strokeWidth="9"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-bold text-white" style={H}>{round(eaten)}</div>
          <div className="text-xs text-zinc-400">kcal</div>
        </div>
      </div>
      <div className="text-xs mt-0.5">
        {over
          ? <span className="text-red-400">+{round(eaten - goal)} over goal</span>
          : <span className="text-zinc-400">{round(goal - eaten)} remaining</span>}
      </div>
    </div>
  );
}

function MBar({ label, val, goal, color }) {
  const pct = Math.min((val / Math.max(goal, 1)) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{round(val)}<span className="text-zinc-500">/{goal}g</span></span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <button onClick={onClose} className="text-zinc-400 p-1"><ArrowLeft size={20} /></button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ settings, foodLogs, workouts }) {
  const entries = foodLogs[todayDate()] || [];
  const totals = dayTotals(entries);
  const streak = calcStreak(workouts);
  const todayW = workouts.find(w => w.date === todayDate());
  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-4 pt-12 pb-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-zinc-400 text-sm">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="text-3xl font-bold leading-tight" style={H}>{greeting}, Dave 👋</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-orange-500" style={{ background: "rgba(249,115,22,0.1)" }}>
            <Flame size={16} className="text-orange-400" />
            <span className="text-orange-400 font-bold text-base" style={H}>{streak}</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-zinc-200">Today's Nutrition</span>
          <span className="text-xs text-zinc-500">Goal: {settings.calorieGoal} kcal</span>
        </div>
        <div className="flex items-center gap-5">
          <CalRing eaten={totals.cal} goal={settings.calorieGoal} />
          <div className="flex-1 space-y-3">
            <MBar label="Protein" val={totals.protein} goal={settings.proteinGoal} color="bg-sky-400" />
            <MBar label="Carbs" val={totals.carbs} goal={settings.carbsGoal} color="bg-amber-400" />
            <MBar label="Fat" val={totals.fat} goal={settings.fatGoal} color="bg-rose-400" />
            <MBar label="Fiber" val={totals.fiber} goal={settings.fiberGoal} color="bg-emerald-400" />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="text-sm font-semibold text-zinc-200 mb-2">Today's Workout</div>
        {todayW ? (
          <div>
            <div className="font-semibold text-white">{todayW.name}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {(todayW.exercises||[]).length} exercises · {numFmt(round(calcVolume(todayW.exercises)))} {settings.units} total volume
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(todayW.exercises||[]).map((ex,i) => (
                <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">No workout logged today. Get after it! 💪</div>
        )}
      </div>
    </div>
  );
}

// ── Food Search Modal ─────────────────────────────────────────────────────────
function FoodSearchModal({ meal, onAdd, onClose, customFoods }) {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState("100");
  const [error, setError] = useState("");

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults([]);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&fields=product_name,brands,nutriments,code`
      );
      const data = await res.json();
      const valid = (data.products||[]).filter(p =>
        p.product_name && p.nutriments?.["energy-kcal_100g"] != null
      );
      setResults(valid);
      if (!valid.length) setError("No results found. Try a different search.");
    } catch { setError("Search failed. Check your connection."); }
    setLoading(false);
  };

  const confirmAdd = () => {
    const g = parseFloat(grams) || 100;
    const ratio = g / 100;
    const n = selected.nutriments || {};
    onAdd({
      meal,
      name: selected.product_name || selected.name,
      brand: selected.brands || selected.brand || "",
      calories: ((n["energy-kcal_100g"] ?? n.calories) || 0) * ratio,
      protein: ((n.proteins_100g ?? n.protein) || 0) * ratio,
      carbs: ((n.carbohydrates_100g ?? n.carbs) || 0) * ratio,
      fat: ((n.fat_100g ?? n.fat) || 0) * ratio,
      fiber: ((n.fiber_100g ?? n.fiber) || 0) * ratio,
      grams: g,
    });
    onClose();
  };

  if (selected) {
    const g = parseFloat(grams) || 100;
    const ratio = g / 100;
    const n = selected.nutriments || {};
    const get = (a, b) => ((n[a] ?? n[b]) || 0) * ratio;
    return (
      <Modal title="Confirm Food" onClose={() => setSelected(null)}>
        <div className="p-4">
          <div className="text-lg font-bold text-white">{selected.product_name || selected.name}</div>
          {(selected.brands||selected.brand) && <div className="text-sm text-zinc-400 mb-4">{selected.brands||selected.brand}</div>}
          <div className="mb-5">
            <label className="text-xs text-zinc-400 block mb-1">Amount (grams)</label>
            <input type="number" value={grams} onChange={e => setGrams(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center font-bold"
              style={H}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              ["Calories", round(get("energy-kcal_100g","calories")), "kcal", "text-lime-400"],
              ["Protein", round(get("proteins_100g","protein")), "g", "text-sky-400"],
              ["Carbs", round(get("carbohydrates_100g","carbs")), "g", "text-amber-400"],
              ["Fat", round(get("fat_100g","fat")), "g", "text-rose-400"],
              ["Fiber", round(get("fiber_100g","fiber")), "g", "text-emerald-400"],
            ].map(([label, val, unit, cls]) => (
              <div key={label} className="bg-zinc-800 rounded-xl p-3">
                <div className={`text-2xl font-bold ${cls}`} style={H}>{val}<span className="text-sm ml-0.5">{unit}</span></div>
                <div className="text-xs text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
          <button onClick={confirmAdd} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3.5 text-base" style={H}>
            Add to {meal}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Add to ${meal}`} onClose={onClose}>
      <div className="flex border-b border-zinc-800">
        {[["search","Food Database"],["custom","My Foods"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold ${tab===t ? "text-lime-400 border-b-2 border-lime-400" : "text-zinc-500"}`}>{l}
          </button>
        ))}
      </div>
      {tab === "search" && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Search foods (e.g. chicken breast)…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm"
            />
            <button onClick={doSearch} className="bg-lime-400 text-zinc-950 rounded-xl px-4 font-bold">
              <Search size={18} />
            </button>
          </div>
          {loading && <div className="text-center text-zinc-400 py-12 text-sm">Searching Open Food Facts…</div>}
          {error && <div className="text-zinc-500 text-sm text-center py-8">{error}</div>}
          {results.map((p, i) => (
            <button key={p.code||i} onClick={() => setSelected(p)}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
              <div className="flex-1 mr-3">
                <div className="font-medium text-sm text-white leading-tight">{p.product_name}</div>
                {p.brands && <div className="text-xs text-zinc-400 mt-0.5">{p.brands}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lime-400 font-bold" style={H}>{round(p.nutriments["energy-kcal_100g"])}</div>
                <div className="text-xs text-zinc-500">kcal/100g</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {tab === "custom" && (
        <div className="p-4">
          {!customFoods.length
            ? <div className="text-center text-zinc-500 py-12 text-sm">No custom foods yet.<br/>Add some via the + Custom Food button.</div>
            : customFoods.map(f => (
              <button key={f.id} onClick={() => setSelected({
                product_name: f.name, brands: f.brand,
                nutriments: { "energy-kcal_100g": f.calories, proteins_100g: f.protein,
                  carbohydrates_100g: f.carbs, fat_100g: f.fat, fiber_100g: f.fiber }
              })} className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm text-white">{f.name}</div>
                  <div className="text-xs text-zinc-400">{f.brand||"Custom"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lime-400 font-bold" style={H}>{f.calories}</div>
                  <div className="text-xs text-zinc-500">kcal/100g</div>
                </div>
              </button>
            ))
          }
        </div>
      )}
    </Modal>
  );
}

function AddCustomFoodModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name:"", brand:"", calories:"", protein:"", carbs:"", fat:"", fiber:"" });
  const s = (k,v) => setForm(p => ({...p,[k]:v}));
  const submit = () => {
    if (!form.name || !form.calories) return;
    onAdd({ id:uid(), name:form.name, brand:form.brand,
      calories:parseFloat(form.calories)||0, protein:parseFloat(form.protein)||0,
      carbs:parseFloat(form.carbs)||0, fat:parseFloat(form.fat)||0, fiber:parseFloat(form.fiber)||0
    });
    onClose();
  };
  const fields = [
    ["Food name *","name","text"],["Brand (optional)","brand","text"],
    ["Calories (kcal) *","calories","number"],["Protein (g)","protein","number"],
    ["Carbs (g)","carbs","number"],["Fat (g)","fat","number"],["Fiber (g)","fiber","number"],
  ];
  return (
    <Modal title="New Custom Food" onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="bg-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400">All values per 100g of food</div>
        {fields.map(([label,key,type]) => (
          <div key={key}>
            <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
            <input type={type} value={form[key]} onChange={e => s(key,e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"
            />
          </div>
        ))}
        <button onClick={submit} disabled={!form.name||!form.calories}
          className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5 mt-1"
          style={H}>Save Food</button>
      </div>
    </Modal>
  );
}

// ── Nutrition Page ────────────────────────────────────────────────────────────
function NutritionPage({ settings, foodLogs, addFoodLog, removeFoodLog, customFoods, saveCustomFoods }) {
  const [offset, setOffset] = useState(0);
  const [addModal, setAddModal] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const d = new Date(); d.setDate(d.getDate() + offset);
  const dateStr = d.toISOString().split("T")[0];
  const label = offset===0 ? "Today" : offset===-1 ? "Yesterday" : d.toLocaleDateString("en-US",{month:"short",day:"numeric"});

  const entries = foodLogs[dateStr] || [];
  const totals = dayTotals(entries);

  return (
    <div className="pt-12 pb-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={H}>Nutrition</h1>
        <button onClick={() => setShowCustomModal(true)} className="text-lime-400 text-xs font-semibold border border-lime-400 px-3 py-1.5 rounded-full" style={{borderOpacity:0.4}}>
          + Custom Food
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 mb-4">
        <button onClick={() => setOffset(o => o-1)} className="text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center">‹</button>
        <span className="text-sm font-semibold w-28 text-center">{label}</span>
        <button onClick={() => setOffset(o => Math.min(o+1, 0))} disabled={offset>=0}
          className={`text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center ${offset>=0?"opacity-20":""}`}>›</button>
      </div>

      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-around">
          {[["Cal",round(totals.cal),"kcal","text-lime-400"],["Protein",round(totals.protein),"g","text-sky-400"],
            ["Carbs",round(totals.carbs),"g","text-amber-400"],["Fat",round(totals.fat),"g","text-rose-400"],
            ["Fiber",round(totals.fiber),"g","text-emerald-400"]].map(([l,v,u,c]) => (
            <div key={l} className="text-center">
              <div className={`text-xl font-bold ${c}`} style={H}>{v}<span className="text-xs ml-0.5 font-normal">{u}</span></div>
              <div className="text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {MEALS.map(meal => {
        const me = entries.filter(e => e.meal === meal);
        const mCal = round(me.reduce((s,e) => s+e.calories,0));
        return (
          <div key={meal} className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{meal}</span>
                {mCal > 0 && <span className="text-zinc-500 text-xs">{mCal} kcal</span>}
              </div>
              <button onClick={() => setAddModal({meal})} className="flex items-center gap-1 text-lime-400 text-xs font-semibold">
                <Plus size={14}/> Add
              </button>
            </div>
            {me.length === 0
              ? <div className="text-zinc-700 text-xs py-1">Nothing logged</div>
              : me.map(entry => (
                <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 mb-1.5 flex justify-between items-center">
                  <div className="flex-1 mr-2">
                    <div className="text-sm font-medium text-white leading-tight">{entry.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{entry.grams}g · P:{round(entry.protein)} C:{round(entry.carbs)} F:{round(entry.fat)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lime-400 font-bold text-sm" style={H}>{round(entry.calories)}</span>
                    <button onClick={() => removeFoodLog(dateStr, entry.id)} className="text-zinc-700 hover:text-red-400 p-0.5">
                      <X size={13}/>
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        );
      })}

      {addModal && (
        <FoodSearchModal meal={addModal.meal}
          onAdd={e => addFoodLog(dateStr, e)} onClose={() => setAddModal(null)} customFoods={customFoods}
        />
      )}
      {showCustomModal && (
        <AddCustomFoodModal onAdd={f => saveCustomFoods(p => [...p, f])} onClose={() => setShowCustomModal(false)} />
      )}
    </div>
  );
}

// ── Exercise Picker ───────────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = EX_DB.filter(e =>
    (cat==="All"||e.cat===cat) && e.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Modal title="Add Exercise" onClose={onClose}>
      <div className="p-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises…" autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm mb-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {["All",...CATS].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border flex-shrink-0
                ${cat===c ? "bg-lime-400 text-zinc-950 border-lime-400" : "text-zinc-400 border-zinc-700"}`}>{c}
            </button>
          ))}
        </div>
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => { onSelect(ex); onClose(); }}
            className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 mb-2 flex justify-between items-center">
            <span className="font-medium text-sm text-white">{ex.name}</span>
            <span className="text-xs text-zinc-500 bg-zinc-700 px-2.5 py-1 rounded-full">{ex.cat}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ── Active Workout ────────────────────────────────────────────────────────────
function ActiveWorkout({ workout, setWorkout, onFinish, settings, workouts }) {
  const [showPicker, setShowPicker] = useState(false);
  const [rest, setRest] = useState({ active: false, remaining: 0 });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (rest.active && rest.remaining > 0) {
      timerRef.current = setTimeout(() => setRest(p => ({...p, remaining: p.remaining-1})), 1000);
    } else if (rest.active && rest.remaining === 0) {
      setRest(p => ({...p, active: false}));
    }
    return () => clearTimeout(timerRef.current);
  }, [rest.active, rest.remaining]);

  const addExercise = (ex) => setWorkout(w => ({
    ...w, exercises: [...w.exercises, { id: ex.id, name: ex.name, cat: ex.cat, sets: [{ weight:"", reps:"", done:false }] }]
  }));

  const addSet = (ei) => setWorkout(w => ({
    ...w, exercises: w.exercises.map((ex,i) => {
      if (i !== ei) return ex;
      const last = ex.sets[ex.sets.length-1] || {};
      return { ...ex, sets: [...ex.sets, { weight: last.weight||"", reps: last.reps||"", done:false }] };
    })
  }));

  const updateSet = (ei, si, field, val) => setWorkout(w => ({
    ...w, exercises: w.exercises.map((ex,i) => i!==ei ? ex : {
      ...ex, sets: ex.sets.map((s,j) => j!==si ? s : {...s,[field]:val})
    })
  }));

  const toggleDone = (ei, si) => {
    const wasNotDone = !workout.exercises[ei].sets[si].done;
    setWorkout(w => ({
      ...w, exercises: w.exercises.map((ex,i) => i!==ei ? ex : {
        ...ex, sets: ex.sets.map((s,j) => j!==si ? s : {...s, done: !s.done})
      })
    }));
    if (wasNotDone) setRest({ active:true, remaining: settings.restTime });
  };

  const fmtT = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const volume = calcVolume(workout.exercises);
  const doneCount = (workout.exercises||[]).reduce((t,ex)=>t+(ex.sets||[]).filter(s=>s.done).length,0);

  return (
    <div className="pb-4 min-h-screen">
      <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-4 pt-10 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 mr-3">
            <input value={workout.name} onChange={e => setWorkout(w=>({...w,name:e.target.value}))}
              className="text-xl font-bold bg-transparent text-white outline-none w-full" style={H}
            />
            <div className="text-xs text-zinc-400">{fmtT(elapsed)} · {numFmt(round(volume))} {settings.units} · {doneCount} sets done</div>
          </div>
          <button onClick={onFinish} className="bg-lime-400 text-zinc-950 font-bold text-sm px-4 py-2 rounded-full flex-shrink-0" style={H}>
            Finish
          </button>
        </div>
      </div>

      {rest.active && (
        <div className="mx-4 mt-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={15} className="text-lime-400"/>
            <span className="text-xs text-zinc-300 font-medium">Rest</span>
          </div>
          <div className="text-2xl font-bold text-lime-400" style={H}>{fmtT(rest.remaining)}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRest(p=>({...p, remaining:Math.max(0,p.remaining-15)}))} className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">−15</button>
            <button onClick={() => setRest(p=>({...p, remaining:p.remaining+15}))} className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">+15</button>
            <button onClick={() => setRest({active:false,remaining:0})} className="text-xs text-zinc-500 ml-1">Skip</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-3 space-y-3">
        {workout.exercises.map((ex, ei) => {
          const prev = getLastSession(ex.id, workouts);
          return (
            <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-white" style={{...H, fontSize:"18px"}}>{ex.name}</div>
                  <div className="text-xs text-zinc-500">{ex.cat}</div>
                </div>
                <button onClick={() => setWorkout(w=>({...w, exercises:w.exercises.filter((_,i)=>i!==ei)}))}
                  className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14}/></button>
              </div>

              {prev && prev.length > 0 && (
                <div className="text-xs text-zinc-500 bg-zinc-800 rounded-lg px-3 py-2 mb-3">
                  <span className="text-zinc-400 font-medium">Previous: </span>
                  {prev.map((s,i) => `${s.weight||"?"}×${s.reps||"?"}`).join("  ·  ")}
                </div>
              )}

              <div className="grid grid-cols-12 gap-1 text-xs text-zinc-600 mb-1.5 px-1">
                <div className="col-span-1">#</div>
                <div className="col-span-4 text-center">{settings.units}</div>
                <div className="col-span-4 text-center">Reps</div>
                <div className="col-span-3 text-center">✓</div>
              </div>

              {ex.sets.map((s, si) => {
                const pr = s.done && getPR(ex.id, s.weight, s.reps, workouts);
                return (
                  <div key={si} className={`grid grid-cols-12 gap-1.5 mb-1.5 items-center ${s.done?"opacity-60":""}`}>
                    <div className="col-span-1 flex items-center gap-0.5">
                      <span className="text-xs text-zinc-500">{si+1}</span>
                      {pr && <Star size={9} className="text-yellow-400" style={{fill:"#facc15"}}/>}
                    </div>
                    <input type="number" value={s.weight} onChange={e => updateSet(ei,si,"weight",e.target.value)}
                      placeholder="0"
                      className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"
                    />
                    <input type="number" value={s.reps} onChange={e => updateSet(ei,si,"reps",e.target.value)}
                      placeholder="0"
                      className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"
                    />
                    <div className="col-span-3 flex justify-center gap-1.5">
                      <button onClick={() => toggleDone(ei,si)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border
                          ${s.done ? "bg-lime-400 border-lime-400 text-zinc-950":"border-zinc-600 text-zinc-600"}`}>
                        <Check size={15}/>
                      </button>
                      {ex.sets.length > 1 && (
                        <button onClick={() => setWorkout(w=>({...w, exercises:w.exercises.map((e,i)=>i!==ei?e:{
                          ...e, sets:e.sets.filter((_,j)=>j!==si)
                        })}))} className="text-zinc-700 hover:text-red-400">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => addSet(ei)}
                className="w-full text-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-lg py-2 mt-2">
                + Add Set
              </button>
            </div>
          );
        })}

        <button onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-zinc-800 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors" style={H}>
          + Add Exercise
        </button>
      </div>

      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

// ── Workout Page ──────────────────────────────────────────────────────────────
function WorkoutPage({ settings, workouts, addWorkout, activeWorkout, setActiveWorkout }) {
  const streak = calcStreak(workouts);

  const startWorkout = () => setActiveWorkout({
    id: uid(),
    name: `Workout – ${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
    date: todayDate(),
    startTime: Date.now(),
    exercises: []
  });

  if (activeWorkout) {
    return (
      <ActiveWorkout workout={activeWorkout} setWorkout={setActiveWorkout}
        onFinish={() => { addWorkout({ ...activeWorkout, endTime: Date.now() }); setActiveWorkout(null); }}
        settings={settings} workouts={workouts} />
    );
  }

  return (
    <div className="pt-12 pb-4 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={H}>Workout</h1>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500" style={{background:"rgba(249,115,22,0.1)"}}>
            <Flame size={14} className="text-orange-400"/>
            <span className="text-orange-400 font-bold text-sm" style={H}>{streak} day streak</span>
          </div>
        )}
      </div>

      <button onClick={startWorkout}
        className="w-full bg-lime-400 text-zinc-950 font-bold rounded-2xl py-4 mb-6 flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"
        style={H}>
        <Zap size={20}/> Start Workout
      </button>

      <div className="text-sm font-semibold text-zinc-400 mb-3">Recent Workouts</div>
      {!workouts.length
        ? <div className="text-zinc-600 text-sm text-center py-12">No workouts yet. Start your first session!</div>
        : workouts.slice(0,15).map(w => {
          const vol = calcVolume(w.exercises||[]);
          const dur = w.endTime ? Math.round((w.endTime-w.startTime)/60000) : 0;
          return (
            <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-2">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-sm text-white">{w.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(w.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    {dur>0 && ` · ${dur} min`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-lime-400" style={H}>{numFmt(round(vol))} {settings.units}</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(w.exercises||[]).map((ex,i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
                ))}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ── Progress Page ─────────────────────────────────────────────────────────────
function ProgressPage({ workouts, settings }) {
  const [selEx, setSelEx] = useState(EX_DB[0]?.id || "");
  const chartData = workouts
    .filter(w => (w.exercises||[]).some(e => e.id === selEx))
    .slice(0, 20).reverse()
    .map(w => {
      const ex = (w.exercises||[]).find(e => e.id === selEx);
      const done = (ex?.sets||[]).filter(s => s.done);
      const maxW = done.length ? Math.max(...done.map(s => parseFloat(s.weight)||0)) : 0;
      const vol = round(done.reduce((s,set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0));
      return { date: w.date.slice(5), maxW, vol };
    });

  const streak = calcStreak(workouts);
  const totalVol = workouts.reduce((t,w) => t + calcVolume(w.exercises||[]), 0);

  return (
    <div className="pt-12 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Progress</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[["Streak",streak,"days","text-orange-400"],["Sessions",workouts.length,"total","text-lime-400"],
          ["Volume",(totalVol/1000).toFixed(1),"tonnes","text-sky-400"]].map(([l,v,u,c]) => (
          <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-center">
            <div className={`text-3xl font-bold ${c}`} style={H}>{v}</div>
            <div className="text-xs text-zinc-500">{u}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="text-sm font-semibold text-zinc-200 mb-3">Exercise Trend</div>
        <div className="relative mb-4">
          <select value={selEx} onChange={e => setSelEx(e.target.value)}
            className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm pr-10">
            {CATS.map(c => (
              <optgroup key={c} label={c}>
                {EX_DB.filter(e=>e.cat===c).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-3.5 text-zinc-500 pointer-events-none"/>
        </div>
        {chartData.length < 2
          ? <div className="text-center text-zinc-500 py-12 text-sm">Log this exercise in at least 2 sessions to see your trend.</div>
          : (
            <>
              <div className="text-xs text-zinc-400 mb-2 font-medium">Max Weight ({settings.units})</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/>
                  <YAxis tick={{fill:"#52525b",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                  <Line type="monotone" dataKey="maxW" name="Max Weight" stroke="#a3e635" strokeWidth={2.5} dot={{fill:"#a3e635",r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-zinc-400 mt-5 mb-2 font-medium">Session Volume ({settings.units})</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/>
                  <YAxis tick={{fill:"#52525b",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                  <Line type="monotone" dataKey="vol" name="Volume" stroke="#38bdf8" strokeWidth={2.5} dot={{fill:"#38bdf8",r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </>
          )
        }
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({ settings, saveSettings }) {
  const upd = (k,v) => saveSettings(p => ({...p,[k]:isNaN(parseFloat(v))?v:parseFloat(v)}));
  const fields = [
    ["Calorie Goal","calorieGoal","kcal / day"],["Protein Goal","proteinGoal","g / day"],
    ["Carbs Goal","carbsGoal","g / day"],["Fat Goal","fatGoal","g / day"],
    ["Fiber Goal","fiberGoal","g / day"],["Default Rest Time","restTime","seconds"],
  ];
  return (
    <div className="pt-12 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Settings</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Daily Goals</div>
        {fields.map(([label,key,unit]) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
            <div>
              <div className="text-sm text-white font-medium">{label}</div>
              <div className="text-xs text-zinc-500">{unit}</div>
            </div>
            <input type="number" value={settings[key]} onChange={e => upd(key, e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-24 text-center font-bold"
              style={H}
            />
          </div>
        ))}
        <div className="flex items-center justify-between pt-3">
          <div>
            <div className="text-sm text-white font-medium">Weight Units</div>
            <div className="text-xs text-zinc-500">For exercises</div>
          </div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {["kg","lbs"].map(u => (
              <button key={u} onClick={() => upd("units",u)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${settings.units===u?"bg-lime-400 text-zinc-950":"text-zinc-400"}`}
                style={H}>{u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="font-semibold text-white mb-1">FitTrack v1</div>
        <div className="text-sm text-zinc-400">Your data is stored in your browser. Recipes, body weight tracking, and cross-device sync are coming in v2.</div>
      </div>
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ page, setPage, hasActiveWorkout }) {
  const tabs = [
    { id:"dashboard", icon:Home, label:"Home" },
    { id:"nutrition", icon:Utensils, label:"Food" },
    { id:"workout", icon:Dumbbell, label:"Workout" },
    { id:"progress", icon:TrendingUp, label:"Progress" },
    { id:"settings", icon:Settings, label:"Settings" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-zinc-900 border-t border-zinc-800 flex justify-around py-1.5 z-40">
      {tabs.map(({ id, icon:Icon, label }) => (
        <button key={id} onClick={() => setPage(id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative ${page===id ? "text-lime-400" : "text-zinc-500"}`}>
          <Icon size={21} strokeWidth={page===id ? 2.5 : 1.5}/>
          <span className="text-xs">{label}</span>
          {id === "workout" && hasActiveWorkout && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-lime-400 rounded-full"/>
          )}
        </button>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const [page, setPage] = useState("dashboard");
  const [settings, saveSettings] = useStorage("ft_settings", DEFAULTS);
  const [workouts, saveWorkouts] = useStorage("ft_workouts", []);
  const [customFoods, saveCustomFoods] = useStorage("ft_custom_foods", []);
  const [foodLogs, saveFoodLogs] = useStorage("ft_food_logs", {});
  const [activeWorkout, setActiveWorkout] = useState(null);

  const addFoodLog = (date, entry) =>
    saveFoodLogs(p => ({ ...p, [date]: [...(p[date]||[]), { ...entry, id:uid() }] }));
  const removeFoodLog = (date, id) =>
    saveFoodLogs(p => ({ ...p, [date]: (p[date]||[]).filter(e => e.id !== id) }));
  const addWorkout = (w) => saveWorkouts(p => [w, ...p]);

  const shared = { settings, saveSettings, workouts, addWorkout, foodLogs,
    addFoodLog, removeFoodLog, customFoods, saveCustomFoods, activeWorkout, setActiveWorkout };

  return (
    <div className="bg-zinc-950 min-h-screen text-white pb-20 max-w-lg mx-auto relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {page === "dashboard" && <Dashboard {...shared} />}
      {page === "nutrition" && <NutritionPage {...shared} />}
      {page === "workout"   && <WorkoutPage {...shared} />}
      {page === "progress"  && <ProgressPage {...shared} />}
      {page === "settings"  && <SettingsPage {...shared} />}
      <BottomNav page={page} setPage={setPage} hasActiveWorkout={!!activeWorkout} />
    </div>
  );
}
