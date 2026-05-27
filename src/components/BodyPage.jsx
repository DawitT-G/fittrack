import { useState, useRef, useMemo } from "react";
import { Camera, X, Trash2, RefreshCw, Edit2, Info, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { H, MEASURE_FIELDS, BODY_POINTS, INCREASE_GOOD } from "../lib/constants";
import { todayDate, round } from "../lib/utils";

// ── Measurement guide — how to measure each field ────────────────────────────
const MEASURE_GUIDE = {
  neck:      "Circumference around the middle of the neck, just below the larynx.",
  shoulders: "Circumference around the widest point of both shoulders.",
  chest:     "Circumference around the fullest part of the chest, arms relaxed at sides.",
  bicep_l:   "Circumference around the largest part of the left upper arm, flexed.",
  bicep_r:   "Circumference around the largest part of the right upper arm, flexed.",
  waist:     "Circumference at the narrowest point of the torso, usually just above the navel.",
  belly:     "Circumference around the navel. Exhale naturally before measuring.",
  hips:      "Circumference around the widest part of the hips and glutes.",
  thigh_l:   "Circumference around the largest part of the left thigh, standing relaxed.",
  thigh_r:   "Circumference around the largest part of the right thigh, standing relaxed.",
  calf_l:    "Circumference around the largest part of the left calf, standing relaxed.",
  calf_r:    "Circumference around the largest part of the right calf, standing relaxed.",
};

// ── Body Diagram — improved SVG ───────────────────────────────────────────────
function BodyDiagram({ activePoint, onPointClick, latestData }) {
  return (
    <svg viewBox="0 0 200 320" className="w-full max-w-[160px] mx-auto select-none">
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#27272a" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Head */}
      <ellipse cx="100" cy="34" rx="18" ry="22" fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Ears */}
      <ellipse cx="82" cy="34" rx="4" ry="6" fill="#2a2a2e" stroke="#52525b" strokeWidth="1" />
      <ellipse cx="118" cy="34" rx="4" ry="6" fill="#2a2a2e" stroke="#52525b" strokeWidth="1" />
      {/* Neck */}
      <rect x="94" y="54" width="12" height="10" rx="3" fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1" />

      {/* Torso — trapezoid shape */}
      <path d="M70 64 L130 64 L138 105 L135 190 L65 190 L62 105 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Collar bones */}
      <path d="M82 68 Q100 72 118 68" fill="none" stroke="#3f3f46" strokeWidth="1.5" />
      {/* Chest line */}
      <path d="M72 95 Q100 100 128 95" fill="none" stroke="#3f3f46" strokeWidth="1" />
      {/* Abs lines */}
      <path d="M88 118 L112 118" stroke="#3f3f46" strokeWidth="0.8" />
      <path d="M86 135 L114 135" stroke="#3f3f46" strokeWidth="0.8" />
      <path d="M100 108 L100 150" stroke="#3f3f46" strokeWidth="0.8" />

      {/* Left arm */}
      <path d="M70 64 L48 70 L36 112 L38 148 L52 146 L60 108 L68 72 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Left forearm taper */}
      <path d="M38 148 L36 185 L48 186 L52 146 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1" />

      {/* Right arm */}
      <path d="M130 64 L152 70 L164 112 L162 148 L148 146 L140 108 L132 72 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Right forearm taper */}
      <path d="M162 148 L164 185 L152 186 L148 146 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1" />

      {/* Left leg */}
      <path d="M66 190 L62 250 L72 270 L80 270 L84 250 L88 190 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Left calf */}
      <path d="M72 270 L68 305 L80 306 L80 270 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1" />

      {/* Right leg */}
      <path d="M134 190 L138 250 L128 270 L120 270 L116 250 L112 190 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1.5" />
      {/* Right calf */}
      <path d="M128 270 L132 305 L120 306 L120 270 Z"
        fill="url(#bodyGrad)" stroke="#52525b" strokeWidth="1" />

      {/* Measurement points */}
      {BODY_POINTS.map((p) => {
        const isActive = activePoint === p.key;
        const hasVal = latestData?.[p.key];
        return (
          <g key={p.key} onClick={() => onPointClick(p.key)} style={{ cursor: "pointer" }}>
            {isActive && (
              <circle cx={p.cx} cy={p.cy} r="16" fill="#a3e635" opacity="0.15"
                filter="url(#glow)" />
            )}
            <circle
              cx={p.cx} cy={p.cy}
              r={isActive ? 9 : hasVal ? 7 : 6}
              fill={isActive ? "#a3e635" : hasVal ? "#1a2e05" : "#27272a"}
              stroke={isActive ? "#a3e635" : hasVal ? "#4ade80" : "#52525b"}
              strokeWidth={isActive ? 2.5 : 1.5}
              style={isActive ? { filter: "drop-shadow(0 0 6px #a3e635)" } : {}}
            />
            {isActive && (
              <text x={p.cx} y={p.cy + 4} textAnchor="middle"
                fontSize="8" fill="#000" fontWeight="bold">✓</text>
            )}
            {!isActive && hasVal && (
              <circle cx={p.cx + 5} cy={p.cy - 5} r="3"
                fill="#4ade80" stroke="#065f46" strokeWidth="1" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Measurement guide tooltip ─────────────────────────────────────────────────
function MeasureGuide({ activeKey }) {
  if (!activeKey) return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-500 text-center">
      Tap a point on the diagram to select a measurement
    </div>
  );
  const field = MEASURE_FIELDS.find(f => f.key === activeKey);
  const guide = MEASURE_GUIDE[activeKey];
  return (
    <div className="bg-zinc-800 border border-lime-900 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-lime-400 font-semibold text-xs mb-1">
        <Info size={12} />{field?.label}
      </div>
      <div className="text-xs text-zinc-400 leading-relaxed">{guide}</div>
    </div>
  );
}

// ── Measurement Comparison ────────────────────────────────────────────────────
function MeasurementComparison({ measurements }) {
  if (measurements.length < 2) return (
    <div className="text-center text-zinc-500 py-6 text-sm">
      Log measurements at least twice to see your progress.
    </div>
  );
  const first = measurements[0];
  const latest = measurements[measurements.length - 1];
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Baseline: {new Date(first.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span>Latest: {new Date(latest.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      </div>
      {MEASURE_FIELDS.map(({ key, label }) => {
        const from = parseFloat(first.data?.[key]);
        const to = parseFloat(latest.data?.[key]);
        if (!from || !to) return null;
        const delta = to - from;
        const good = INCREASE_GOOD.includes(key) ? delta >= 0 : delta <= 0;
        const pct = Math.min((Math.min(from, to) / Math.max(from, to)) * 100, 100);
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 w-28">{label}</span>
              <span className="text-zinc-300">
                {from} → <span className="text-white font-semibold">{to}</span>
                <span className={`ml-1.5 font-bold ${good ? "text-lime-400" : "text-red-400"}`}>
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                </span>
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${good ? "bg-lime-400" : "bg-red-400"}`}
                style={{ width: `${pct}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Body Fat Calculator ───────────────────────────────────────────────────────
function calcBodyFat(gender, heightCm, neckCm, waistCm, hipCm) {
  const h = parseFloat(heightCm), neck = parseFloat(neckCm);
  const waist = parseFloat(waistCm), hip = parseFloat(hipCm);
  if (!h || !neck || !waist) return null;
  if (gender === "female" && !hip) return null;
  let bf;
  if (gender === "female") {
    const d = 1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h);
    bf = 495 / d - 450;
  } else {
    const d = 1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h);
    bf = 495 / d - 450;
  }
  return Math.max(2, Math.min(60, Math.round(bf * 10) / 10));
}
function getBodyFatCategory(bf, gender) {
  if (gender === "female") {
    if (bf < 14) return { label: "Essential Fat", color: "text-sky-400" };
    if (bf < 21) return { label: "Athlete", color: "text-lime-400" };
    if (bf < 25) return { label: "Fitness", color: "text-lime-400" };
    if (bf < 32) return { label: "Acceptable", color: "text-amber-400" };
    return { label: "High", color: "text-red-400" };
  }
  if (bf < 6)  return { label: "Essential Fat", color: "text-sky-400" };
  if (bf < 14) return { label: "Athlete", color: "text-lime-400" };
  if (bf < 18) return { label: "Fitness", color: "text-lime-400" };
  if (bf < 25) return { label: "Acceptable", color: "text-amber-400" };
  return { label: "High", color: "text-red-400" };
}
function BodyFatCard({ settings, latestMeasure }) {
  const gender = settings.gender || "male";
  const d = latestMeasure?.data || {};
  const missing = [];
  if (!settings.height) missing.push("height (in Settings)");
  if (!d.neck) missing.push("neck measurement");
  if (!d.waist) missing.push("waist measurement");
  if (gender === "female" && !d.hips) missing.push("hips measurement");
  const bf = missing.length === 0 ? calcBodyFat(gender, settings.height, d.neck, d.waist, d.hips) : null;
  const cat = bf !== null ? getBodyFatCategory(bf, gender) : null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Body Fat Estimate</div>
        <div className="text-xs text-zinc-500">US Navy Method</div>
      </div>
      {bf !== null ? (
        <div className="flex items-center gap-4">
          <div>
            <div className={`text-4xl font-bold ${cat.color}`} style={H}>{bf}<span className="text-xl">%</span></div>
            <div className={`text-sm font-semibold mt-0.5 ${cat.color}`}>{cat.label}</div>
          </div>
          <div className="flex-1">
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
              <div className="absolute inset-0 flex">
                <div className="bg-sky-400 opacity-70" style={{ width: gender === "female" ? "14%" : "6%" }} />
                <div className="bg-lime-400 opacity-70" style={{ width: gender === "female" ? "11%" : "12%" }} />
                <div className="bg-lime-600 opacity-70" style={{ width: gender === "female" ? "7%" : "7%" }} />
                <div className="bg-amber-400 opacity-70" style={{ width: gender === "female" ? "14%" : "14%" }} />
                <div className="bg-red-400 opacity-70 flex-1" />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-white rounded"
                style={{ left: `${Math.min(Math.max(bf / 50 * 100, 2), 97)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-600">
              <span>Essential</span><span>Fit</span><span>High</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-zinc-500 text-sm mb-2">Need more data:</div>
          <ul className="space-y-1">
            {missing.map((m) => (
              <li key={m} className="text-xs text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />{m}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-xs text-zinc-600 mt-3">Rough estimate ±3–4%. Not a substitute for professional measurement.</div>
    </div>
  );
}

// ── Main Body Page ────────────────────────────────────────────────────────────
export default function BodyPage({ data }) {
  const { settings, weights, measurements, photos,
    addWeight, deleteWeight, addMeasurement, updateMeasurement, deleteMeasurement,
    uploadPhoto, deletePhoto } = data;

  const [tab, setTab] = useState("weight");
  const [addingWeight, setAddingWeight] = useState(false);
  const [addingMeasure, setAddingMeasure] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState(null); // {id, data}
  const [newWeight, setNewWeight] = useState("");
  const [newMeasures, setNewMeasures] = useState({});
  const [activePoint, setActivePoint] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const latestMeasure = measurements[measurements.length - 1];
  const weightChartData = weights.slice(-20).map((w) => ({ date: w.date.slice(5), w: w.weight }));
  const latestW = weights[weights.length - 1];
  const startW = weights[0];

  const photoGroups = useMemo(() => photos.reduce((g, p) => {
    const k = p.date.slice(0, 7);
    if (!g[k]) g[k] = [];
    g[k].push(p);
    return g;
  }, {}), [photos]);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { await uploadPhoto(file); }
    catch { alert("Photo upload failed. Check Supabase Storage settings."); }
    setUploading(false);
    e.target.value = "";
  };

  const openEdit = (m) => {
    setEditingMeasure({ id: m.id, data: { ...m.data } });
    setActivePoint(null);
    setAddingMeasure(false);
  };

  const saveEdit = () => {
    if (!editingMeasure) return;
    updateMeasurement(editingMeasure.id, editingMeasure.data);
    setEditingMeasure(null);
  };

  return (
    <div className="pt-12 md:pt-6 pb-4">
      <div className="px-4 mb-4"><h1 className="text-3xl font-bold" style={H}>Body</h1></div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-4 px-4">
        {[["weight", "⚖️ Weight"], ["measurements", "📏 Measurements"], ["photos", "📸 Photos"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold ${tab === t ? "text-lime-400 border-b-2 border-lime-400" : "text-zinc-500"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Weight tab ── */}
      {tab === "weight" && (
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              ["Current", latestW ? `${latestW.weight}${settings.units}` : "—", "text-lime-400"],
              ["Start", startW ? `${startW.weight}${settings.units}` : "—", "text-zinc-300"],
              ["Change",
                latestW && startW ? `${latestW.weight >= startW.weight ? "+" : ""}${(latestW.weight - startW.weight).toFixed(1)}${settings.units}` : "—",
                latestW && startW && latestW.weight >= startW.weight ? "text-lime-400" : "text-red-400"],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                <div className={`text-xl font-bold ${c}`} style={H}>{v}</div>
                <div className="text-xs text-zinc-500">{l}</div>
              </div>
            ))}
          </div>
          {weightChartData.length >= 2 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="text-xs text-zinc-400 mb-3 font-medium">Weight Trend ({settings.units})</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weightChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                  <Line type="monotone" dataKey="w" stroke="#a3e635" strokeWidth={2.5} dot={{ fill: "#a3e635", r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <button onClick={() => setAddingWeight(!addingWeight)}
            className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">
            {addingWeight ? "Cancel" : "+ Log Today's Weight"}
          </button>
          {addingWeight && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <div className="flex gap-3 items-end">
                <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                  placeholder={`Weight in ${settings.units}`}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center font-bold" style={H} />
                <button onClick={() => { if (!newWeight) return; addWeight({ date: todayDate(), weight: parseFloat(newWeight) }); setNewWeight(""); setAddingWeight(false); }}
                  className="bg-lime-400 text-zinc-950 font-bold rounded-xl px-5 py-3" style={H}>Save</button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {[...weights].reverse().slice(0, 15).map((w) => (
              <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex justify-between items-center">
                <span className="text-sm text-zinc-400">
                  {new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lime-400" style={H}>{w.weight} {settings.units}</span>
                  <button onClick={() => deleteWeight(w.id)} className="text-zinc-700 hover:text-red-400"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Measurements tab ── */}
      {tab === "measurements" && (
        <div className="px-4">
          <div className="md:flex md:gap-6">
            {/* Diagram column */}
            <div className="md:w-52 flex-shrink-0 mb-4 md:mb-0">
              <BodyDiagram
                activePoint={activePoint}
                onPointClick={(k) => {
                  setActivePoint(k === activePoint ? null : k);
                  setAddingMeasure(true);
                  setEditingMeasure(null);
                }}
                latestData={latestMeasure?.data}
              />
              <div className="mt-2">
                <MeasureGuide activeKey={activePoint} />
              </div>
            </div>

            <div className="flex-1">
              {/* Edit mode */}
              {editingMeasure && (
                <div className="bg-zinc-900 border border-lime-900 rounded-2xl p-4 mb-4">
                  <div className="text-sm font-semibold mb-3 text-lime-400">Edit Measurement</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {MEASURE_FIELDS.map(({ key, label }) => (
                      <div key={key} className="rounded-xl border border-zinc-700">
                        <label className="text-xs text-zinc-400 px-3 pt-2 block">{label}</label>
                        <input type="number"
                          value={editingMeasure.data[key] || ""}
                          onChange={(e) => setEditingMeasure(em => ({ ...em, data: { ...em.data, [key]: e.target.value } }))}
                          placeholder="—"
                          className="w-full bg-transparent px-3 pb-2 text-white text-sm text-center outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 bg-lime-400 text-zinc-950 font-bold rounded-xl py-2.5 flex items-center justify-center gap-1.5" style={H}>
                      <Check size={14} /> Save Changes
                    </button>
                    <button onClick={() => setEditingMeasure(null)} className="px-4 py-2.5 border border-zinc-700 text-zinc-400 rounded-xl text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Add new measurement */}
              {!editingMeasure && (
                <>
                  <button onClick={() => { setAddingMeasure(!addingMeasure); setActivePoint(null); }}
                    className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">
                    {addingMeasure ? "Cancel" : "+ Log Measurements"}
                  </button>
                  {addingMeasure && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
                      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                        Measurements ({settings.measureUnit})
                        {activePoint && (
                          <span className="text-xs text-lime-400 bg-lime-400 bg-opacity-10 px-2 py-0.5 rounded-full">
                            {MEASURE_FIELDS.find((f) => f.key === activePoint)?.label} selected
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {MEASURE_FIELDS.map(({ key, label }) => (
                          <div key={key} onClick={() => setActivePoint(key)}
                            className={`cursor-pointer rounded-xl border transition-colors ${activePoint === key ? "border-lime-400 bg-lime-400 bg-opacity-5" : "border-zinc-700"}`}>
                            <label className="text-xs text-zinc-400 px-3 pt-2 block cursor-pointer">{label}</label>
                            <input type="number" value={newMeasures[key] || ""}
                              onChange={(e) => setNewMeasures((p) => ({ ...p, [key]: e.target.value }))}
                              placeholder="—"
                              className="w-full bg-transparent px-3 pb-2 text-white text-sm text-center outline-none" />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => {
                        if (!Object.values(newMeasures).some((v) => v)) return;
                        addMeasurement(newMeasures);
                        setNewMeasures({}); setAddingMeasure(false); setActivePoint(null);
                      }} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3" style={H}>
                        Save Measurements
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Body fat estimate */}
              <BodyFatCard settings={settings} latestMeasure={latestMeasure} />

              {/* Comparison */}
              {measurements.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
                  <div className="text-sm font-semibold mb-3">Progress Since Baseline</div>
                  <MeasurementComparison measurements={measurements} />
                </div>
              )}

              {/* History with edit button */}
              {[...measurements].reverse().slice(0, 5).map((m) => (
                <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-zinc-300 font-semibold">
                      {new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(m)} className="text-zinc-500 hover:text-lime-400 p-1 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => deleteMeasurement(m.id)} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {MEASURE_FIELDS.filter(({ key }) => m.data?.[key]).map(({ key, label }) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{label}</span>
                        <span className="text-white font-medium">{m.data[key]} {settings.measureUnit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Photos tab ── */}
      {tab === "photos" && (
        <div className="px-4">
          <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} className="hidden" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center py-8 text-zinc-400 gap-2">
              {uploading ? <RefreshCw size={24} className="animate-spin text-lime-400" /> : <Camera size={24} />}
              <span className="text-xs">{uploading ? "Uploading…" : "Take / Upload Photo"}</span>
            </button>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center">
              <div className="text-2xl font-bold text-lime-400 mb-0.5" style={H}>{photos.length}</div>
              <div className="text-xs text-zinc-400">Photos logged</div>
              {photos.length > 0 && (
                <div className="text-xs text-zinc-500 mt-1">
                  Since {new Date(photos[photos.length - 1].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
          {Object.entries(photoGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mPhotos]) => {
            const [yr, mon] = month.split("-");
            const mlabel = new Date(parseInt(yr), parseInt(mon) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
            return (
              <div key={month} className="mb-6">
                <div className="text-sm font-semibold text-zinc-400 mb-3">
                  {mlabel} · {mPhotos.length} photo{mPhotos.length !== 1 ? "s" : ""}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {mPhotos.map((p) => (
                    <div key={p.id} onClick={() => setViewPhoto(p)}
                      className="relative cursor-pointer group rounded-xl overflow-hidden"
                      style={{ aspectRatio: "3/4" }}>
                      <img src={p.photo_url} alt={p.date} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <div className="text-xs text-zinc-200 font-medium">
                          {new Date(p.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deletePhoto(p.id, p.photo_url); }}
                        className="absolute top-1.5 right-1.5 bg-black bg-opacity-60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-screen photo viewer */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewPhoto(null)}>
          <div className="flex justify-between items-center px-4 py-4 bg-black bg-opacity-80">
            <div>
              <div className="text-white font-semibold">
                {new Date(viewPhoto.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div className="text-zinc-400 text-xs mt-0.5">{viewPhoto.date}</div>
            </div>
            <button className="text-white p-1"><X size={22} /></button>
          </div>
          <img src={viewPhoto.photo_url} alt="" className="flex-1 object-contain" />
        </div>
      )}
    </div>
  );
}
