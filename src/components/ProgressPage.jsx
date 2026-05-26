import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { H, EX_DB, CATS } from "../lib/constants";
import { calcStreak, calcVolume, round, numFmt } from "../lib/utils";

export default function ProgressPage({ data }) {
  const { settings, workouts, weights } = data;
  const [selEx, setSelEx] = useState(EX_DB[0]?.id || "");

  const streak = calcStreak(workouts);
  const totalVol = workouts.reduce((t, w) => t + calcVolume(w.exercises || []), 0);

  const chartData = workouts
    .filter((w) => (w.exercises || []).some((e) => e.id === selEx))
    .slice(0, 20)
    .reverse()
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

  const tooltipStyle = {
    contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff", fontSize: 12 },
  };

  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Progress</h1>

      {/* Stats row */}
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
        {/* Exercise trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 md:mb-0">
          <div className="text-sm font-semibold mb-3">Exercise Trend</div>
          <div className="relative mb-4">
            <select
              value={selEx}
              onChange={(e) => setSelEx(e.target.value)}
              className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm pr-10"
            >
              {CATS.map((c) => (
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
            <div className="text-center text-zinc-500 py-8 text-sm">
              Log this exercise in 2+ sessions to see a trend.
            </div>
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

        {/* Body weight chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-sm font-semibold mb-3">Body Weight</div>
          {weightChartData.length < 2 ? (
            <div className="text-center text-zinc-500 py-8 text-sm">
              Log your weight in the Body tab to see a trend.
            </div>
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
