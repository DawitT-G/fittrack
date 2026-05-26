import { Flame, Zap } from "lucide-react";
import { CalRing, MBar, WaterCard } from "./ui";
import { H } from "../lib/constants";
import { todayDate, dayTotals, calcStreak, calcVolume, round, numFmt, getSmartPrompt } from "../lib/utils";

export default function Dashboard({ data, profile }) {
  const { settings, foodEntries, workouts, waterEntries, addWater, deleteWater } = data;

  const todayEntries = foodEntries.filter((e) => e.date === todayDate());
  const totals = dayTotals(todayEntries);
  const streak = calcStreak(workouts);
  const todayWorkout = workouts.find((w) => w.date === todayDate());

  const hr = new Date().getHours();
  const hasMeals = {
    breakfast: todayEntries.some((e) => e.meal === "Breakfast"),
    lunch: todayEntries.some((e) => e.meal === "Lunch"),
    dinner: todayEntries.some((e) => e.meal === "Dinner"),
  };
  const totalWater = waterEntries.filter((e) => e.date === todayDate()).reduce((s, e) => s + (e.amount_ml || 0), 0);
  const waterPct = totalWater / Math.max(settings.waterGoal || 2500, 1);
  const { g: greeting, p: prompt } = getSmartPrompt(hr, hasMeals, !!todayWorkout, waterPct, totals, settings);

  const allGoals = totals.cal >= settings.calorieGoal && totals.protein >= settings.proteinGoal;

  return (
    <div className="px-4 pt-12 md:pt-6 pb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-zinc-400 text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="text-3xl font-bold leading-tight" style={H}>{greeting}</h1>
          <div className="text-sm text-zinc-400 mt-0.5">{prompt}</div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-orange-500 flex-shrink-0 ml-3"
            style={{ background: "rgba(249,115,22,0.1)" }}>
            <Flame size={16} className="text-orange-400" />
            <span className="text-orange-400 font-bold text-base" style={H}>{streak}</span>
          </div>
        )}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        {/* Nutrition card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 md:mb-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-zinc-200">
              Nutrition {allGoals && "🎯"}
            </span>
            <span className="text-xs text-zinc-500">{settings.calorieGoal} kcal goal</span>
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

        <div className="space-y-4">
          {/* Water tracker */}
          <WaterCard
            entries={waterEntries}
            goal={settings.waterGoal || 2500}
            onAdd={(ml) => addWater(ml)}
            onDelete={(id) => deleteWater(id)}
          />

          {/* Today's workout */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="text-sm font-semibold text-zinc-200 mb-2">Today's Workout</div>
            {todayWorkout ? (
              <div>
                <div className="font-semibold text-white">{todayWorkout.name}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {(todayWorkout.exercises || []).length} exercises ·{" "}
                  {numFmt(round(calcVolume(todayWorkout.exercises)))} {settings.units}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(todayWorkout.exercises || []).map((ex, i) => (
                    <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ex.name}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm flex items-center gap-2">
                <Zap size={14} className="text-zinc-600" />
                No workout yet. Get after it! 💪
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
