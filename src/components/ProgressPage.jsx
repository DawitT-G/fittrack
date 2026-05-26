import { useState, useMemo } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { H, EX_DB, CATS } from "../lib/constants";
import { calcStreak, calcVolume, round, numFmt } from "../lib/utils";

const TABS = ["Overview", "Calendar", "Weekly Report"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function dateStr(d) {
  return d.toISOString().split("T")[0];
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // 0=Mon..6=Sun
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab({ workouts, foodEntries, settings }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0=Mon

  // Index data by date string
  const workoutsByDate = useMemo(() => workouts.reduce((m, w) => {
    if (!m[w.date]) m[w.date] = [];
    m[w.date].push(w);
    return m;
  }, {}), [workouts]);

  const caloriesByDate = useMemo(() => foodEntries.reduce((m, e) => {
    m[e.date] = (m[e.date] || 0) + (e.calories || 0);
    return m;
  }, {}), [foodEntries]);

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Selected day detail
  const selDate = selected ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selected).padStart(2, "0")}` : null;
  const selWorkouts = selDate ? (workoutsByDate[selDate] || []) : [];
  const selCal = selDate ? (caloriesByDate[selDate] || 0) : 0;
  const selGoalMet = selCal >= settings.calorieGoal;

  const todayStr = dateStr(today);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button onClick={prevMonth} className="p-2 text-zinc-400 hover:text-white"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-white">{monthLabel}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} className={`p-2 ${isCurrentMonth ? "text-zinc-700" : "text-zinc-400 hover:text-white"}`}><ChevronRight size={20} /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Empty cells before first day */}
        {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayWorkouts = workoutsByDate[ds] || [];
          const hasWorkout = dayWorkouts.length > 0;
          const cal = caloriesByDate[ds] || 0;
          const calGoalMet = cal >= settings.calorieGoal && cal > 0;
          const isToday = ds === todayStr;
          const isSel = selected === day;
          const isFuture = ds > todayStr;

          return (
            <button key={day} onClick={() => setSelected(isSel ? null : day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all
                ${isSel ? "ring-2 ring-lime-400" : ""}
                ${isToday ? "bg-zinc-700" : hasWorkout ? "bg-zinc-800" : "bg-zinc-900"}
                ${isFuture ? "opacity-30" : ""}`}>
              <span className={`text-xs font-bold ${isToday ? "text-white" : hasWorkout ? "text-white" : "text-zinc-500"}`}>
                {day}
              </span>
              <div className="flex gap-0.5 mt-0.5">
                {hasWorkout && <div className={`w-1.5 h-1.5 rounded-full ${calGoalMet ? "bg-lime-400" : "bg-sky-400"}`} />}
                {calGoalMet && !hasWorkout && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500 mb-4 px-1">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-lime-400" />Workout + goal</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" />Workout</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" />Goal only</div>
      </div>

      {/* Selected day detail */}
      {selected && selDate && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 mb-4">
          <div className="font-semibold text-white mb-3">
            {new Date(selDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          {selWorkouts.length === 0 && selCal === 0 && (
            <div className="text-zinc-500 text-sm">Rest day — no data logged.</div>
          )}
          {selCal > 0 && (
            <div className={`text-sm mb-2 flex items-center gap-2 ${selGoalMet ? "text-lime-400" : "text-zinc-300"}`}>
              {selGoalMet ? "✓" : "○"} {round(selCal)} kcal logged
              {selGoalMet ? " — goal reached!" : ` — ${round(settings.calorieGoal - selCal)} short of goal`}
            </div>
          )}
          {selWorkouts.map((w) => (
            <div key={w.id} className="bg-zinc-900 rounded-xl p-3 mb-2">
              <div className="font-semibold text-sm text-white">{w.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {(w.exercises || []).length} exercises · {numFmt(round(calcVolume(w.exercises)))} {settings.units}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(w.exercises || []).map((ex, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        {(() => {
          const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
            const d = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            return d;
          });
          const trainDays = monthDates.filter(d => workoutsByDate[d]?.length > 0).length;
          const goalDays = monthDates.filter(d => (caloriesByDate[d] || 0) >= settings.calorieGoal && caloriesByDate[d] > 0).length;
          const restDays = daysInMonth - trainDays;
          return [
            ["Trained", trainDays, "days", "text-sky-400"],
            ["Goal Met", goalDays, "days", "text-lime-400"],
            ["Rest", restDays, "days", "text-zinc-400"],
          ].map(([l, v, u, c]) => (
            <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
              <div className={`text-2xl font-bold ${c}`} style={H}>{v}</div>
              <div className="text-xs text-zinc-500">{u}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

// ── Weekly Report Tab ─────────────────────────────────────────────────────────
function WeeklyReportTab({ workouts, foodEntries, waterEntries, settings }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, sunday } = getWeekRange(weekOffset);
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Filter data for this week
  const weekWorkouts = workouts.filter(w => w.date >= dateStr(monday) && w.date <= dateStr(sunday));
  const weekFood = foodEntries.filter(e => e.date >= dateStr(monday) && e.date <= dateStr(sunday));
  const weekWater = waterEntries.filter(e => e.date >= dateStr(monday) && e.date <= dateStr(sunday));

  // Workout stats
  const trainDays = new Set(weekWorkouts.map(w => w.date)).size;
  const totalVolume = weekWorkouts.reduce((t, w) => t + calcVolume(w.exercises || []), 0);
  const totalMins = weekWorkouts.reduce((t, w) => t + (w.endTime ? Math.round((w.endTime - w.startTime) / 60000) : 0), 0);

  // Muscle group breakdown
  const muscleGroups = useMemo(() => {
    const counts = {};
    weekWorkouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const sets = (ex.sets || []).filter(s => s.done).length || 1;
        counts[ex.cat] = (counts[ex.cat] || 0) + sets;
      });
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    if (!total) return [];
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count, pct: Math.round(count / total * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [weekWorkouts]);

  const CAT_COLORS = {
    Chest: "#60a5fa", Back: "#34d399", Legs: "#fb923c",
    Shoulders: "#a78bfa", Arms: "#f472b6", Core: "#facc15",
    "Full Body": "#a3e635", Cardio: "#38bdf8",
  };

  // Daily nutrition data
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return dateStr(d);
  });

  const dailyNutrition = dayLabels.map(ds => {
    const entries = weekFood.filter(e => e.date === ds);
    return {
      date: ds.slice(5),
      cal: round(entries.reduce((s, e) => s + (e.calories || 0), 0)),
      protein: round(entries.reduce((s, e) => s + (e.protein || 0), 0)),
      carbs: round(entries.reduce((s, e) => s + (e.carbs || 0), 0)),
      fat: round(entries.reduce((s, e) => s + (e.fat || 0), 0)),
    };
  });

  const loggedDays = dailyNutrition.filter(d => d.cal > 0).length || 1;
  const avgCal = round(dailyNutrition.reduce((s, d) => s + d.cal, 0) / loggedDays);
  const avgProtein = round(dailyNutrition.reduce((s, d) => s + d.protein, 0) / loggedDays);
  const avgCarbs = round(dailyNutrition.reduce((s, d) => s + d.carbs, 0) / loggedDays);
  const avgFat = round(dailyNutrition.reduce((s, d) => s + d.fat, 0) / loggedDays);
  const totalCal = dailyNutrition.reduce((s, d) => s + d.cal, 0);

  // Water stats
  const waterByDay = dayLabels.map(ds => weekWater.filter(e => e.date === ds).reduce((s, e) => s + (e.amount_ml || 0), 0));
  const waterLoggedDays = waterByDay.filter(v => v > 0).length || 1;
  const avgWater = round(waterByDay.reduce((s, v) => s + v, 0) / waterLoggedDays);
  const waterGoalDays = waterByDay.filter(v => v >= (settings.waterGoal || 2500)).length;

  const tooltipStyle = { contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff", fontSize: 12 } };

  const isEmpty = weekWorkouts.length === 0 && weekFood.length === 0;

  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between mb-5 px-1">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 text-zinc-400 hover:text-white"><ChevronLeft size={20} /></button>
        <span className="text-sm font-semibold text-white text-center">{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset >= 0}
          className={`p-2 ${weekOffset >= 0 ? "text-zinc-700" : "text-zinc-400 hover:text-white"}`}><ChevronRight size={20} /></button>
      </div>

      {isEmpty ? (
        <div className="text-center text-zinc-500 py-12 text-sm">No data logged for this week.</div>
      ) : (
        <>
          {/* ── Workout section ── */}
          {weekWorkouts.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3">Workouts</div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  ["Days Trained", trainDays, "/ 7", "text-lime-400"],
                  ["Total Volume", numFmt(round(totalVolume)), settings.units, "text-sky-400"],
                  ["Training Time", totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`, "", "text-amber-400"],
                ].map(([l, v, u, c]) => (
                  <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                    <div className={`text-xl font-bold ${c}`} style={H}>{v}</div>
                    {u && <div className="text-xs text-zinc-500">{u}</div>}
                    <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>

              {muscleGroups.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
                  <div className="text-sm font-semibold mb-3">Muscle Group Breakdown</div>
                  <div className="space-y-2.5">
                    {muscleGroups.map(({ cat, count, pct }) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-300">{cat}</span>
                          <span className="text-zinc-400">{count} sets · <span className="text-white font-semibold">{pct}%</span></span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: CAT_COLORS[cat] || "#a3e635" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Nutrition section ── */}
          {weekFood.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3">Nutrition</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ["Avg Daily Calories", avgCal, "kcal", "text-lime-400", settings.calorieGoal],
                  ["Weekly Total", numFmt(totalCal), "kcal", "text-amber-400", null],
                  ["Avg Protein", avgProtein, "g/day", "text-sky-400", settings.proteinGoal],
                  ["Avg Carbs", avgCarbs, "g/day", "text-amber-400", null],
                  ["Avg Fat", avgFat, "g/day", "text-rose-400", null],
                  ["Days Logged", loggedDays, "/ 7", "text-zinc-300", null],
                ].map(([l, v, u, c, goal]) => (
                  <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                    <div className={`text-xl font-bold ${c}`} style={H}>{v}<span className="text-xs ml-1 font-normal text-zinc-500">{u}</span></div>
                    <div className="text-xs text-zinc-500 mt-0.5">{l}</div>
                    {goal && <div className={`text-xs mt-0.5 ${v >= goal ? "text-lime-400" : "text-zinc-600"}`}>Goal: {numFmt(goal)}</div>}
                  </div>
                ))}
              </div>

              {/* Daily calorie chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
                <div className="text-sm font-semibold mb-3">Daily Calories</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={dailyNutrition} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#52525b", fontSize: 10 }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="cal" radius={[4, 4, 0, 0]}>
                      {dailyNutrition.map((entry, i) => (
                        <Cell key={i} fill={entry.cal >= settings.calorieGoal ? "#a3e635" : "#3f3f46"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-xs text-zinc-600 mt-2 text-center">Green bars = calorie goal met</div>
              </div>
            </div>
          )}

          {/* ── Water section ── */}
          {weekWater.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3">Hydration</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Avg / Day", `${(avgWater / 1000).toFixed(1)}L`, "text-sky-400"],
                  ["Goal Days", `${waterGoalDays}/7`, "text-lime-400"],
                  ["Weekly Total", `${(waterByDay.reduce((s, v) => s + v, 0) / 1000).toFixed(1)}L`, "text-zinc-300"],
                ].map(([l, v, c]) => (
                  <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
                    <div className={`text-xl font-bold ${c}`} style={H}>{v}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Overview Tab (existing content) ──────────────────────────────────────────
function OverviewTab({ data }) {
  const { settings, workouts, weights } = data;
  const [selEx, setSelEx] = useState(EX_DB[0]?.id || "");
  const streak = calcStreak(workouts);
  const totalVol = workouts.reduce((t, w) => t + calcVolume(w.exercises || []), 0);

  const chartData = workouts
    .filter((w) => (w.exercises || []).some((e) => e.id === selEx))
    .slice(0, 20).reverse()
    .map((w) => {
      const ex = (w.exercises || []).find((e) => e.id === selEx);
      const done = (ex?.sets || []).filter((s) => s.done);
      return {
        date: w.date.slice(5),
        maxW: done.length ? Math.max(...done.map((s) => parseFloat(s.weight) || 0)) : 0,
        vol: round(done.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0)),
      };
    });

  const weightChartData = weights.slice(-20).map((w) => ({ date: w.date.slice(5), w: w.weight }));
  const tooltipStyle = { contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff", fontSize: 12 } };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          ["Streak", streak, "days", "text-orange-400"],
          ["Sessions", workouts.length, "total", "text-lime-400"],
          ["Volume", numFmt(round(totalVol)), "kg", "text-sky-400"],
        ].map(([l, v, u, c]) => (
          <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-center">
            <div className={`text-3xl font-bold ${c}`} style={H}>{v}</div>
            <div className="text-xs text-zinc-500">{u}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 md:mb-0">
          <div className="text-sm font-semibold mb-3">Exercise Trend</div>
          <div className="relative mb-4">
            <select value={selEx} onChange={(e) => setSelEx(e.target.value)}
              className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm pr-10">
              {["Chest","Back","Legs","Shoulders","Arms","Core","Full Body"].map((c) => (
                <optgroup key={c} label={c}>
                  {EX_DB.filter((e) => e.cat === c).map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3.5 text-zinc-500 pointer-events-none" />
          </div>
          {chartData.length < 2 ? (
            <div className="text-center text-zinc-500 py-8 text-sm">Log this exercise in 2+ sessions to see a trend.</div>
          ) : (
            <>
              <div className="text-xs text-zinc-400 mb-2 font-medium">Max Weight ({settings.units})</div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="maxW" stroke="#a3e635" strokeWidth={2.5} dot={{ fill: "#a3e635", r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-zinc-400 mt-4 mb-2 font-medium">Session Volume (kg)</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="vol" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: "#38bdf8", r: 3, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-sm font-semibold mb-3">Body Weight</div>
          {weightChartData.length < 2 ? (
            <div className="text-center text-zinc-500 py-8 text-sm">Log your weight in the Body tab to see a trend.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weightChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="w" stroke="#a3e635" strokeWidth={2.5} dot={{ fill: "#a3e635", r: 3, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Progress Page ────────────────────────────────────────────────────────
export default function ProgressPage({ data }) {
  const { workouts, foodEntries, waterEntries, settings } = data;
  const [tab, setTab] = useState("Overview");

  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-4" style={H}>Progress</h1>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? "text-lime-400 border-b-2 border-lime-400" : "text-zinc-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab data={data} />}
      {tab === "Calendar" && <CalendarTab workouts={workouts} foodEntries={foodEntries} settings={settings} />}
      {tab === "Weekly Report" && <WeeklyReportTab workouts={workouts} foodEntries={foodEntries} waterEntries={waterEntries} settings={settings} />}
    </div>
  );
}
