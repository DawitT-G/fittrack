import { Home, Utensils, Dumbbell, TrendingUp, Settings, Scale } from "lucide-react";
import { H } from "../lib/constants";

const NAV = [
  { id: "dashboard", icon: Home, label: "Home" },
  { id: "nutrition", icon: Utensils, label: "Food" },
  { id: "workout", icon: Dumbbell, label: "Train" },
  { id: "body", icon: Scale, label: "Body" },
  { id: "progress", icon: TrendingUp, label: "Progress" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ page, setPage, profile }) {
  return (
    <div className="hidden md:flex md:flex-col md:w-56 md:min-h-screen bg-zinc-900 border-r border-zinc-800 fixed top-0 left-0 bottom-0 z-30">
      <div className="px-5 py-6 border-b border-zinc-800">
        <div className="text-2xl font-bold text-lime-400" style={H}>FitTrack</div>
        {profile && (
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: profile.color }} />
            {profile.name}
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
              ${page === id ? "bg-lime-400 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
          >
            <Icon size={18} strokeWidth={page === id ? 2.5 : 1.5} />
            <span style={page === id ? H : {}}>{label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-zinc-800 text-xs text-zinc-600">v3.0 · Synced</div>
    </div>
  );
}

export function BottomNav({ page, setPage }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around py-1.5 z-40">
      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setPage(id)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl
            ${page === id ? "text-lime-400" : "text-zinc-500"}`}
        >
          <Icon size={19} strokeWidth={page === id ? 2.5 : 1.5} />
          <span className="text-xs">{label}</span>
        </button>
      ))}
    </div>
  );
}
