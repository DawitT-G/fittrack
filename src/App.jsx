import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, Utensils, Dumbbell, TrendingUp, Settings,
  Plus, Search, X, Check, Star, Timer, Flame, Trash2,
  ArrowLeft, Zap, ChevronDown, Camera, Scale, Ruler,
  Image as ImageIcon, Edit2, Eye, BookOpen, BarChart2,
  ChevronRight, Activity, Menu
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 11);
const todayDate = () => new Date().toISOString().split("T")[0];
const round = (v) => Math.round(v || 0);
const numFmt = (v) => Number(v || 0).toLocaleString();
const H = { fontFamily: "Barlow Condensed, sans-serif" };

const EX_DB = [
  { id:"bench",name:"Bench Press",cat:"Chest" },{ id:"incline",name:"Incline Bench Press",cat:"Chest" },
  { id:"decline",name:"Decline Bench Press",cat:"Chest" },{ id:"cfly",name:"Cable Fly",cat:"Chest" },
  { id:"dbfly",name:"Dumbbell Fly",cat:"Chest" },{ id:"pushup",name:"Push Up",cat:"Chest" },
  { id:"chestdip",name:"Chest Dip",cat:"Chest" },
  { id:"deadlift",name:"Deadlift",cat:"Back" },{ id:"brow",name:"Barbell Row",cat:"Back" },
  { id:"pullup",name:"Pull Up",cat:"Back" },{ id:"latpull",name:"Lat Pulldown",cat:"Back" },
  { id:"cabrow",name:"Seated Cable Row",cat:"Back" },{ id:"dbrow",name:"Dumbbell Row",cat:"Back" },
  { id:"facepull",name:"Face Pull",cat:"Back" },
  { id:"squat",name:"Back Squat",cat:"Legs" },{ id:"frontsq",name:"Front Squat",cat:"Legs" },
  { id:"legpress",name:"Leg Press",cat:"Legs" },{ id:"rdl",name:"Romanian Deadlift",cat:"Legs" },
  { id:"legcurl",name:"Leg Curl",cat:"Legs" },{ id:"legext",name:"Leg Extension",cat:"Legs" },
  { id:"lunge",name:"Lunge",cat:"Legs" },{ id:"calf",name:"Calf Raise",cat:"Legs" },
  { id:"ohp",name:"Overhead Press",cat:"Shoulders" },{ id:"dbohp",name:"Dumbbell OHP",cat:"Shoulders" },
  { id:"latrise",name:"Lateral Raise",cat:"Shoulders" },{ id:"frontrise",name:"Front Raise",cat:"Shoulders" },
  { id:"reardelt",name:"Rear Delt Fly",cat:"Shoulders" },
  { id:"bbcurl",name:"Barbell Curl",cat:"Arms" },{ id:"dbcurl",name:"Dumbbell Curl",cat:"Arms" },
  { id:"hammer",name:"Hammer Curl",cat:"Arms" },{ id:"tpush",name:"Tricep Pushdown",cat:"Arms" },
  { id:"skull",name:"Skull Crusher",cat:"Arms" },{ id:"tdip",name:"Tricep Dip",cat:"Arms" },
  { id:"plank",name:"Plank",cat:"Core" },{ id:"crunch",name:"Crunch",cat:"Core" },
  { id:"legraise",name:"Leg Raise",cat:"Core" },{ id:"rtwist",name:"Russian Twist",cat:"Core" },
  { id:"abwheel",name:"Ab Wheel Rollout",cat:"Core" },
  { id:"running",name:"Running",cat:"Cardio",cardio:true },
  { id:"jogging",name:"Jogging",cat:"Cardio",cardio:true },
  { id:"walking",name:"Walking",cat:"Cardio",cardio:true },
  { id:"swimming",name:"Swimming",cat:"Cardio",cardio:true },
  { id:"cycling_c",name:"Cycling",cat:"Cardio",cardio:true },
  { id:"hiit",name:"HIIT",cat:"Cardio",cardio:true },
  { id:"elliptical",name:"Elliptical",cat:"Cardio",cardio:true },
  { id:"rowing_c",name:"Rowing Machine",cat:"Cardio",cardio:true },
  { id:"jumprope",name:"Jump Rope",cat:"Cardio",cardio:true },
  { id:"stairclimb",name:"Stair Climber",cat:"Cardio",cardio:true },
];

