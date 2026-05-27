import { useState, useEffect, useRef } from "react";
import { X, Edit2, RefreshCw, Camera } from "lucide-react";
import { supabase } from "../lib/supabase";
import { H } from "../lib/constants";

const COLORS = ["#a3e635", "#f472b6", "#60a5fa", "#fb923c", "#a78bfa", "#34d399"];

async function uploadProfilePhoto(profileId, file) {
  const bucket = "progress-photos";
  const path = `profiles/${profileId}/avatar.jpg`;
  const compressed = await new Promise((resolve) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400, scale = Math.min(MAX / Math.max(img.width, img.height), 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
  const res = await fetch(compressed);
  const blob = await res.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg", upsert: true,
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  // Bust cache by appending timestamp
  return publicUrl + "?t=" + Date.now();
}

export default function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileRef = useRef(null);

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

  const handlePhotoSelect = async (e, profileId) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingFor(profileId);
    try {
      const url = await uploadProfilePhoto(profileId, file);
      await supabase.from("profiles").update({ photo_url: url }).eq("id", profileId);
      setProfiles((p) => p.map((x) => (x.id === profileId ? { ...x, photo_url: url } : x)));
    } catch { alert("Photo upload failed."); }
    setUploadingFor(null);
    e.target.value = "";
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
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm" />
                <button onClick={saveEdit}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-zinc-950"
                  style={{ background: p.color, ...H }}>Save</button>
                <button onClick={() => setEditId(null)} className="text-zinc-500 px-2"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => onSelect(p)}
                className="w-full flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all group">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold"
                    style={{ background: p.color + "22", border: `2.5px solid ${p.color}`, color: p.color, ...H }}>
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      : p.name[0].toUpperCase()}
                  </div>
                  {/* Camera overlay button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current.dataset.profileId = p.id;
                      fileRef.current.click();
                    }}
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center hover:bg-lime-400 hover:border-lime-400 transition-colors">
                    {uploadingFor === p.id
                      ? <RefreshCw size={9} className="animate-spin text-zinc-300" />
                      : <Camera size={9} className="text-zinc-300" />}
                  </button>
                </div>

                <div className="flex-1 text-left">
                  <div className="font-bold text-white text-lg" style={H}>{p.name}</div>
                </div>

                <button onClick={(e) => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white p-1 transition-opacity">
                  <Edit2 size={14} />
                </button>
              </button>
            )}
          </div>
        ))}

        {/* Hidden file input shared across all profiles */}
        <input type="file" accept="image/*" ref={fileRef} className="hidden"
          onChange={(e) => handlePhotoSelect(e, fileRef.current.dataset.profileId)} />

        {adding ? (
          <div className="bg-zinc-900 border-2 border-lime-400 rounded-2xl p-4 flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Your name…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm" />
            <button onClick={create} className="bg-lime-400 text-zinc-950 font-bold text-sm px-3 py-2 rounded-xl" style={H}>Add</button>
            <button onClick={() => setAdding(false)} className="text-zinc-500 px-2"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-lime-400 hover:text-lime-400 text-zinc-500 rounded-2xl py-4 text-sm font-semibold transition-colors"
            style={H}>
            + Add Profile
          </button>
        )}
      </div>
    </div>
  );
}
