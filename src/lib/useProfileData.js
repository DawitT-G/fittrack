import { useState, useEffect } from "react";
import { supabase, PHOTO_BUCKET } from "./supabase";
import { DEFAULTS } from "./constants";
import { uid, todayDate, compressImage } from "./utils";

function normalizeWorkout(w) {
  return { id: w.id, name: w.name, date: w.date, startTime: w.start_time, endTime: w.end_time, exercises: w.exercises || [] };
}
function denormalizeWorkout(w, pid) {
  return { id: w.id, profile_id: pid, name: w.name, date: w.date, start_time: w.startTime || 0, end_time: w.endTime || 0, exercises: w.exercises || [] };
}

export default function useProfileData(profileId) {
  const [state, setState] = useState({
    settings: DEFAULTS, workouts: [], foodEntries: [], customFoods: [],
    recipes: [], weights: [], measurements: [], photos: [], routines: [], waterEntries: [],
  });
  const [loading, setLoading] = useState(true);
  const upd = (key, val) => setState((s) => ({ ...s, [key]: val }));

  useEffect(() => {
    if (!profileId || !supabase) { setLoading(false); return; }
    const load = async () => {
      const [sR, wR, fR, cfR, rR, bwR, mR, phR, rtR, waR] = await Promise.all([
        supabase.from("user_settings").select().eq("profile_id", profileId).maybeSingle(),
        supabase.from("workouts").select().eq("profile_id", profileId).order("date", { ascending: false }),
        supabase.from("food_logs").select().eq("profile_id", profileId),
        supabase.from("custom_foods").select().eq("profile_id", profileId),
        supabase.from("recipes").select().eq("profile_id", profileId),
        supabase.from("body_weights").select().eq("profile_id", profileId).order("date"),
        supabase.from("measurements").select().eq("profile_id", profileId).order("date"),
        supabase.from("progress_photos").select().eq("profile_id", profileId).order("date", { ascending: false }),
        supabase.from("routines").select().eq("profile_id", profileId),
        supabase.from("water_logs").select().eq("profile_id", profileId),
      ]);
      setState({
        settings: sR.data?.data || DEFAULTS,
        workouts: (wR.data || []).map(normalizeWorkout),
        foodEntries: fR.data || [], customFoods: cfR.data || [], recipes: rR.data || [],
        weights: bwR.data || [], measurements: mR.data || [], photos: phR.data || [],
        routines: rtR.data || [], waterEntries: waR.data || [],
      });
      setLoading(false);
    };
    load();

    const tables = [
      ["workouts", "workouts", true], ["food_logs", "foodEntries", false],
      ["custom_foods", "customFoods", false], ["recipes", "recipes", false],
      ["body_weights", "weights", false], ["measurements", "measurements", false],
      ["progress_photos", "photos", false], ["routines", "routines", false],
      ["water_logs", "waterEntries", false],
    ];
    const channels = tables.map(([table, key, norm]) =>
      supabase.channel(`${table}-${profileId}`)
        .on("postgres_changes", { event: "*", schema: "public", table, filter: `profile_id=eq.${profileId}` },
          async () => {
            let q = supabase.from(table).select().eq("profile_id", profileId);
            if (table === "workouts") q = q.order("date", { ascending: false });
            if (table === "body_weights" || table === "measurements") q = q.order("date");
            if (table === "progress_photos") q = q.order("date", { ascending: false });
            const { data } = await q;
            upd(key, norm ? (data || []).map(normalizeWorkout) : (data || []));
          })
        .subscribe()
    );
    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, [profileId]);

  const ops = {
    updateSettings: async (updates) => {
      const next = { ...state.settings, ...updates }; upd("settings", next);
      await supabase.from("user_settings").upsert({ profile_id: profileId, data: next });
    },
    addWorkout: async (w) => {
      upd("workouts", [w, ...state.workouts]);
      await supabase.from("workouts").insert(denormalizeWorkout(w, profileId));
    },
    updateWorkout: async (id, w) => {
      upd("workouts", state.workouts.map((x) => (x.id === id ? w : x)));
      await supabase.from("workouts").update(denormalizeWorkout(w, profileId)).eq("id", id);
    },
    deleteWorkout: async (id) => {
      upd("workouts", state.workouts.filter((x) => x.id !== id));
      await supabase.from("workouts").delete().eq("id", id);
    },
    addFoodEntry: async (e) => {
      const row = { id: uid(), profile_id: profileId, ...e };
      upd("foodEntries", [...state.foodEntries, row]);
      await supabase.from("food_logs").insert(row);
    },
    deleteFoodEntry: async (id) => {
      upd("foodEntries", state.foodEntries.filter((e) => e.id !== id));
      await supabase.from("food_logs").delete().eq("id", id);
    },
    addCustomFood: async (f) => {
      const row = { id: uid(), profile_id: profileId, ...f };
      upd("customFoods", [...state.customFoods, row]);
      await supabase.from("custom_foods").insert(row);
    },
    deleteCustomFood: async (id) => {
      upd("customFoods", state.customFoods.filter((f) => f.id !== id));
      await supabase.from("custom_foods").delete().eq("id", id);
    },
    addRecipe: async (r) => {
      const row = { id: uid(), profile_id: profileId, ...r };
      upd("recipes", [...state.recipes, row]);
      await supabase.from("recipes").insert(row);
    },
    deleteRecipe: async (id) => {
      upd("recipes", state.recipes.filter((r) => r.id !== id));
      await supabase.from("recipes").delete().eq("id", id);
    },
    addWeight: async (w) => {
      const row = { id: uid(), profile_id: profileId, ...w };
      upd("weights", [...state.weights, row].sort((a, b) => a.date.localeCompare(b.date)));
      await supabase.from("body_weights").insert(row);
    },
    deleteWeight: async (id) => {
      upd("weights", state.weights.filter((w) => w.id !== id));
      await supabase.from("body_weights").delete().eq("id", id);
    },
    addMeasurement: async (data) => {
      const row = { id: uid(), profile_id: profileId, date: todayDate(), data };
      upd("measurements", [...state.measurements, row].sort((a, b) => a.date.localeCompare(b.date)));
      await supabase.from("measurements").insert(row);
    },
    deleteMeasurement: async (id) => {
      upd("measurements", state.measurements.filter((m) => m.id !== id));
      await supabase.from("measurements").delete().eq("id", id);
    },
    uploadPhoto: async (file) => {
      const compressed = await compressImage(file);
      const res = await fetch(compressed); const blob = await res.blob();
      const path = `${profileId}/${uid()}.jpg`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const row = { id: uid(), profile_id: profileId, date: todayDate(), photo_url: publicUrl, notes: "" };
      upd("photos", [row, ...state.photos]);
      await supabase.from("progress_photos").insert(row);
    },
    deletePhoto: async (id, photo_url) => {
      upd("photos", state.photos.filter((p) => p.id !== id));
      await supabase.from("progress_photos").delete().eq("id", id);
      if (photo_url) {
        const parts = photo_url.split("/");
        await supabase.storage.from(PHOTO_BUCKET).remove([parts.slice(-2).join("/")]);
      }
    },
    addRoutine: async (r) => {
      const row = { id: uid(), profile_id: profileId, ...r };
      upd("routines", [...state.routines, row]);
      await supabase.from("routines").insert(row);
    },
    deleteRoutine: async (id) => {
      upd("routines", state.routines.filter((r) => r.id !== id));
      await supabase.from("routines").delete().eq("id", id);
    },
    addWater: async (amount_ml) => {
      const row = { id: uid(), profile_id: profileId, date: todayDate(), amount_ml };
      upd("waterEntries", [...state.waterEntries, row]);
      await supabase.from("water_logs").insert(row);
    },
    deleteWater: async (id) => {
      upd("waterEntries", state.waterEntries.filter((e) => e.id !== id));
      await supabase.from("water_logs").delete().eq("id", id);
    },
  };

  return { loading, ...state, ...ops };
}