const CATS = ["Chest","Back","Legs","Shoulders","Arms","Core","Cardio"];
const MEALS = ["Breakfast","Lunch","Dinner","Snacks"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MEASURE_FIELDS = [
  {key:"neck",label:"Neck"},{key:"shoulders",label:"Shoulders"},{key:"chest",label:"Chest"},
  {key:"bicep_l",label:"Left Bicep"},{key:"bicep_r",label:"Right Bicep"},
  {key:"waist",label:"Waist"},{key:"belly",label:"Belly (navel)"},{key:"hips",label:"Hips"},
  {key:"thigh_l",label:"Left Thigh"},{key:"thigh_r",label:"Right Thigh"},
  {key:"calf_l",label:"Left Calf"},{key:"calf_r",label:"Right Calf"},
];
const DEFAULTS = {
  calorieGoal:2500,proteinGoal:160,carbsGoal:280,fatGoal:75,fiberGoal:30,
  restTime:90,units:"kg",measureUnit:"cm"
};

// ── STORAGE HOOK ──────────────────────────────────────────────────────────────
function useStorage(key, def) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : def; }
    catch { return def; }
  });
  const save = useCallback((updater) => {
    setVal(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch(e) {
        console.warn("Storage full:", e);
      }
      return next;
    });
  }, [key]);
  return [val, save];
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function dayTotals(entries) {
  return (entries||[]).reduce(
    (t,e) => ({cal:t.cal+(e.calories||0),protein:t.protein+(e.protein||0),
      carbs:t.carbs+(e.carbs||0),fat:t.fat+(e.fat||0),fiber:t.fiber+(e.fiber||0)}),
    {cal:0,protein:0,carbs:0,fat:0,fiber:0}
  );
}
function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w=>w.date));
  let streak=0; const d=new Date();
  if (!days.has(d.toISOString().split("T")[0])) d.setDate(d.getDate()-1);
  while (days.has(d.toISOString().split("T")[0])) { streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function calcVolume(exercises) {
  return (exercises||[]).reduce((t,ex) =>
    t+(ex.sets||[]).filter(s=>s.done).reduce((s,set)=>
      s+(parseFloat(set.weight)||0)*(parseInt(set.reps)||0),0),0);
}
function getPR(exId,weight,reps,workouts) {
  const w=parseFloat(weight),r=parseInt(reps);
  if (!w||!r) return false;
  const allSets=workouts.flatMap(wk=>(wk.exercises||[]).filter(e=>e.id===exId).flatMap(e=>(e.sets||[]).filter(s=>s.done)));
  if (!allSets.length) return false;
  const maxW=Math.max(...allSets.map(s=>parseFloat(s.weight)||0));
  if (w>maxW) return true;
  const bestR=Math.max(...allSets.filter(s=>(parseFloat(s.weight)||0)>=w).map(s=>parseInt(s.reps)||0),0);
  return r>bestR;
}
function getLastSession(exId,workouts) {
  const rel=(workouts||[]).filter(w=>(w.exercises||[]).some(e=>e.id===exId));
  if (!rel.length) return null;
  const last=rel.reduce((a,b)=>a.date>b.date?a:b);
  return (last.exercises||[]).find(e=>e.id===exId)?.sets?.filter(s=>s.done)||null;
}
async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const scale = Math.min(MAX/Math.max(img.width,img.height),1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width*scale);
      canvas.height = Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg",0.72));
    };
    img.src = url;
  });
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function CalRing({ eaten, goal }) {
  const r=52, circ=2*Math.PI*r, pct=Math.min(eaten/Math.max(goal,1),1), over=eaten>goal;
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width="128" height="128" style={{transform:"rotate(-90deg)"}}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="#27272a" strokeWidth="9"/>
          <circle cx="64" cy="64" r={r} fill="none" stroke={over?"#f87171":"#a3e635"} strokeWidth="9"
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
            style={{transition:"stroke-dashoffset 0.6s ease"}}/>
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-bold text-white" style={H}>{round(eaten)}</div>
          <div className="text-xs text-zinc-400">kcal</div>
        </div>
      </div>
      <div className="text-xs mt-0.5">
        {over ? <span className="text-red-400">+{round(eaten-goal)} over</span>
               : <span className="text-zinc-400">{round(goal-eaten)} left</span>}
      </div>
    </div>
  );
}
function MBar({ label, val, goal, color }) {
  const pct=Math.min((val/Math.max(goal,1))*100,100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{round(val)}<span className="text-zinc-500">/{goal}g</span></span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`,transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-zinc-950 ${wide?"":"max-w-lg mx-auto"}`}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <button onClick={onClose} className="text-zinc-400 p-1"><ArrowLeft size={20}/></button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// ── BARCODE SCANNER ───────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("Starting camera…");
  const [manualCode, setManualCode] = useState("");
  const hasDetector = "BarcodeDetector" in window;

  useEffect(() => {
    if (!hasDetector) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode:"environment", width:{ideal:1280}, height:{ideal:720} }
        });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({
          formats: ["ean_13","ean_8","upc_a","upc_e","code_128","qr_code"]
        });
        setStatus("Point at a barcode");
        const scan = async () => {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) { onDetected(codes[0].rawValue); return; }
          } catch {}
          if (streamRef.current?.active) rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch { setStatus("Camera access denied — use manual entry below."); }
    })();
    return () => {
      streamRef.current?.getTracks().forEach(t=>t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <Modal title="Scan Barcode" onClose={onClose}>
      <div className="p-4">
        {hasDetector ? (
          <>
            <div className="relative rounded-xl overflow-hidden bg-zinc-800 mb-3" style={{aspectRatio:"4/3"}}>
              <video ref={videoRef} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-lime-400 rounded-lg opacity-80" style={{width:"70%",height:"35%"}}/>
              </div>
            </div>
            <div className="text-center text-sm text-zinc-400 mb-4">{status}</div>
          </>
        ) : (
          <div className="bg-zinc-800 rounded-xl p-4 mb-4 text-sm text-zinc-400">
            Live scanning requires Chrome or Edge. Use manual entry:
          </div>
        )}
        <div className="text-xs text-zinc-500 mb-2">Or enter barcode manually:</div>
        <div className="flex gap-2">
          <input value={manualCode} onChange={e=>setManualCode(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manualCode&&onDetected(manualCode)}
            placeholder="e.g. 3017620422003" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"/>
          <button onClick={()=>manualCode&&onDetected(manualCode)}
            className="bg-lime-400 text-zinc-950 rounded-xl px-4 font-bold" style={H}>Go</button>
        </div>
      </div>
    </Modal>
  );
}

// ── FOOD SEARCH MODAL ─────────────────────────────────────────────────────────
function FoodSearchModal({ meal, onAdd, onClose, customFoods, recipes }) {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState("100");
  const [showScanner, setShowScanner] = useState(false);
  const abortRef = useRef(null);

  const doSearch = async (q) => {
    const term = q || query;
    if (!term.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(""); setResults([]);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&json=1&page_size=25&lc=en&fields=product_name_en,product_name,brands,nutriments,code&action=process`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      const data = await res.json();
      const valid = (data.products||[])
        .filter(p => {
          const name = p.product_name_en || p.product_name;
          return name && p.nutriments?.["energy-kcal_100g"] != null;
        })
        .map(p => ({...p, _displayName: p.product_name_en || p.product_name}));
      setResults(valid);
      if (!valid.length) setError("No results found. Try different keywords.");
    } catch(e) {
      if (e.name !== "AbortError") setError("Search failed. Check your connection.");
    }
    setLoading(false);
  };

  const handleBarcode = async (code) => {
    setShowScanner(false);
    setLoading(true); setError(""); setResults([]);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        setSelected({
          _displayName: p.product_name_en || p.product_name || "Unknown product",
          brands: p.brands,
          nutriments: p.nutriments
        });
      } else { setError(`No product found for barcode: ${code}`); }
    } catch { setError("Lookup failed. Check your connection."); }
    setLoading(false);
  };

  const confirmAdd = () => {
    const g = parseFloat(grams)||100, ratio = g/100;
    const n = selected.nutriments||{};
    const get = (a,b) => ((n[a]??n[b])||0)*ratio;
    onAdd({ meal, name:selected._displayName||selected.name, brand:selected.brands||selected.brand||"",
      calories:get("energy-kcal_100g","calories"), protein:get("proteins_100g","protein"),
      carbs:get("carbohydrates_100g","carbs"), fat:get("fat_100g","fat"),
      fiber:get("fiber_100g","fiber"), grams:g });
    onClose();
  };

  const addRecipe = (recipe, servings) => {
    const ratio = parseFloat(servings)||1;
    onAdd({ meal, name:recipe.name, brand:"Recipe", isRecipe:true,
      calories:recipe.totals.cal*ratio, protein:recipe.totals.protein*ratio,
      carbs:recipe.totals.carbs*ratio, fat:recipe.totals.fat*ratio,
      fiber:recipe.totals.fiber*ratio, grams:100*ratio });
    onClose();
  };

  if (showScanner) return <BarcodeScanner onDetected={handleBarcode} onClose={()=>setShowScanner(false)}/>;

  if (selected) {
    const g=parseFloat(grams)||100, ratio=g/100;
    const n=selected.nutriments||{};
    const get=(a,b)=>((n[a]??n[b])||0)*ratio;
    return (
      <Modal title="Confirm Food" onClose={()=>setSelected(null)}>
        <div className="p-4">
          <div className="text-lg font-bold text-white leading-snug">{selected._displayName||selected.name}</div>
          {(selected.brands||selected.brand) && <div className="text-sm text-zinc-400 mb-4">{selected.brands||selected.brand}</div>}
          <div className="mb-5">
            <label className="text-xs text-zinc-400 block mb-1">Amount (grams)</label>
            <input type="number" value={grams} onChange={e=>setGrams(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center font-bold" style={H}/>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[["Calories",round(get("energy-kcal_100g","calories")),"kcal","text-lime-400"],
              ["Protein",round(get("proteins_100g","protein")),"g","text-sky-400"],
              ["Carbs",round(get("carbohydrates_100g","carbs")),"g","text-amber-400"],
              ["Fat",round(get("fat_100g","fat")),"g","text-rose-400"],
              ["Fiber",round(get("fiber_100g","fiber")),"g","text-emerald-400"],
            ].map(([label,val,unit,cls]) => (
              <div key={label} className="bg-zinc-800 rounded-xl p-3">
                <div className={`text-2xl font-bold ${cls}`} style={H}>{val}<span className="text-sm ml-0.5">{unit}</span></div>
                <div className="text-xs text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
          <button onClick={confirmAdd} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
            Add to {meal}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Add to ${meal}`} onClose={onClose}>
      <div className="flex border-b border-zinc-800">
        {[["search","Search"],["custom","My Foods"],["recipes","Recipes"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold ${tab===t?"text-lime-400 border-b-2 border-lime-400":"text-zinc-500"}`}>{l}</button>
        ))}
      </div>

      {tab==="search" && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
              placeholder="Search foods…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm"/>
            <button onClick={()=>doSearch()} className="bg-lime-400 text-zinc-950 rounded-xl px-3 font-bold"><Search size={18}/></button>
            <button onClick={()=>setShowScanner(true)} className="bg-zinc-700 text-white rounded-xl px-3"><Camera size={18}/></button>
          </div>
          {loading && <div className="text-center text-zinc-400 py-10 text-sm">Searching…</div>}
          {error && <div className="text-zinc-500 text-sm text-center py-8">{error}</div>}
          {results.map((p,i)=>(
            <button key={p.code||i} onClick={()=>setSelected(p)}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
              <div className="flex-1 mr-3">
                <div className="font-medium text-sm text-white leading-tight">{p._displayName}</div>
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

      {tab==="custom" && (
        <div className="p-4">
          {!customFoods.length
            ? <div className="text-center text-zinc-500 py-12 text-sm">No custom foods yet.</div>
            : customFoods.map(f=>(
              <button key={f.id} onClick={()=>setSelected({_displayName:f.name,brands:f.brand,
                nutriments:{"energy-kcal_100g":f.calories,proteins_100g:f.protein,carbohydrates_100g:f.carbs,fat_100g:f.fat,fiber_100g:f.fiber}})}
                className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
                <div><div className="font-medium text-sm text-white">{f.name}</div>
                     <div className="text-xs text-zinc-400">{f.brand||"Custom"}</div></div>
                <div className="text-right">
                  <div className="text-lime-400 font-bold" style={H}>{f.calories}</div>
                  <div className="text-xs text-zinc-500">kcal/100g</div>
                </div>
              </button>
            ))
          }
        </div>
      )}

      {tab==="recipes" && (
        <div className="p-4">
          {!recipes.length
            ? <div className="text-center text-zinc-500 py-12 text-sm">No recipes yet. Create one in the Nutrition page.</div>
            : recipes.map(r=>{
              const [srvs, setSrvs] = useState("1");
              return (
                <div key={r.id} className="bg-zinc-800 rounded-xl p-3.5 mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm text-white">{r.name}</div>
                      <div className="text-xs text-zinc-400">{r.ingredients.length} ingredients</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lime-400 font-bold text-sm" style={H}>{round(r.totals.cal)}</div>
                      <div className="text-xs text-zinc-500">kcal/serving</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={srvs} onChange={e=>setSrvs(e.target.value)}
                      className="w-16 text-center bg-zinc-700 border border-zinc-600 rounded-lg py-1.5 text-white text-sm"/>
                    <span className="text-xs text-zinc-400">servings</span>
                    <button onClick={()=>addRecipe(r,srvs)}
                      className="ml-auto bg-lime-400 text-zinc-950 font-bold text-xs px-3 py-1.5 rounded-lg" style={H}>Add</button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
    </Modal>
  );
}

function AddCustomFoodModal({ onAdd, onClose }) {
  const [form, setForm] = useState({name:"",brand:"",calories:"",protein:"",carbs:"",fat:"",fiber:""});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <Modal title="New Custom Food" onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="bg-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400">Values per 100g</div>
        {[["Food name *","name","text"],["Brand (optional)","brand","text"],
          ["Calories (kcal) *","calories","number"],["Protein (g)","protein","number"],
          ["Carbs (g)","carbs","number"],["Fat (g)","fat","number"],["Fiber (g)","fiber","number"],
        ].map(([label,key,type])=>(
          <div key={key}>
            <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
            <input type={type} value={form[key]} onChange={e=>s(key,e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm"/>
          </div>
        ))}
        <button onClick={()=>{
          if(!form.name||!form.calories) return;
          onAdd({id:uid(),name:form.name,brand:form.brand,calories:parseFloat(form.calories)||0,
            protein:parseFloat(form.protein)||0,carbs:parseFloat(form.carbs)||0,
            fat:parseFloat(form.fat)||0,fiber:parseFloat(form.fiber)||0});
          onClose();
        }} disabled={!form.name||!form.calories}
          className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
          Save Food
        </button>
      </div>
    </Modal>
  );
}

// ── RECIPE MANAGER ────────────────────────────────────────────────────────────
function RecipeManager({ recipes, saveRecipes, customFoods, onClose }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQ)}&json=1&page_size=10&lc=en&fields=product_name_en,product_name,nutriments,code&action=process`);
      const data = await res.json();
      setSearchRes((data.products||[]).filter(p=>(p.product_name_en||p.product_name)&&p.nutriments?.["energy-kcal_100g"]!=null).slice(0,8).map(p=>({...p,_displayName:p.product_name_en||p.product_name})));
    } catch {}
    setSearching(false);
  };

  const addIngredient = (food, grams) => {
    const g=parseFloat(grams)||100, r=g/100;
    const n=food.nutriments||{};
    setIngredients(prev=>[...prev,{id:uid(),name:food._displayName||food.name,grams:g,
      calories:((n["energy-kcal_100g"]??n.calories)||0)*r,
      protein:((n.proteins_100g??n.protein)||0)*r,
      carbs:((n.carbohydrates_100g??n.carbs)||0)*r,
      fat:((n.fat_100g??n.fat)||0)*r,
      fiber:((n.fiber_100g??n.fiber)||0)*r,
    }]);
    setSearchRes([]); setSearchQ("");
  };

  const totals = ingredients.reduce((t,i)=>({cal:t.cal+i.calories,protein:t.protein+i.protein,
    carbs:t.carbs+i.carbs,fat:t.fat+i.fat,fiber:t.fiber+i.fiber}),{cal:0,protein:0,carbs:0,fat:0,fiber:0});

  const saveRecipe = () => {
    if (!name.trim()||!ingredients.length) return;
    saveRecipes(p=>[...p,{id:uid(),name,ingredients,totals}]);
    setCreating(false); setName(""); setIngredients([]);
  };

  if (creating) {
    return (
      <Modal title="Create Recipe" onClose={()=>setCreating(false)}>
        <div className="p-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Recipe name…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4"/>
          <div className="flex gap-2 mb-2">
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
              placeholder="Search ingredient…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500"/>
            <button onClick={doSearch} className="bg-zinc-700 text-white rounded-xl px-3"><Search size={16}/></button>
          </div>
          {searching && <div className="text-zinc-400 text-xs py-2">Searching…</div>}
          {searchRes.map((p,i)=>{
            const [g,setG]=useState("100");
            return (
              <div key={p.code||i} className="bg-zinc-800 rounded-xl p-3 mb-1.5 flex items-center gap-3">
                <div className="flex-1 text-sm text-white">{p._displayName}</div>
                <input type="number" value={g} onChange={e=>setG(e.target.value)} className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg py-1 text-white text-xs text-center"/>
                <span className="text-xs text-zinc-400">g</span>
                <button onClick={()=>addIngredient(p,g)} className="text-lime-400 font-bold text-xs">+ Add</button>
              </div>
            );
          })}
          {ingredients.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-zinc-400 mb-2">Ingredients ({ingredients.length})</div>
              {ingredients.map((ing,i)=>(
                <div key={ing.id} className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                  <span className="text-sm text-white">{ing.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{ing.grams}g</span>
                    <button onClick={()=>setIngredients(p=>p.filter((_,j)=>j!==i))} className="text-zinc-600 hover:text-red-400"><X size={12}/></button>
                  </div>
                </div>
              ))}
              <div className="bg-zinc-800 rounded-xl p-3 mt-3 flex justify-between text-xs">
                {[["Cal",round(totals.cal),"text-lime-400"],["P",round(totals.protein),"text-sky-400"],
                  ["C",round(totals.carbs),"text-amber-400"],["F",round(totals.fat),"text-rose-400"]].map(([l,v,c])=>(
                  <div key={l} className="text-center"><div className={`font-bold ${c}`} style={H}>{v}</div><div className="text-zinc-500">{l}</div></div>
                ))}
              </div>
              <button onClick={saveRecipe} disabled={!name.trim()}
                className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3 mt-3" style={H}>
                Save Recipe
              </button>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Recipes" onClose={onClose}>
      <div className="p-4">
        <button onClick={()=>setCreating(true)}
          className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">
          + Create New Recipe
        </button>
        {!recipes.length
          ? <div className="text-center text-zinc-500 py-8 text-sm">No recipes yet.</div>
          : recipes.map(r=>(
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-white">{r.name}</div>
                <button onClick={()=>saveRecipes(p=>p.filter(x=>x.id!==r.id))} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
              </div>
              <div className="flex gap-3 text-xs">
                {[["Cal",round(r.totals.cal),"text-lime-400"],["P",round(r.totals.protein),"text-sky-400"],
                  ["C",round(r.totals.carbs),"text-amber-400"],["F",round(r.totals.fat),"text-rose-400"]].map(([l,v,c])=>(
                  <span key={l}><span className={`font-bold ${c}`} style={H}>{v}</span><span className="text-zinc-500"> {l}</span></span>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </Modal>
  );
}

// ── NUTRITION PAGE ────────────────────────────────────────────────────────────
function NutritionPage({ settings, foodLogs, addFoodLog, removeFoodLog, customFoods, saveCustomFoods, recipes, saveRecipes }) {
  const [offset, setOffset] = useState(0);
  const [addModal, setAddModal] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const d=new Date(); d.setDate(d.getDate()+offset);
  const dateStr=d.toISOString().split("T")[0];
  const label=offset===0?"Today":offset===-1?"Yesterday":d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const entries=foodLogs[dateStr]||[];
  const totals=dayTotals(entries);
  return (
    <div className="pt-12 md:pt-6 pb-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={H}>Nutrition</h1>
        <div className="flex gap-2">
          <button onClick={()=>setShowRecipes(true)} className="text-zinc-400 text-xs font-semibold border border-zinc-700 px-3 py-1.5 rounded-full">Recipes</button>
          <button onClick={()=>setShowCustomModal(true)} className="text-lime-400 text-xs font-semibold border border-lime-400 px-3 py-1.5 rounded-full">+ Custom</button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mb-4">
        <button onClick={()=>setOffset(o=>o-1)} className="text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center">‹</button>
        <span className="text-sm font-semibold w-28 text-center">{label}</span>
        <button onClick={()=>setOffset(o=>Math.min(o+1,0))} disabled={offset>=0}
          className={`text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center ${offset>=0?"opacity-20":""}`}>›</button>
      </div>
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-around">
          {[["Cal",round(totals.cal),"kcal","text-lime-400"],["Protein",round(totals.protein),"g","text-sky-400"],
            ["Carbs",round(totals.carbs),"g","text-amber-400"],["Fat",round(totals.fat),"g","text-rose-400"],
            ["Fiber",round(totals.fiber),"g","text-emerald-400"]].map(([l,v,u,c])=>(
            <div key={l} className="text-center">
              <div className={`text-xl font-bold ${c}`} style={H}>{v}<span className="text-xs ml-0.5 font-normal">{u}</span></div>
              <div className="text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </div>
      </div>
      {MEALS.map(meal=>{
        const me=entries.filter(e=>e.meal===meal);
        const mCal=round(me.reduce((s,e)=>s+e.calories,0));
        return (
          <div key={meal} className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{meal}</span>
                {mCal>0&&<span className="text-zinc-500 text-xs">{mCal} kcal</span>}
              </div>
              <button onClick={()=>setAddModal({meal})} className="flex items-center gap-1 text-lime-400 text-xs font-semibold">
                <Plus size={14}/>Add
              </button>
            </div>
            {me.length===0
              ? <div className="text-zinc-700 text-xs py-1">Nothing logged</div>
              : me.map(entry=>(
                <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 mb-1.5 flex justify-between items-center">
                  <div className="flex-1 mr-2">
                    <div className="text-sm font-medium text-white leading-tight">{entry.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{entry.grams}g · P:{round(entry.protein)} C:{round(entry.carbs)} F:{round(entry.fat)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lime-400 font-bold text-sm" style={H}>{round(entry.calories)}</span>
                    <button onClick={()=>removeFoodLog(dateStr,entry.id)} className="text-zinc-700 hover:text-red-400 p-0.5"><X size={13}/></button>
                  </div>
                </div>
              ))
            }
          </div>
        );
      })}
      {addModal&&<FoodSearchModal meal={addModal.meal} onAdd={e=>addFoodLog(dateStr,e)} onClose={()=>setAddModal(null)} customFoods={customFoods} recipes={recipes}/>}
      {showCustomModal&&<AddCustomFoodModal onAdd={f=>saveCustomFoods(p=>[...p,f])} onClose={()=>setShowCustomModal(false)}/>}
      {showRecipes&&<RecipeManager recipes={recipes} saveRecipes={saveRecipes} customFoods={customFoods} onClose={()=>setShowRecipes(false)}/>}
    </div>
  );
}

// ── WORKOUT COMPONENTS ────────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [q,setQ]=useState(""); const [cat,setCat]=useState("All");
  const filtered=EX_DB.filter(e=>(cat==="All"||e.cat===cat)&&e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title="Add Exercise" onClose={onClose}>
      <div className="p-4">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search exercises…" autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm mb-3"/>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {["All",...CATS].map(c=>(
            <button key={c} onClick={()=>setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border flex-shrink-0 ${cat===c?"bg-lime-400 text-zinc-950 border-lime-400":"text-zinc-400 border-zinc-700"}`}>{c}</button>
          ))}
        </div>
        {filtered.map(ex=>(
          <button key={ex.id} onClick={()=>{onSelect(ex);onClose();}}
            className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 mb-2 flex justify-between items-center">
            <span className="font-medium text-sm text-white">{ex.name}</span>
            <span className="text-xs text-zinc-500 bg-zinc-700 px-2.5 py-1 rounded-full">{ex.cat}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function WorkoutDetailModal({ workout, settings, workouts, onClose, onEdit }) {
  const vol=calcVolume(workout.exercises||[]);
  const dur=workout.endTime?Math.round((workout.endTime-workout.startTime)/60000):0;
  return (
    <Modal title="Workout Details" onClose={onClose}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xl font-bold" style={H}>{workout.name}</div>
            <div className="text-sm text-zinc-400">{new Date(workout.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
          </div>
          <button onClick={onEdit} className="flex items-center gap-1.5 text-lime-400 text-xs font-semibold border border-lime-400 px-3 py-1.5 rounded-full">
            <Edit2 size={12}/>Edit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[["Volume",numFmt(round(vol))+" "+settings.units,"text-lime-400"],
            ["Duration",dur+"min","text-sky-400"],
            ["Exercises",(workout.exercises||[]).length+" exs","text-amber-400"]].map(([l,v,c])=>(
            <div key={l} className="bg-zinc-800 rounded-xl p-3 text-center">
              <div className={`text-lg font-bold ${c}`} style={H}>{v}</div>
              <div className="text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </div>
        {(workout.exercises||[]).map((ex,ei)=>{
          const doneSets=(ex.sets||[]).filter(s=>s.done);
          return (
            <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
              <div className="font-bold mb-2" style={{...H,fontSize:"17px"}}>{ex.name}</div>
              {ex.cardio ? (
                doneSets.map((s,si)=>(
                  <div key={si} className="flex gap-4 text-sm py-1 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-500 w-5">{si+1}</span>
                    {s.duration&&<span className="text-white">{s.duration} min</span>}
                    {s.distance&&<span className="text-zinc-300">{s.distance} km</span>}
                  </div>
                ))
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-1 text-xs text-zinc-600 mb-1">
                    <div className="col-span-2">#</div>
                    <div className="col-span-5">{settings.units}</div>
                    <div className="col-span-5">Reps</div>
                  </div>
                  {doneSets.map((s,si)=>{
                    const pr=getPR(ex.id,s.weight,s.reps,workouts.filter(w=>w.id!==workout.id));
                    return (
                      <div key={si} className="grid grid-cols-12 gap-1 py-1.5 border-b border-zinc-800 last:border-0 text-sm">
                        <div className="col-span-2 flex items-center gap-0.5 text-zinc-500">
                          {si+1}{pr&&<Star size={9} className="text-yellow-400" style={{fill:"#facc15"}}/>}
                        </div>
                        <div className="col-span-5 text-white font-medium">{s.weight} {settings.units}</div>
                        <div className="col-span-5 text-white">{s.reps} reps</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ActiveWorkout({ workout, setWorkout, onFinish, settings, workouts, isEditing }) {
  const [showPicker,setShowPicker]=useState(false);
  const [rest,setRest]=useState({active:false,remaining:0});
  const [elapsed,setElapsed]=useState(0);
  const timerRef=useRef(null);
  const startRef=useRef(Date.now()-(workout.elapsed||0)*1000);

  useEffect(()=>{
    const t=setInterval(()=>setElapsed(Math.floor((Date.now()-startRef.current)/1000)),1000);
    return ()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    if (rest.active&&rest.remaining>0) { timerRef.current=setTimeout(()=>setRest(p=>({...p,remaining:p.remaining-1})),1000); }
    else if (rest.active&&rest.remaining===0) { setRest(p=>({...p,active:false})); }
    return ()=>clearTimeout(timerRef.current);
  },[rest.active,rest.remaining]);

  const addExercise=(ex)=>setWorkout(w=>({...w,exercises:[...w.exercises,{id:ex.id,name:ex.name,cat:ex.cat,cardio:!!ex.cardio,sets:[ex.cardio?{duration:"",distance:"",done:false}:{weight:"",reps:"",done:false}]}]}));
  const addSet=(ei)=>setWorkout(w=>({...w,exercises:w.exercises.map((ex,i)=>{
    if(i!==ei) return ex;
    const last=ex.sets[ex.sets.length-1]||{};
    return {...ex,sets:[...ex.sets,ex.cardio?{duration:last.duration||"",distance:last.distance||"",done:false}:{weight:last.weight||"",reps:last.reps||"",done:false}]};
  })}));
  const updateSet=(ei,si,field,val)=>setWorkout(w=>({...w,exercises:w.exercises.map((ex,i)=>i!==ei?ex:{...ex,sets:ex.sets.map((s,j)=>j!==si?s:{...s,[field]:val})})}));
  const toggleDone=(ei,si)=>{
    const wasNotDone=!workout.exercises[ei].sets[si].done;
    setWorkout(w=>({...w,exercises:w.exercises.map((ex,i)=>i!==ei?ex:{...ex,sets:ex.sets.map((s,j)=>j!==si?s:{...s,done:!s.done})})}));
    if(wasNotDone) setRest({active:true,remaining:settings.restTime});
  };

  const fmtT=(s)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const volume=calcVolume(workout.exercises);
  const doneCount=(workout.exercises||[]).reduce((t,ex)=>t+(ex.sets||[]).filter(s=>s.done).length,0);

  return (
    <div className="pb-4 min-h-screen">
      <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-4 pt-10 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 mr-3">
            <input value={workout.name} onChange={e=>setWorkout(w=>({...w,name:e.target.value}))}
              className="text-xl font-bold bg-transparent text-white outline-none w-full" style={H}/>
            <div className="text-xs text-zinc-400">{isEditing?"Editing · ":""}{fmtT(elapsed)} · {numFmt(round(volume))} {settings.units} · {doneCount} sets</div>
          </div>
          <button onClick={()=>onFinish(elapsed)} className="bg-lime-400 text-zinc-950 font-bold text-sm px-4 py-2 rounded-full flex-shrink-0" style={H}>
            {isEditing?"Save":"Finish"}
          </button>
        </div>
      </div>

      {rest.active&&(
        <div className="mx-4 mt-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Timer size={15} className="text-lime-400"/><span className="text-xs text-zinc-300 font-medium">Rest</span></div>
          <div className="text-2xl font-bold text-lime-400" style={H}>{fmtT(rest.remaining)}</div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setRest(p=>({...p,remaining:Math.max(0,p.remaining-15)}))} className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">−15</button>
            <button onClick={()=>setRest(p=>({...p,remaining:p.remaining+15}))} className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">+15</button>
            <button onClick={()=>setRest({active:false,remaining:0})} className="text-xs text-zinc-500 ml-1">Skip</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-3 space-y-3">
        {workout.exercises.map((ex,ei)=>{
          const prev=!isEditing?getLastSession(ex.id,workouts):null;
          return (
            <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div><div className="font-bold text-white" style={{...H,fontSize:"18px"}}>{ex.name}</div>
                     <div className="text-xs text-zinc-500">{ex.cat}</div></div>
                <button onClick={()=>setWorkout(w=>({...w,exercises:w.exercises.filter((_,i)=>i!==ei)}))} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14}/></button>
              </div>
              {prev&&prev.length>0&&(
                <div className="text-xs text-zinc-500 bg-zinc-800 rounded-lg px-3 py-2 mb-3">
                  <span className="text-zinc-400 font-medium">Previous: </span>
                  {prev.map(s=>`${s.weight||"?"}×${s.reps||"?"}`).join(" · ")}
                </div>
              )}
              {ex.cardio ? (
                <>
                  <div className="grid grid-cols-12 gap-1 text-xs text-zinc-600 mb-1.5 px-1">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5 text-center">Min</div>
                    <div className="col-span-4 text-center">km</div>
                    <div className="col-span-2 text-center">✓</div>
                  </div>
                  {ex.sets.map((s,si)=>(
                    <div key={si} className={`grid grid-cols-12 gap-1.5 mb-1.5 items-center ${s.done?"opacity-60":""}`}>
                      <div className="col-span-1 text-xs text-zinc-500">{si+1}</div>
                      <input type="number" value={s.duration} onChange={e=>updateSet(ei,si,"duration",e.target.value)} placeholder="0"
                        className="col-span-5 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"/>
                      <input type="number" value={s.distance} onChange={e=>updateSet(ei,si,"distance",e.target.value)} placeholder="0"
                        className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"/>
                      <div className="col-span-2 flex justify-center">
                        <button onClick={()=>toggleDone(ei,si)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.done?"bg-lime-400 border-lime-400 text-zinc-950":"border-zinc-600 text-zinc-600"}`}>
                          <Check size={15}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-1 text-xs text-zinc-600 mb-1.5 px-1">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4 text-center">{settings.units}</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-3 text-center">✓</div>
                  </div>
                  {ex.sets.map((s,si)=>{
                    const pr=s.done&&getPR(ex.id,s.weight,s.reps,workouts);
                    return (
                      <div key={si} className={`grid grid-cols-12 gap-1.5 mb-1.5 items-center ${s.done?"opacity-60":""}`}>
                        <div className="col-span-1 flex items-center gap-0.5">
                          <span className="text-xs text-zinc-500">{si+1}</span>
                          {pr&&<Star size={9} className="text-yellow-400" style={{fill:"#facc15"}}/>}
                        </div>
                        <input type="number" value={s.weight} onChange={e=>updateSet(ei,si,"weight",e.target.value)} placeholder="0"
                          className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"/>
                        <input type="number" value={s.reps} onChange={e=>updateSet(ei,si,"reps",e.target.value)} placeholder="0"
                          className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white"/>
                        <div className="col-span-3 flex justify-center gap-1.5">
                          <button onClick={()=>toggleDone(ei,si)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.done?"bg-lime-400 border-lime-400 text-zinc-950":"border-zinc-600 text-zinc-600"}`}>
                            <Check size={15}/>
                          </button>
                          {ex.sets.length>1&&(
                            <button onClick={()=>setWorkout(w=>({...w,exercises:w.exercises.map((e,i)=>i!==ei?e:{...e,sets:e.sets.filter((_,j)=>j!==si)})}))} className="text-zinc-700 hover:text-red-400"><X size={12}/></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <button onClick={()=>addSet(ei)} className="w-full text-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-lg py-2 mt-2">+ Add Set</button>
            </div>
          );
        })}
        <button onClick={()=>setShowPicker(true)} className="w-full border-2 border-dashed border-zinc-800 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors" style={H}>
          + Add Exercise
        </button>
      </div>
      {showPicker&&<ExercisePicker onSelect={addExercise} onClose={()=>setShowPicker(false)}/>}
    </div>
  );
}

function RoutinesManager({ routines, saveRoutines, onStartRoutine, onClose }) {
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({name:"",days:[],exercises:[]});
  const [showPicker,setShowPicker]=useState(false);

  const toggleDay=(d)=>setForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d]}));
  const addEx=(ex)=>setForm(f=>({...f,exercises:[...f.exercises,{id:ex.id,name:ex.name,cat:ex.cat,cardio:!!ex.cardio,sets:3,reps:8}]}));
  const save=()=>{
    if(!form.name.trim()) return;
    saveRoutines(p=>[...p,{id:uid(),...form}]);
    setCreating(false); setForm({name:"",days:[],exercises:[]});
  };

  if (creating) {
    return (
      <Modal title="New Routine" onClose={()=>setCreating(false)}>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Routine name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Push Day, Leg Day, Morning Run…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"/>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Days of the week</label>
            <div className="flex gap-2">
              {DAYS.map((d,i)=>(
                <button key={d} onClick={()=>toggleDay(i)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border ${form.days.includes(i)?"bg-lime-400 border-lime-400 text-zinc-950":"border-zinc-700 text-zinc-400"}`} style={H}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-zinc-400">Exercises</label>
              <button onClick={()=>setShowPicker(true)} className="text-lime-400 text-xs">+ Add</button>
            </div>
            {form.exercises.map((ex,i)=>(
              <div key={i} className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2.5 mb-1.5">
                <div className="flex-1 text-sm font-medium text-white">{ex.name}</div>
                {!ex.cardio&&(
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <input type="number" value={ex.sets} onChange={e=>setForm(f=>({...f,exercises:f.exercises.map((x,j)=>j===i?{...x,sets:parseInt(e.target.value)||3}:x)}))}
                      className="w-10 text-center bg-zinc-700 border border-zinc-600 rounded py-1 text-white"/>×
                    <input type="number" value={ex.reps} onChange={e=>setForm(f=>({...f,exercises:f.exercises.map((x,j)=>j===i?{...x,reps:parseInt(e.target.value)||8}:x)}))}
                      className="w-10 text-center bg-zinc-700 border border-zinc-600 rounded py-1 text-white"/>
                  </div>
                )}
                <button onClick={()=>setForm(f=>({...f,exercises:f.exercises.filter((_,j)=>j!==i)}))} className="text-zinc-600 hover:text-red-400"><X size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={save} disabled={!form.name.trim()||!form.exercises.length}
            className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>Save Routine</button>
        </div>
        {showPicker&&<ExercisePicker onSelect={addEx} onClose={()=>setShowPicker(false)}/>}
      </Modal>
    );
  }

  const today=new Date().getDay();
  const todayRoutines=routines.filter(r=>r.days.includes(today));

  return (
    <Modal title="Workout Routines" onClose={onClose}>
      <div className="p-4">
        {todayRoutines.length>0&&(
          <div className="mb-4">
            <div className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Today's Plan</div>
            {todayRoutines.map(r=>(
              <button key={r.id} onClick={()=>onStartRoutine(r)}
                className="w-full text-left bg-lime-400 bg-opacity-10 border border-lime-400 rounded-2xl px-4 py-3 mb-2 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white" style={H}>{r.name}</div>
                  <div className="text-xs text-zinc-400">{r.exercises.length} exercises</div>
                </div>
                <Zap size={18} className="text-lime-400"/>
              </button>
            ))}
          </div>
        )}
        <button onClick={()=>setCreating(true)} className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">+ New Routine</button>
        {routines.map(r=>(
          <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-white">{r.name}</div>
                <div className="text-xs text-zinc-400 mt-1">{r.exercises.map(e=>e.name).join(", ").slice(0,50)}{r.exercises.map(e=>e.name).join(", ").length>50?"…":""}</div>
              </div>
              <button onClick={()=>saveRoutines(p=>p.filter(x=>x.id!==r.id))} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
            </div>
            <div className="flex gap-1 mt-2">
              {DAYS.map((d,i)=>(
                <div key={d} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${r.days.includes(i)?"bg-lime-400 text-zinc-950":"bg-zinc-800 text-zinc-600"}`} style={H}>{d[0]}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── WORKOUT PAGE ──────────────────────────────────────────────────────────────
function WorkoutPage({ settings, workouts, addWorkout, updateWorkout, activeWorkout, setActiveWorkout }) {
  const [showRoutines,setShowRoutines]=useState(false);
  const [routines,saveRoutines]=useStorage("ft_routines",[]);
  const [detailWorkout,setDetailWorkout]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const streak=calcStreak(workouts);

  const startWorkout=(routine)=>{
    const exercises=routine
      ? routine.exercises.map(ex=>({id:ex.id,name:ex.name,cat:ex.cat,cardio:!!ex.cardio,
          sets:Array(ex.sets||1).fill(null).map(()=>ex.cardio?{duration:"",distance:"",done:false}:{weight:"",reps:"",done:false})}))
      : [];
    setActiveWorkout({id:uid(),name:routine?routine.name:`Workout – ${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
      date:todayDate(),startTime:Date.now(),exercises});
    setShowRoutines(false);
  };

  const finishWorkout=(elapsed)=>{
    if (editingId) {
      updateWorkout(editingId,{...activeWorkout,endTime:Date.now()});
      setEditingId(null);
    } else {
      addWorkout({...activeWorkout,endTime:Date.now()});
    }
    setActiveWorkout(null);
  };

  const editWorkout=(w)=>{
    setEditingId(w.id);
    setDetailWorkout(null);
    setActiveWorkout({...w,elapsed:w.endTime?Math.round((w.endTime-w.startTime)/1000):0});
  };

  if (activeWorkout) {
    return <ActiveWorkout workout={activeWorkout} setWorkout={setActiveWorkout} onFinish={finishWorkout}
      settings={settings} workouts={workouts} isEditing={!!editingId}/>;
  }

  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={H}>Workout</h1>
        <div className="flex items-center gap-2">
          {streak>0&&(
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500" style={{background:"rgba(249,115,22,0.1)"}}>
              <Flame size={14} className="text-orange-400"/>
              <span className="text-orange-400 font-bold text-sm" style={H}>{streak}🔥</span>
            </div>
          )}
          <button onClick={()=>setShowRoutines(true)} className="text-zinc-400 text-xs border border-zinc-700 px-3 py-1.5 rounded-full">Routines</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={()=>startWorkout(null)}
          className="bg-lime-400 text-zinc-950 font-bold rounded-2xl py-4 flex items-center justify-center gap-2 text-base col-span-2 active:scale-95 transition-transform" style={H}>
          <Zap size={20}/> Start Empty Workout
        </button>
        {routines.filter(r=>r.days.includes(new Date().getDay())).map(r=>(
          <button key={r.id} onClick={()=>startWorkout(r)}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-left active:scale-95 transition-transform">
            <div className="text-xs text-lime-400 mb-1" style={H}>TODAY'S ROUTINE</div>
            <div className="font-bold text-white text-sm">{r.name}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{r.exercises.length} exercises</div>
          </button>
        ))}
      </div>

      <div className="text-sm font-semibold text-zinc-400 mb-3">Recent Workouts</div>
      {!workouts.length
        ? <div className="text-zinc-600 text-sm text-center py-12">No workouts yet. Start your first session!</div>
        : workouts.slice(0,20).map(w=>{
          const vol=calcVolume(w.exercises||[]);
          const dur=w.endTime?Math.round((w.endTime-w.startTime)/60000):0;
          return (
            <div key={w.id} onClick={()=>setDetailWorkout(w)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-2 cursor-pointer active:scale-99 transition-transform">
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <div className="font-semibold text-sm text-white">{w.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(w.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                    {dur>0&&` · ${dur} min`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-lime-400" style={H}>{numFmt(round(vol))} {settings.units}</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(w.exercises||[]).map((ex,i)=>(
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
                ))}
              </div>
            </div>
          );
        })
      }
      {showRoutines&&<RoutinesManager routines={routines} saveRoutines={saveRoutines} onStartRoutine={startWorkout} onClose={()=>setShowRoutines(false)}/>}
      {detailWorkout&&<WorkoutDetailModal workout={detailWorkout} settings={settings} workouts={workouts}
        onClose={()=>setDetailWorkout(null)} onEdit={()=>editWorkout(detailWorkout)}/>}
    </div>
  );
}

// ── BODY PAGE ─────────────────────────────────────────────────────────────────
function BodyPage({ settings }) {
  const [tab,setTab]=useState("weight");
  const [weights,saveWeights]=useStorage("ft_weights",[]);
  const [measurements,saveMeasurements]=useStorage("ft_measurements",[]);
  const [photos,savePhotos]=useStorage("ft_photos",[]);
  const [addingWeight,setAddingWeight]=useState(false);
  const [addingMeasure,setAddingMeasure]=useState(false);
  const [newWeight,setNewWeight]=useState("");
  const [newMeasures,setNewMeasures]=useState({});
  const [viewPhoto,setViewPhoto]=useState(null);
  const fileRef=useRef(null);

  const addWeight=()=>{
    if (!newWeight) return;
    saveWeights(p=>[...p,{id:uid(),date:todayDate(),weight:parseFloat(newWeight)}].sort((a,b)=>a.date.localeCompare(b.date)));
    setNewWeight(""); setAddingWeight(false);
  };

  const addMeasures=()=>{
    if (!Object.values(newMeasures).some(v=>v)) return;
    saveMeasurements(p=>[...p,{id:uid(),date:todayDate(),...newMeasures}].sort((a,b)=>a.date.localeCompare(b.date)));
    setNewMeasures({}); setAddingMeasure(false);
  };

  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    try {
      const compressed=await compressImage(file);
      savePhotos(p=>[{id:uid(),date:todayDate(),photo:compressed},...p]);
    } catch { alert("Failed to process photo."); }
    e.target.value="";
  };

  const weightChartData=weights.slice(-20).map(w=>({date:w.date.slice(5),w:w.weight}));
  const latest=weights[weights.length-1];
  const startW=weights[0];

  return (
    <div className="pt-12 md:pt-6 pb-4">
      <div className="px-4 mb-4">
        <h1 className="text-3xl font-bold" style={H}>Body</h1>
      </div>
      <div className="flex border-b border-zinc-800 mb-4 px-4">
        {[["weight","⚖️ Weight"],["measurements","📏 Measurements"],["photos","📸 Photos"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold ${tab===t?"text-lime-400 border-b-2 border-lime-400":"text-zinc-500"}`}>{l}</button>
        ))}
      </div>

      {tab==="weight"&&(
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[["Current",latest?`${latest.weight} ${settings.units}`:"—","text-lime-400"],
              ["Start",startW?`${startW.weight} ${settings.units}`:"—","text-zinc-300"],
              ["Change",latest&&startW?`${latest.weight>startW.weight?"+":""}${(latest.weight-startW.weight).toFixed(1)} ${settings.units}`:"—",latest&&startW&&latest.weight>=startW.weight?"text-lime-400":"text-red-400"]
            ].map(([l,v,c])=>(
              <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                <div className={`text-xl font-bold ${c}`} style={H}>{v}</div>
                <div className="text-xs text-zinc-500">{l}</div>
              </div>
            ))}
          </div>
          {weightChartData.length>=2&&(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-xs text-zinc-400 mb-2 font-medium">Weight Trend ({settings.units})</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weightChartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/>
                  <YAxis tick={{fill:"#52525b",fontSize:10}} domain={["auto","auto"]}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                  <Line type="monotone" dataKey="w" name={`Weight (${settings.units})`} stroke="#a3e635" strokeWidth={2.5} dot={{fill:"#a3e635",r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <button onClick={()=>setAddingWeight(true)} className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">+ Log Weight</button>
          {addingWeight&&(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-sm font-semibold mb-3">Today's Weight</div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input type="number" value={newWeight} onChange={e=>setNewWeight(e.target.value)} placeholder={`Weight in ${settings.units}`}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center font-bold" style={H}/>
                </div>
                <button onClick={addWeight} className="bg-lime-400 text-zinc-950 font-bold rounded-xl px-4 py-3" style={H}>Save</button>
                <button onClick={()=>setAddingWeight(false)} className="text-zinc-500 px-2 py-3"><X size={16}/></button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {[...weights].reverse().slice(0,15).map(w=>(
              <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center">
                <span className="text-sm text-zinc-400">{new Date(w.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lime-400" style={H}>{w.weight} {settings.units}</span>
                  <button onClick={()=>saveWeights(p=>p.filter(x=>x.id!==w.id))} className="text-zinc-700 hover:text-red-400"><X size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="measurements"&&(
        <div className="px-4">
          <button onClick={()=>setAddingMeasure(!addingMeasure)} className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">
            {addingMeasure?"Cancel":"+ Log Measurements"}
          </button>
          {addingMeasure&&(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-sm font-semibold mb-3">Today's Measurements ({settings.measureUnit})</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {MEASURE_FIELDS.map(({key,label})=>(
                  <div key={key}>
                    <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
                    <input type="number" value={newMeasures[key]||""} onChange={e=>setNewMeasures(p=>({...p,[key]:e.target.value}))}
                      placeholder="—" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm text-center"/>
                  </div>
                ))}
              </div>
              <button onClick={addMeasures} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3" style={H}>Save Measurements</button>
            </div>
          )}
          {[...measurements].reverse().slice(0,5).map(m=>(
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-zinc-300 font-semibold">{new Date(m.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                <button onClick={()=>saveMeasurements(p=>p.filter(x=>x.id!==m.id))} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {MEASURE_FIELDS.filter(({key})=>m[key]).map(({key,label})=>(
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-zinc-400">{label}</span>
                    <span className="text-white font-medium">{m[key]} {settings.measureUnit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="photos"&&(
        <div className="px-4">
          <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handlePhoto} className="hidden"/>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={()=>fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center py-8 text-zinc-400 gap-2">
              <Camera size={24}/><span className="text-xs">Take Photo</span>
            </button>
            <button onClick={()=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=e=>handlePhoto(e);i.click();}}
              className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center py-8 text-zinc-400 gap-2">
              <ImageIcon size={24}/><span className="text-xs">Upload Photo</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {photos.map(p=>(
              <div key={p.id} onClick={()=>setViewPhoto(p)} className="relative cursor-pointer group">
                <img src={p.photo} alt={p.date} className="w-full rounded-2xl object-cover" style={{aspectRatio:"3/4"}}/>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 to-transparent rounded-b-2xl px-2 py-2">
                  <div className="text-xs text-zinc-300">{new Date(p.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();savePhotos(prev=>prev.filter(x=>x.id!==p.id));}} className="absolute top-2 right-2 bg-zinc-900 bg-opacity-80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} className="text-white"/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewPhoto&&(
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={()=>setViewPhoto(null)}>
          <div className="flex justify-between items-center px-4 py-4">
            <span className="text-white text-sm">{new Date(viewPhoto.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</span>
            <button className="text-white"><X size={22}/></button>
          </div>
          <img src={viewPhoto.photo} alt="" className="flex-1 object-contain"/>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ settings, foodLogs, workouts }) {
  const entries=foodLogs[todayDate()]||[];
  const totals=dayTotals(entries);
  const streak=calcStreak(workouts);
  const todayW=workouts.find(w=>w.date===todayDate());
  const hr=new Date().getHours();
  const greeting=hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
  return (
    <div className="px-4 pt-12 md:pt-6 pb-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-zinc-400 text-sm">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
          <h1 className="text-3xl font-bold leading-tight" style={H}>{greeting}, Dave 👋</h1>
        </div>
        {streak>0&&(
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-orange-500" style={{background:"rgba(249,115,22,0.1)"}}>
            <Flame size={16} className="text-orange-400"/>
            <span className="text-orange-400 font-bold text-base" style={H}>{streak}</span>
          </div>
        )}
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 md:mb-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-zinc-200">Today's Nutrition</span>
            <span className="text-xs text-zinc-500">Goal: {settings.calorieGoal} kcal</span>
          </div>
          <div className="flex items-center gap-5">
            <CalRing eaten={totals.cal} goal={settings.calorieGoal}/>
            <div className="flex-1 space-y-3">
              <MBar label="Protein" val={totals.protein} goal={settings.proteinGoal} color="bg-sky-400"/>
              <MBar label="Carbs" val={totals.carbs} goal={settings.carbsGoal} color="bg-amber-400"/>
              <MBar label="Fat" val={totals.fat} goal={settings.fatGoal} color="bg-rose-400"/>
              <MBar label="Fiber" val={totals.fiber} goal={settings.fiberGoal} color="bg-emerald-400"/>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-sm font-semibold text-zinc-200 mb-2">Today's Workout</div>
          {todayW ? (
            <div>
              <div className="font-semibold text-white">{todayW.name}</div>
              <div className="text-xs text-zinc-400 mt-1">{(todayW.exercises||[]).length} exercises · {numFmt(round(calcVolume(todayW.exercises)))} {settings.units} volume</div>
              <div className="flex gap-2 mt-2 flex-wrap">{(todayW.exercises||[]).map((ex,i)=><span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>)}</div>
            </div>
          ) : <div className="text-zinc-500 text-sm">No workout logged today. Get after it! 💪</div>}
        </div>
      </div>
    </div>
  );
}

// ── PROGRESS PAGE ─────────────────────────────────────────────────────────────
function ProgressPage({ workouts, settings }) {
  const [selEx,setSelEx]=useState(EX_DB[0]?.id||"");
  const [weights]=useStorage("ft_weights",[]);
  const chartData=workouts.filter(w=>(w.exercises||[]).some(e=>e.id===selEx)).slice(0,20).reverse().map(w=>{
    const ex=(w.exercises||[]).find(e=>e.id===selEx);
    const done=(ex?.sets||[]).filter(s=>s.done);
    const maxW=done.length?Math.max(...done.map(s=>parseFloat(s.weight)||0)):0;
    const vol=round(done.reduce((s,set)=>s+(parseFloat(set.weight)||0)*(parseInt(set.reps)||0),0));
    return {date:w.date.slice(5),maxW,vol};
  });
  const streak=calcStreak(workouts);
  const totalVol=workouts.reduce((t,w)=>t+calcVolume(w.exercises||[]),0);
  const weightChartData=weights.slice(-20).map(w=>({date:w.date.slice(5),w:w.weight}));
  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Progress</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[["Streak",streak,"days","text-orange-400"],["Sessions",workouts.length,"total","text-lime-400"],
          ["Volume",(totalVol/1000).toFixed(1),"tonnes","text-sky-400"]].map(([l,v,u,c])=>(
          <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-center">
            <div className={`text-3xl font-bold ${c}`} style={H}>{v}</div>
            <div className="text-xs text-zinc-500">{u}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 md:mb-0">
          <div className="text-sm font-semibold text-zinc-200 mb-3">Exercise Trend</div>
          <div className="relative mb-4">
            <select value={selEx} onChange={e=>setSelEx(e.target.value)}
              className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm pr-10">
              {CATS.map(c=><optgroup key={c} label={c}>{EX_DB.filter(e=>e.cat===c).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3.5 text-zinc-500 pointer-events-none"/>
          </div>
          {chartData.length<2
            ? <div className="text-center text-zinc-500 py-8 text-sm">Log this exercise 2+ times to see trends.</div>
            : <>
              <div className="text-xs text-zinc-400 mb-2 font-medium">Max Weight ({settings.units})</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/><YAxis tick={{fill:"#52525b",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                  <Line type="monotone" dataKey="maxW" name="Max Weight" stroke="#a3e635" strokeWidth={2.5} dot={{fill:"#a3e635",r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-zinc-400 mt-4 mb-2 font-medium">Session Volume ({settings.units})</div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                  <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/><YAxis tick={{fill:"#52525b",fontSize:10}}/>
                  <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                  <Line type="monotone" dataKey="vol" name="Volume" stroke="#38bdf8" strokeWidth={2.5} dot={{fill:"#38bdf8",r:3,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </>
          }
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-sm font-semibold text-zinc-200 mb-3">Body Weight</div>
          {weightChartData.length<2
            ? <div className="text-center text-zinc-500 py-8 text-sm">Log weight in the Body tab to see your trend.</div>
            : <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightChartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
                <XAxis dataKey="date" tick={{fill:"#52525b",fontSize:10}}/><YAxis tick={{fill:"#52525b",fontSize:10}} domain={["auto","auto"]}/>
                <Tooltip contentStyle={{background:"#18181b",border:"1px solid #3f3f46",borderRadius:8,color:"#fff",fontSize:12}}/>
                <Line type="monotone" dataKey="w" name={`Weight (${settings.units})`} stroke="#a3e635" strokeWidth={2.5} dot={{fill:"#a3e635",r:3,strokeWidth:0}}/>
              </LineChart>
            </ResponsiveContainer>
          }
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS PAGE ─────────────────────────────────────────────────────────────
function SettingsPage({ settings, saveSettings }) {
  const upd=(k,v)=>saveSettings(p=>({...p,[k]:isNaN(parseFloat(v))?v:parseFloat(v)}));
  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Settings</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Nutrition Goals</div>
        {[["Calorie Goal","calorieGoal","kcal/day"],["Protein Goal","proteinGoal","g/day"],["Carbs Goal","carbsGoal","g/day"],["Fat Goal","fatGoal","g/day"],["Fiber Goal","fiberGoal","g/day"]].map(([label,key,unit])=>(
          <div key={key} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
            <div><div className="text-sm text-white font-medium">{label}</div><div className="text-xs text-zinc-500">{unit}</div></div>
            <input type="number" value={settings[key]} onChange={e=>upd(key,e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-24 text-center font-bold" style={H}/>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Workout</div>
        <div className="flex items-center justify-between py-3 border-b border-zinc-800">
          <div><div className="text-sm text-white font-medium">Default Rest Time</div><div className="text-xs text-zinc-500">seconds</div></div>
          <input type="number" value={settings.restTime} onChange={e=>upd("restTime",e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-24 text-center font-bold" style={H}/>
        </div>
        <div className="flex items-center justify-between py-3">
          <div><div className="text-sm text-white font-medium">Weight Units</div></div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {["kg","lbs"].map(u=><button key={u} onClick={()=>upd("units",u)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${settings.units===u?"bg-lime-400 text-zinc-950":"text-zinc-400"}`} style={H}>{u}</button>)}
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Body Tracking</div>
        <div className="flex items-center justify-between py-3">
          <div><div className="text-sm text-white font-medium">Measurement Units</div></div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {["cm","in"].map(u=><button key={u} onClick={()=>upd("measureUnit",u)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${settings.measureUnit===u?"bg-lime-400 text-zinc-950":"text-zinc-400"}`} style={H}>{u}</button>)}
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="font-semibold text-white mb-1">FitTrack v2</div>
        <div className="text-sm text-zinc-400">All data is stored privately in your browser. For cross-device sync, Supabase migration is coming.</div>
      </div>
    </div>
  );
}

// ── LAYOUT ────────────────────────────────────────────────────────────────────
const NAV_TABS = [
  {id:"dashboard",icon:Home,label:"Home"},
  {id:"nutrition",icon:Utensils,label:"Food"},
  {id:"workout",icon:Dumbbell,label:"Train"},
  {id:"body",icon:Scale,label:"Body"},
  {id:"progress",icon:TrendingUp,label:"Progress"},
  {id:"settings",icon:Settings,label:"Settings"},
];

function Sidebar({ page, setPage }) {
  return (
    <div className="hidden md:flex md:flex-col md:w-56 md:min-h-screen bg-zinc-900 border-r border-zinc-800 fixed top-0 left-0 bottom-0 z-30">
      <div className="px-5 py-6 border-b border-zinc-800">
        <div className="text-2xl font-bold text-lime-400" style={H}>FitTrack</div>
        <div className="text-xs text-zinc-500 mt-0.5">Personal fitness app</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_TABS.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>setPage(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
              ${page===id?"bg-lime-400 text-zinc-950":"text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}>
            <Icon size={18} strokeWidth={page===id?2.5:1.5}/>
            <span style={page===id?H:{}}>{label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-600">v2.0 · Dave</div>
      </div>
    </div>
  );
}

function BottomNav({ page, setPage, hasActive }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-1.5 z-40">
      {NAV_TABS.map(({id,icon:Icon,label})=>(
        <button key={id} onClick={()=>setPage(id)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl relative ${page===id?"text-lime-400":"text-zinc-500"}`}>
          <Icon size={19} strokeWidth={page===id?2.5:1.5}/>
          <span className="text-xs">{label}</span>
          {id==="workout"&&hasActive&&<span className="absolute top-1 right-1 w-2 h-2 bg-lime-400 rounded-full"/>}
        </button>
      ))}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(()=>{
    const link=document.createElement("link");
    link.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap";
    link.rel="stylesheet";
    document.head.appendChild(link);
  },[]);

  const [page,setPage]=useState("dashboard");
  const [settings,saveSettings]=useStorage("ft_settings",DEFAULTS);
  const [workouts,saveWorkouts]=useStorage("ft_workouts",[]);
  const [customFoods,saveCustomFoods]=useStorage("ft_custom_foods",[]);
  const [foodLogs,saveFoodLogs]=useStorage("ft_food_logs",{});
  const [recipes,saveRecipes]=useStorage("ft_recipes",[]);
  const [activeWorkout,setActiveWorkout]=useState(null);

  const addFoodLog=(date,entry)=>saveFoodLogs(p=>({...p,[date]:[...(p[date]||[]),{...entry,id:uid()}]}));
  const removeFoodLog=(date,id)=>saveFoodLogs(p=>({...p,[date]:(p[date]||[]).filter(e=>e.id!==id)}));
  const addWorkout=(w)=>saveWorkouts(p=>[w,...p]);
  const updateWorkout=(id,updated)=>saveWorkouts(p=>p.map(w=>w.id===id?updated:w));

  const shared={settings,saveSettings,workouts,addWorkout,updateWorkout,foodLogs,addFoodLog,removeFoodLog,
    customFoods,saveCustomFoods,recipes,saveRecipes,activeWorkout,setActiveWorkout};

  return (
    <div className="bg-zinc-950 min-h-screen text-white" style={{fontFamily:"'DM Sans', sans-serif"}}>
      <Sidebar page={page} setPage={setPage}/>
      <div className="md:ml-56 pb-20 md:pb-4">
        <div className="max-w-2xl md:max-w-4xl mx-auto">
          {page==="dashboard"&&<Dashboard {...shared}/>}
          {page==="nutrition"&&<NutritionPage {...shared}/>}
          {page==="workout"&&<WorkoutPage {...shared}/>}
          {page==="body"&&<BodyPage {...shared}/>}
          {page==="progress"&&<ProgressPage {...shared}/>}
          {page==="settings"&&<SettingsPage {...shared}/>}
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} hasActive={!!activeWorkout}/>
    </div>
  );
}
