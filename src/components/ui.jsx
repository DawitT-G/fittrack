import { ArrowLeft, Check, Droplets, X } from "lucide-react";
import { round, todayDate } from "../lib/utils";
import { H } from "../lib/constants";

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <button onClick={onClose} className="text-zinc-400 p-1"><ArrowLeft size={20} /></button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export function CalRing({ eaten, goal }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(eaten / Math.max(goal, 1), 1);
  const over = eaten > goal, done = eaten >= goal;
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="#27272a" strokeWidth="9" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={over ? "#f87171" : "#a3e635"} strokeWidth="9"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute text-center">
          <div className={`text-3xl font-bold ${done ? "text-lime-400" : "text-white"}`} style={H}>{round(eaten)}</div>
          <div className="text-xs text-zinc-400">kcal</div>
        </div>
      </div>
      <div className="text-xs mt-0.5">
        {over ? <span className="text-red-400">+{round(eaten - goal)} over</span>
          : done ? <span className="text-lime-400 font-semibold">✓ Goal reached!</span>
            : <span className="text-zinc-400">{round(goal - eaten)} left</span>}
      </div>
    </div>
  );
}

export function MBar({ label, val, goal, color }) {
  const pct = Math.min((val / Math.max(goal, 1)) * 100, 100);
  const done = val >= goal;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`flex items-center gap-0.5 ${done ? "text-lime-400" : "text-zinc-400"}`}>
          {done && <Check size={10} />}{label}
        </span>
        <span className="text-white font-medium">{round(val)}<span className="text-zinc-500">/{goal}g</span></span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${done ? "bg-lime-400" : color}`}
          style={{ width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export function WaterCard({ entries, goal, onAdd, onDelete }) {
  const today = entries.filter((e) => e.date === todayDate());
  const total = today.reduce((s, e) => s + (e.amount_ml || 0), 0);
  const pct = Math.min((total / Math.max(goal, 1)) * 100, 100);
  const done = total >= goal;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center gap-2 text-sm font-semibold ${done ? "text-lime-400" : ""}`}>
          <Droplets size={15} className={done ? "text-lime-400" : "text-sky-400"} />
          Water{done && <span className="text-lime-400 text-xs">✓</span>}
        </div>
        <span className={`font-bold text-sm ${done ? "text-lime-400" : "text-sky-400"}`} style={H}>
          {total}ml<span className="text-zinc-500 font-normal text-xs">/{goal}</span>
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-lime-400" : "bg-sky-400"}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-1.5 mb-2">
        {[150, 250, 500, 750].map((ml) => (
          <button key={ml} onClick={() => onAdd(ml)}
            className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 font-semibold transition-colors" style={H}>
            +{ml}
          </button>
        ))}
      </div>
      {today.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {today.map((e) => (
            <div key={e.id} className="flex items-center gap-1 bg-zinc-800 rounded-full px-2 py-0.5 text-xs text-zinc-400">
              💧{e.amount_ml}
              <button onClick={() => onDelete(e.id)} className="text-zinc-600 hover:text-red-400 ml-0.5"><X size={9} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
