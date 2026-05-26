import { useState, useEffect } from "react";
import { X, Edit2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { H } from "../lib/constants";

const COLORS = ["#a3e635", "#f472b6", "#60a5fa", "#fb923c", "#a78bfa", "#34d399"];

export default function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from("profiles").select().order("created_at").then(({ data }) => {
      setProfiles(data || []);
      setLoading(false);
    });
  }, []);

  const create = async () => {
    if (!newName.trim() || !supabase) return;
    const color = COLORS[profiles.length % COLORS.length];
    const { data } = await supabase.from("profiles").insert({ name: newName.trim(), color }).select().single();
    if (data) { setProfiles((p) => [...p, data]); setNewName(""); setAdding(false); }
  };

  const saveEdit = async () => {
    if (!editName.trim() || !supabase) return;
    await supabase.from("profiles").update({ name: editName.trim() }).eq("id", editId);
    setProfiles((p) => p.map((x) => (x.id === editId ? { ...x, name: editName.trim() } : x)));
    setEditId(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <RefreshCw size={24} className="text-lime-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="text-4xl font-bold text-lime-400 mb-1" style={H}>FitTrack</div>
      <div className="text-zinc-500 text-sm mb-10">Who's training today?</div>

      <div className="w-full max-w-sm space-y-3">
        {profiles.map((p) => (
          <div key={p.id}>
            {editId === p.id ? (
              <div className="bg-zinc-900 border-2 rounded-2xl p-4 flex gap-2" style={{ borderColor: p.color }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm"
                />
                <button onClick={saveEdit}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-zinc-950"
                  style={{ background: p.color, ...H }}>
                  Save
                </button>
                <button onClick={() => setEditId(null)} className="text-zinc-500 px-2"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{ background: p.color + "22", border: `2px solid ${p.color}`, color: p.color, ...H }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-white text-lg" style={H}>{p.name}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white p-1 transition-opacity"
                >
                  <Edit2 size={14} />
                </button>
              </button>
            )}
          </div>
        ))}

        {adding ? (
          <div className="bg-zinc-900 border-2 border-lime-400 rounded-2xl p-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Your name…"
              autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm"
            />
            <button onClick={create} className="bg-lime-400 text-zinc-950 font-bold text-sm px-3 py-2 rounded-xl" style={H}>Add</button>
            <button onClick={() => setAdding(false)} className="text-zinc-500 px-2"><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors"
            style={H}
          >
            + Add Profile
          </button>
        )}
      </div>
    </div>
  );
}
