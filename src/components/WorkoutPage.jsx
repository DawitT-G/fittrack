import { useState, useEffect, useRef } from "react";
import { Zap, Flame, Plus, Trash2, Check, Star, Timer, X, Edit2, Search } from "lucide-react";
import { Modal } from "./ui";
import { H, EX_DB, CATS, DAYS } from "../lib/constants";
import { todayDate, calcStreak, calcVolume, getPR, getLastSession, round, numFmt, uid } from "../lib/utils";

// ── Exercise Picker ───────────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = EX_DB.filter(
    (e) => (cat === "All" || e.cat === cat) && e.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Modal title="Add Exercise" onClose={onClose}>
      <div className="p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm mb-3" />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {["All", ...CATS].map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border flex-shrink-0
                ${cat === c ? "bg-lime-400 text-zinc-950 border-lime-400" : "text-zinc-400 border-zinc-700"}`}>
              {c}
            </button>
          ))}
        </div>
        {filtered.map((ex) => (
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

// ── Workout Detail Modal ──────────────────────────────────────────────────────
function WorkoutDetailModal({ workout, settings, workouts, onClose, onEdit }) {
  const vol = calcVolume(workout.exercises || []);
  const dur = workout.endTime ? Math.round((workout.endTime - workout.startTime) / 60000) : 0;
  return (
    <Modal title="Workout Details" onClose={onClose}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xl font-bold" style={H}>{workout.name}</div>
            <div className="text-sm text-zinc-400">
              {new Date(workout.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 text-lime-400 text-xs font-semibold border border-lime-400 px-3 py-1.5 rounded-full">
            <Edit2 size={12} />Edit
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ["Volume", numFmt(round(vol)) + " " + settings.units, "text-lime-400"],
            ["Duration", dur + " min", "text-sky-400"],
            ["Exercises", (workout.exercises || []).length + "", "text-amber-400"],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-zinc-800 rounded-xl p-3 text-center">
              <div className={`text-lg font-bold ${c}`} style={H}>{v}</div>
              <div className="text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </div>
        {(workout.exercises || []).map((ex, ei) => {
          const done = (ex.sets || []).filter((s) => s.done);
          return (
            <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
              <div className="font-bold mb-2" style={{ ...H, fontSize: "17px" }}>{ex.name}</div>
              {ex.cardio ? (
                done.map((s, si) => (
                  <div key={si} className="flex gap-4 text-sm py-1 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-500 w-5">{si + 1}</span>
                    {s.duration && <span>{s.duration} min</span>}
                    {s.distance && <span className="text-zinc-300">{s.distance} km</span>}
                  </div>
                ))
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-1 text-xs text-zinc-600 mb-1">
                    <div className="col-span-2">#</div>
                    <div className="col-span-5">{settings.units}</div>
                    <div className="col-span-5">Reps</div>
                  </div>
                  {done.map((s, si) => {
                    const pr = getPR(ex.id, s.weight, s.reps, workouts.filter((w) => w.id !== workout.id));
                    return (
                      <div key={si} className="grid grid-cols-12 gap-1 py-1.5 border-b border-zinc-800 last:border-0 text-sm">
                        <div className="col-span-2 flex items-center gap-0.5 text-zinc-500">
                          {si + 1}{pr && <Star size={9} className="text-yellow-400" style={{ fill: "#facc15" }} />}
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

// ── Active Workout ────────────────────────────────────────────────────────────
function ActiveWorkout({ workout, setWorkout, onFinish, settings, workouts, isEditing }) {
  const [showPicker, setShowPicker] = useState(false);
  const [rest, setRest] = useState({ active: false, remaining: 0 });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const isActive = workout.phase === "active";

  useEffect(() => {
    if (!isActive) return;
    if (!startRef.current) startRef.current = Date.now() - (workout.savedElapsed || 0) * 1000;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  useEffect(() => {
    if (rest.active && rest.remaining > 0) {
      timerRef.current = setTimeout(() => setRest((p) => ({ ...p, remaining: p.remaining - 1 })), 1000);
    } else if (rest.active && rest.remaining === 0) {
      setRest((p) => ({ ...p, active: false }));
    }
    return () => clearTimeout(timerRef.current);
  }, [rest.active, rest.remaining]);

  const addExercise = (ex) => setWorkout((w) => ({
    ...w,
    exercises: [...w.exercises, {
      id: ex.id, name: ex.name, cat: ex.cat, cardio: !!ex.cardio,
      sets: [ex.cardio ? { duration: "", distance: "", done: false } : { weight: "", reps: "", done: false }],
    }],
  }));

  const addSet = (ei) => setWorkout((w) => ({
    ...w,
    exercises: w.exercises.map((ex, i) => {
      if (i !== ei) return ex;
      const last = ex.sets[ex.sets.length - 1] || {};
      return {
        ...ex, sets: [...ex.sets,
          ex.cardio
            ? { duration: last.duration || "", distance: last.distance || "", done: false }
            : { weight: last.weight || "", reps: last.reps || "", done: false }],
      };
    }),
  }));

  const updateSet = (ei, si, f, v) => setWorkout((w) => ({
    ...w,
    exercises: w.exercises.map((ex, i) => i !== ei ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== si ? s : { ...s, [f]: v }),
    }),
  }));

  const toggleDone = (ei, si) => {
    const wasOff = !workout.exercises[ei].sets[si].done;
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex, i) => i !== ei ? ex : {
        ...ex, sets: ex.sets.map((s, j) => j !== si ? s : { ...s, done: !s.done }),
      }),
    }));
    if (wasOff) setRest({ active: true, remaining: settings.restTime });
  };

  const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const volume = calcVolume(workout.exercises);
  const doneCount = (workout.exercises || []).reduce((t, ex) => t + (ex.sets || []).filter((s) => s.done).length, 0);

  // ── Setup phase ─────────────────────────────────────────────────────────────
  if (!isActive) return (
    <div className="pb-4 min-h-screen">
      <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-4 pt-10 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-3">
            <input value={workout.name} onChange={(e) => setWorkout((w) => ({ ...w, name: e.target.value }))}
              className="text-xl font-bold bg-transparent text-white outline-none w-full" style={H} />
            <div className="text-xs text-zinc-500 mt-0.5">{workout.exercises.length} exercises · Tap Begin when ready</div>
          </div>
          <button
            onClick={() => setWorkout((w) => ({ ...w, phase: "active", startTime: Date.now() }))}
            disabled={!workout.exercises.length}
            className="bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold text-sm px-5 py-2.5 rounded-full flex-shrink-0 flex items-center gap-1.5"
            style={H}>
            <Zap size={14} /> Begin
          </button>
        </div>
      </div>
      <div className="px-4 mt-3 space-y-3">
        {workout.exercises.map((ex, ei) => (
          <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 flex justify-between items-center">
            <div>
              <div className="font-semibold text-white" style={H}>{ex.name}</div>
              <div className="text-xs text-zinc-500">{ex.cat} · {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
                <button onClick={() => ex.sets.length > 1 && setWorkout((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) }) }))}
                  className="text-zinc-400 px-2 py-1 text-sm hover:bg-zinc-800">−</button>
                <span className="text-white text-xs px-2 py-1 border-x border-zinc-700">{ex.sets.length}</span>
                <button onClick={() => setWorkout((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: [...e.sets, e.cardio ? { duration: "", distance: "", done: false } : { weight: "", reps: "", done: false }] }) }))}
                  className="text-zinc-400 px-2 py-1 text-sm hover:bg-zinc-800">+</button>
              </div>
              <button onClick={() => setWorkout((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }))}
                className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <button onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-zinc-800 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors"
          style={H}>
          + Add Exercise
        </button>
      </div>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  );

  // ── Active phase ─────────────────────────────────────────────────────────────
  return (
    <div className="pb-4 min-h-screen">
      <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-4 pt-10 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 mr-3">
            <input value={workout.name} onChange={(e) => setWorkout((w) => ({ ...w, name: e.target.value }))}
              className="text-xl font-bold bg-transparent text-white outline-none w-full" style={H} />
            <div className="text-xs text-zinc-400">
              {fmtT(elapsed)} · {numFmt(round(volume))} {settings.units} · {doneCount} sets done
            </div>
          </div>
          <button onClick={() => onFinish()}
            className="bg-lime-400 text-zinc-950 font-bold text-sm px-4 py-2 rounded-full flex-shrink-0" style={H}>
            {isEditing ? "Save" : "Finish"}
          </button>
        </div>
      </div>

      {/* Rest timer */}
      {rest.active && (
        <div className="mx-4 mt-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={15} className="text-lime-400" /><span className="text-xs font-medium">Rest</span>
          </div>
          <div className="text-2xl font-bold text-lime-400" style={H}>{fmtT(rest.remaining)}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRest((p) => ({ ...p, remaining: Math.max(0, p.remaining - 15) }))}
              className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">−15</button>
            <button onClick={() => setRest((p) => ({ ...p, remaining: p.remaining + 15 }))}
              className="text-xs text-zinc-400 border border-zinc-600 rounded-lg px-2 py-1">+15</button>
            <button onClick={() => setRest({ active: false, remaining: 0 })} className="text-xs text-zinc-500 ml-1">Skip</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-3 space-y-3">
        {workout.exercises.map((ex, ei) => {
          const prev = !isEditing ? getLastSession(ex.id, workouts) : null;
          return (
            <div key={ei} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-white" style={{ ...H, fontSize: "18px" }}>{ex.name}</div>
                  <div className="text-xs text-zinc-500">{ex.cat}</div>
                </div>
                <button onClick={() => setWorkout((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }))}
                  className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
              </div>

              {prev && prev.length > 0 && (
                <div className="text-xs text-zinc-500 bg-zinc-800 rounded-lg px-3 py-2 mb-3">
                  <span className="text-zinc-400 font-medium">Last: </span>
                  {prev.map((s) => `${s.weight || "?"}×${s.reps || "?"}`).join(" · ")}
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
                  {ex.sets.map((s, si) => (
                    <div key={si} className={`grid grid-cols-12 gap-1.5 mb-1.5 items-center ${s.done ? "opacity-60" : ""}`}>
                      <div className="col-span-1 text-xs text-zinc-500">{si + 1}</div>
                      <input type="number" value={s.duration} onChange={(e) => updateSet(ei, si, "duration", e.target.value)} placeholder="0"
                        className="col-span-5 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white" />
                      <input type="number" value={s.distance} onChange={(e) => updateSet(ei, si, "distance", e.target.value)} placeholder="0"
                        className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white" />
                      <div className="col-span-2 flex justify-center">
                        <button onClick={() => toggleDone(ei, si)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.done ? "bg-lime-400 border-lime-400 text-zinc-950" : "border-zinc-600 text-zinc-600"}`}>
                          <Check size={15} />
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
                  {ex.sets.map((s, si) => {
                    const pr = s.done && getPR(ex.id, s.weight, s.reps, workouts);
                    return (
                      <div key={si} className={`grid grid-cols-12 gap-1.5 mb-1.5 items-center ${s.done ? "opacity-60" : ""}`}>
                        <div className="col-span-1 flex items-center gap-0.5">
                          <span className="text-xs text-zinc-500">{si + 1}</span>
                          {pr && <Star size={9} className="text-yellow-400" style={{ fill: "#facc15" }} />}
                        </div>
                        <input type="number" value={s.weight} onChange={(e) => updateSet(ei, si, "weight", e.target.value)} placeholder="0"
                          className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white" />
                        <input type="number" value={s.reps} onChange={(e) => updateSet(ei, si, "reps", e.target.value)} placeholder="0"
                          className="col-span-4 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2.5 text-sm font-medium text-white" />
                        <div className="col-span-3 flex justify-center gap-1.5">
                          <button onClick={() => toggleDone(ei, si)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.done ? "bg-lime-400 border-lime-400 text-zinc-950" : "border-zinc-600 text-zinc-600"}`}>
                            <Check size={15} />
                          </button>
                          {ex.sets.length > 1 && (
                            <button onClick={() => setWorkout((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }) }))}
                              className="text-zinc-700 hover:text-red-400"><X size={12} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <button onClick={() => addSet(ei)}
                className="w-full text-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-lg py-2 mt-2">
                + Add Set
              </button>
            </div>
          );
        })}
        <button onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-zinc-800 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors"
          style={H}>
          + Add Exercise
        </button>
      </div>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

// ── Routines Manager ──────────────────────────────────────────────────────────
function RoutinesManager({ routines, onAdd, onDelete, onStartRoutine, onClose }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", days: [], exercises: [] });
  const [showPicker, setShowPicker] = useState(false);
  const today = new Date().getDay();

  const toggleDay = (d) => setForm((f) => ({
    ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
  }));
  const addEx = (ex) => setForm((f) => ({
    ...f, exercises: [...f.exercises, { id: ex.id, name: ex.name, cat: ex.cat, cardio: !!ex.cardio, sets: 3, reps: 8 }],
  }));

  if (creating) return (
    <Modal title="New Routine" onClose={() => setCreating(false)}>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Routine name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Push Day, Legs…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Days</label>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border ${form.days.includes(i) ? "bg-lime-400 border-lime-400 text-zinc-950" : "border-zinc-700 text-zinc-400"}`}
                style={H}>{d[0]}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-zinc-400">Exercises</label>
            <button onClick={() => setShowPicker(true)} className="text-lime-400 text-xs">+ Add</button>
          </div>
          {form.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2.5 mb-1.5">
              <div className="flex-1 text-sm font-medium text-white">{ex.name}</div>
              {!ex.cardio && (
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <input type="number" value={ex.sets}
                    onChange={(e) => setForm((f) => ({ ...f, exercises: f.exercises.map((x, j) => j === i ? { ...x, sets: parseInt(e.target.value) || 3 } : x) }))}
                    className="w-9 text-center bg-zinc-700 border border-zinc-600 rounded py-1 text-white" />
                  <span>×</span>
                  <input type="number" value={ex.reps}
                    onChange={(e) => setForm((f) => ({ ...f, exercises: f.exercises.map((x, j) => j === i ? { ...x, reps: parseInt(e.target.value) || 8 } : x) }))}
                    className="w-9 text-center bg-zinc-700 border border-zinc-600 rounded py-1 text-white" />
                </div>
              )}
              <button onClick={() => setForm((f) => ({ ...f, exercises: f.exercises.filter((_, j) => j !== i) }))}
                className="text-zinc-600 hover:text-red-400"><X size={14} /></button>
            </div>
          ))}
        </div>
        <button
          onClick={() => { if (!form.name.trim() || !form.exercises.length) return; onAdd(form); setCreating(false); setForm({ name: "", days: [], exercises: [] }); }}
          disabled={!form.name.trim() || !form.exercises.length}
          className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
          Save Routine
        </button>
      </div>
      {showPicker && <ExercisePicker onSelect={addEx} onClose={() => setShowPicker(false)} />}
    </Modal>
  );

  return (
    <Modal title="Routines" onClose={onClose}>
      <div className="p-4">
        <button onClick={() => setCreating(true)}
          className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">
          + New Routine
        </button>
        {!routines.length ? (
          <div className="text-center text-zinc-500 py-8 text-sm">No routines yet. Create your first one!</div>
        ) : routines.map((r) => (
          <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-2">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-white flex items-center gap-2">
                  {r.name}
                  {r.days?.includes(today) && (
                    <span className="text-xs bg-lime-400 text-zinc-950 px-1.5 py-0.5 rounded-full font-bold" style={H}>TODAY</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{(r.exercises || []).map((e) => e.name).join(", ").slice(0, 55)}</div>
              </div>
              <button onClick={() => onDelete(r.id)} className="text-zinc-600 hover:text-red-400 ml-2"><Trash2 size={14} /></button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {DAYS.map((d, i) => (
                  <div key={d} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${r.days?.includes(i) ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-600"}`} style={H}>{d[0]}</div>
                ))}
              </div>
              <button onClick={() => onStartRoutine(r)}
                className="text-xs bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-lime-400 font-bold px-3 py-1.5 rounded-full border border-lime-400 transition-colors"
                style={H}>Start</button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Workout Page ──────────────────────────────────────────────────────────────
export default function WorkoutPage({ data }) {
  const { settings, workouts, routines, addWorkout, updateWorkout, addRoutine, deleteRoutine } = data;
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [showRoutines, setShowRoutines] = useState(false);
  const [detailWorkout, setDetailWorkout] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const streak = calcStreak(workouts);

  const startWorkout = (routine) => {
    const exercises = routine
      ? routine.exercises.map((ex) => ({
        id: ex.id, name: ex.name, cat: ex.cat, cardio: !!ex.cardio,
        sets: Array(ex.sets || 1).fill(null).map(() =>
          ex.cardio ? { duration: "", distance: "", done: false } : { weight: "", reps: "", done: false }
        ),
      }))
      : [];
    setActiveWorkout({
      id: uid(),
      name: routine ? routine.name : `Workout – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      date: todayDate(), startTime: null, exercises, phase: "setup",
    });
    setShowRoutines(false);
  };

  const finishWorkout = () => {
    const w = { ...activeWorkout, endTime: Date.now() };
    if (editingId) { updateWorkout(editingId, w); setEditingId(null); }
    else { addWorkout(w); }
    setActiveWorkout(null);
  };

  if (activeWorkout) return (
    <ActiveWorkout workout={activeWorkout} setWorkout={setActiveWorkout} onFinish={finishWorkout}
      settings={settings} workouts={workouts} isEditing={!!editingId} />
  );

  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold" style={H}>Workout</h1>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500"
              style={{ background: "rgba(249,115,22,0.1)" }}>
              <Flame size={14} className="text-orange-400" />
              <span className="text-orange-400 font-bold text-sm" style={H}>{streak}</span>
            </div>
          )}
          <button onClick={() => setShowRoutines(true)}
            className="text-zinc-400 text-xs border border-zinc-700 px-3 py-1.5 rounded-full">Routines</button>
        </div>
      </div>

      <button onClick={() => startWorkout(null)}
        className="w-full bg-lime-400 text-zinc-950 font-bold rounded-2xl py-4 mb-4 flex items-center justify-center gap-2 text-lg"
        style={H}>
        <Zap size={20} /> Empty Workout
      </button>

      {/* All routines */}
      {routines.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500 font-semibold mb-2 uppercase tracking-wider">Your Routines</div>
          <div className="space-y-2">
            {routines.map((r) => {
              const isToday = r.days?.includes(new Date().getDay());
              return (
                <button key={r.id} onClick={() => startWorkout(r)}
                  className={`w-full text-left rounded-2xl px-4 py-3 flex justify-between items-center transition-all
                    ${isToday ? "bg-lime-400 bg-opacity-10 border border-lime-400" : "bg-zinc-900 border border-zinc-800"}`}>
                  <div>
                    <div className={`font-bold flex items-center gap-2 ${isToday ? "text-lime-400" : "text-white"}`} style={H}>
                      {r.name}
                      {isToday && <span className="text-xs bg-lime-400 text-zinc-950 px-1.5 py-0.5 rounded-full">TODAY</span>}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{(r.exercises || []).length} exercises</div>
                  </div>
                  <Zap size={16} className={isToday ? "text-lime-400" : "text-zinc-500"} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="text-xs text-zinc-500 font-semibold mb-2 uppercase tracking-wider">History</div>
      {!workouts.length ? (
        <div className="text-zinc-600 text-sm text-center py-8">No workouts yet. Start your first session!</div>
      ) : workouts.slice(0, 20).map((w) => {
        const vol = calcVolume(w.exercises || []);
        const dur = w.endTime ? Math.round((w.endTime - w.startTime) / 60000) : 0;
        return (
          <div key={w.id} onClick={() => setDetailWorkout(w)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-2 cursor-pointer active:scale-99 transition-transform">
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <div className="font-semibold text-sm text-white">{w.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {dur > 0 && ` · ${dur} min`}
                </div>
              </div>
              <div className="font-bold text-sm text-lime-400" style={H}>{numFmt(round(vol))} {settings.units}</div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(w.exercises || []).map((ex, i) => (
                <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
              ))}
            </div>
          </div>
        );
      })}

      {showRoutines && (
        <RoutinesManager routines={routines} onAdd={(r) => addRoutine(r)} onDelete={(id) => deleteRoutine(id)}
          onStartRoutine={startWorkout} onClose={() => setShowRoutines(false)} />
      )}
      {detailWorkout && (
        <WorkoutDetailModal workout={detailWorkout} settings={settings} workouts={workouts}
          onClose={() => setDetailWorkout(null)}
          onEdit={() => {
            setEditingId(detailWorkout.id);
            setActiveWorkout({ ...detailWorkout, phase: "active", savedElapsed: detailWorkout.endTime ? Math.round((detailWorkout.endTime - detailWorkout.startTime) / 1000) : 0 });
            setDetailWorkout(null);
          }} />
      )}
    </div>
  );
}
