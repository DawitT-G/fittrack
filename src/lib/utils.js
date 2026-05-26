export const uid = () => Math.random().toString(36).slice(2, 11);
export const todayDate = () => new Date().toISOString().split("T")[0];
export const round = (v) => Math.round(v || 0);
export const numFmt = (v) => Number(v || 0).toLocaleString();

export function dayTotals(entries) {
  return (entries || []).reduce(
    (t, e) => ({
      cal: t.cal + (e.calories || 0),
      protein: t.protein + (e.protein || 0),
      carbs: t.carbs + (e.carbs || 0),
      fat: t.fat + (e.fat || 0),
      fiber: t.fiber + (e.fiber || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map((w) => w.date));
  let s = 0;
  const d = new Date();
  if (!days.has(d.toISOString().split("T")[0])) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().split("T")[0])) {
    s++;
    d.setDate(d.getDate() - 1);
  }
  return s;
}

export function calcVolume(exercises) {
  return (exercises || []).reduce(
    (t, ex) =>
      t +
      (ex.sets || [])
        .filter((s) => s.done)
        .reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0),
    0
  );
}

export function getPR(exId, weight, reps, workouts) {
  const w = parseFloat(weight), r = parseInt(reps);
  if (!w || !r) return false;
  const all = workouts.flatMap((wk) =>
    (wk.exercises || [])
      .filter((e) => e.id === exId)
      .flatMap((e) => (e.sets || []).filter((s) => s.done))
  );
  if (!all.length) return false;
  const maxW = Math.max(...all.map((s) => parseFloat(s.weight) || 0));
  if (w > maxW) return true;
  return r > Math.max(...all.filter((s) => (parseFloat(s.weight) || 0) >= w).map((s) => parseInt(s.reps) || 0), 0);
}

export function getLastSession(exId, workouts) {
  const rel = (workouts || []).filter((w) => (w.exercises || []).some((e) => e.id === exId));
  if (!rel.length) return null;
  return rel.reduce((a, b) => (a.date > b.date ? a : b)).exercises?.find((e) => e.id === exId)?.sets?.filter((s) => s.done) || null;
}

export function getSmartPrompt(hr, hasMeals, hasWorkout, waterPct, totals, goals) {
  const lowProtein = totals.protein < (goals.proteinGoal || 160) * 0.4;
  if (hr < 6)  return { g: "Still up? 🌙", p: "Rest is part of recovery. Sleep is a fitness tool." };
  if (hr < 10) return hasMeals.breakfast
    ? { g: "Good morning! ☀️", p: "Breakfast logged ✓ You're off to a solid start!" }
    : { g: "Good morning! ☀️", p: "Ready to log breakfast? Start the day right 🍳" };
  if (hr < 12) return lowProtein
    ? { g: "Morning's flying! ⚡", p: "Protein is looking low — quick shake before lunch? 💪" }
    : { g: "Morning's going! 💪", p: "On track. Lunch coming up soon." };
  if (hr < 14) return hasMeals.lunch
    ? { g: "Good afternoon! 🍽️", p: "Lunch logged. Keep pushing toward your goals." }
    : { g: "Lunchtime! 🍽️", p: "Don't skip logging lunch — it all adds up." };
  if (hr < 17) return !hasWorkout
    ? { g: "Good afternoon! 💪", p: "No workout yet today. Ready to train?" }
    : { g: "Good afternoon! ✓", p: "Workout done! Focus on protein and recovery now." };
  if (hr < 20) return hasMeals.dinner
    ? { g: "Good evening! 🌆", p: "Dinner logged. Finishing strong!" }
    : { g: "Good evening! 🌆", p: "Time to log dinner — make it count." };
  return waterPct < 0.8
    ? { g: "Evening wind-down 🌙", p: "Still short on water. Finish that goal before bed! 💧" }
    : { g: "Evening wind-down 🌙", p: "Great work today. Rest well 💤" };
}

export async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200, scale = Math.min(MAX / Math.max(img.width, img.height), 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = url;
  });
}

export async function estimateMealAI(description, apiKey) {
  if (!apiKey) throw new Error("No API key");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: "You are a nutritionist. Respond ONLY with a JSON object, no other text.",
      messages: [{ role: "user", content: `Estimate nutrition for one typical serving of: "${description}". Return JSON only: {"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"serving":"serving description"}` }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  return JSON.parse(text.replace(/```json?|```/g, "").trim());
}
