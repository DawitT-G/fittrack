import { H, AI_KEY } from "../lib/constants";

export default function SettingsPage({ data, profile, onSwitchProfile }) {
  const { settings, updateSettings } = data;
  const upd = (k, v) => updateSettings({ [k]: isNaN(parseFloat(v)) ? v : parseFloat(v) });

  return (
    <div className="pt-12 md:pt-6 pb-4 px-4">
      <h1 className="text-3xl font-bold mb-6" style={H}>Settings</h1>

      {/* Profile */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: profile.color + "22", border: `2px solid ${profile.color}`, color: profile.color, ...H }}>
            {profile.name[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{profile.name}</div>
            <button onClick={onSwitchProfile} className="text-xs text-zinc-400 hover:text-lime-400 transition-colors">
              Switch profile
            </button>
          </div>
        </div>
      </div>

      {/* Nutrition goals */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Nutrition Goals</div>
        {[
          ["Calories", "calorieGoal", "kcal/day"],
          ["Protein", "proteinGoal", "g/day"],
          ["Carbs", "carbsGoal", "g/day"],
          ["Fat", "fatGoal", "g/day"],
          ["Fiber", "fiberGoal", "g/day"],
          ["Water", "waterGoal", "ml/day"],
        ].map(([label, key, unit]) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
            <div>
              <div className="text-sm text-white font-medium">{label}</div>
              <div className="text-xs text-zinc-500">{unit}</div>
            </div>
            <input
              type="number"
              value={settings[key] || 0}
              onChange={(e) => upd(key, e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-24 text-center font-bold"
              style={H}
            />
          </div>
        ))}
      </div>

      {/* Workout settings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Workout</div>
        <div className="flex items-center justify-between py-3 border-b border-zinc-800">
          <div>
            <div className="text-sm text-white font-medium">Default Rest Time</div>
            <div className="text-xs text-zinc-500">seconds</div>
          </div>
          <input
            type="number"
            value={settings.restTime}
            onChange={(e) => upd("restTime", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-24 text-center font-bold"
            style={H}
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-zinc-800">
          <div className="text-sm text-white font-medium">Weight Units</div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {["kg", "lbs"].map((u) => (
              <button key={u} onClick={() => upd("units", u)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${settings.units === u ? "bg-lime-400 text-zinc-950" : "text-zinc-400"}`}
                style={H}>{u}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-3">
          <div className="text-sm text-white font-medium">Measurement Units</div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {["cm", "in"].map((u) => (
              <button key={u} onClick={() => upd("measureUnit", u)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${settings.measureUnit === u ? "bg-lime-400 text-zinc-950" : "text-zinc-400"}`}
                style={H}>{u}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Body stats for body fat calculation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs text-zinc-500 font-semibold mb-4 uppercase tracking-wider">Body Stats</div>
        <div className="text-xs text-zinc-500 mb-4">Used for body fat % estimation in the Body tab.</div>
        <div className="flex items-center justify-between py-3 border-b border-zinc-800">
          <div>
            <div className="text-sm text-white font-medium">Height</div>
            <div className="text-xs text-zinc-500">{settings.measureUnit === "in" ? "inches" : "cm"}</div>
          </div>
          <input
            type="number"
            value={settings.height || ""}
            onChange={(e) => upd("height", e.target.value)}
            placeholder="e.g. 180"
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm w-28 text-center font-bold"
            style={H}
          />
        </div>
        <div className="flex items-center justify-between pt-3">
          <div className="text-sm text-white font-medium">Biological Sex</div>
          <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
            {[["male", "Male"], ["female", "Female"]].map(([val, label]) => (
              <button key={val} onClick={() => upd("gender", val)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${settings.gender === val ? "bg-lime-400 text-zinc-950" : "text-zinc-400"}`}
                style={H}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="font-semibold text-white mb-1">FitTrack v3</div>
        <div className="text-sm text-zinc-400 mb-2">
          Synced via Supabase. Changes appear instantly on all your devices.
        </div>
        {!AI_KEY && (
          <div className="text-xs text-zinc-500 bg-zinc-800 rounded-lg p-2.5">
            💡 AI meal estimation requires <code className="text-lime-400">VITE_ANTHROPIC_API_KEY</code> in Vercel environment variables.
          </div>
        )}
      </div>
    </div>
  );
}
