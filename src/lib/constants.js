export const H = { fontFamily: "Barlow Condensed, sans-serif" };
export const AI_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export const DEFAULTS = {
  calorieGoal: 2500, proteinGoal: 160, carbsGoal: 280, fatGoal: 75,
  fiberGoal: 30, restTime: 90, units: "kg", measureUnit: "cm", waterGoal: 2500,
};

export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const CATS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

export const MEASURE_FIELDS = [
  { key: "neck", label: "Neck" }, { key: "shoulders", label: "Shoulders" },
  { key: "chest", label: "Chest" }, { key: "bicep_l", label: "Left Bicep" },
  { key: "bicep_r", label: "Right Bicep" }, { key: "waist", label: "Waist" },
  { key: "belly", label: "Belly" }, { key: "hips", label: "Hips" },
  { key: "thigh_l", label: "Left Thigh" }, { key: "thigh_r", label: "Right Thigh" },
  { key: "calf_l", label: "Left Calf" }, { key: "calf_r", label: "Right Calf" },
];

export const BODY_POINTS = [
  { key: "neck", cx: 100, cy: 65 }, { key: "shoulders", cx: 100, cy: 92 },
  { key: "chest", cx: 100, cy: 116 }, { key: "bicep_l", cx: 60, cy: 122 },
  { key: "bicep_r", cx: 140, cy: 122 }, { key: "waist", cx: 100, cy: 148 },
  { key: "belly", cx: 100, cy: 163 }, { key: "hips", cx: 100, cy: 178 },
  { key: "thigh_l", cx: 83, cy: 217 }, { key: "thigh_r", cx: 117, cy: 217 },
  { key: "calf_l", cx: 81, cy: 262 }, { key: "calf_r", cx: 119, cy: 262 },
];

// Muscle groups where increase = progress (green), decrease = bad (red)
export const INCREASE_GOOD = [
  "bicep_l", "bicep_r", "shoulders", "chest", "thigh_l", "thigh_r", "calf_l", "calf_r",
];

export const EX_DB = [
  { id: "bench", name: "Bench Press", cat: "Chest" },
  { id: "incline", name: "Incline Bench Press", cat: "Chest" },
  { id: "decline", name: "Decline Bench Press", cat: "Chest" },
  { id: "cfly", name: "Cable Fly", cat: "Chest" },
  { id: "dbfly", name: "Dumbbell Fly", cat: "Chest" },
  { id: "pushup", name: "Push Up", cat: "Chest" },
  { id: "chestdip", name: "Chest Dip", cat: "Chest" },
  { id: "deadlift", name: "Deadlift", cat: "Back" },
  { id: "brow", name: "Barbell Row", cat: "Back" },
  { id: "pullup", name: "Pull Up", cat: "Back" },
  { id: "latpull", name: "Lat Pulldown", cat: "Back" },
  { id: "cabrow", name: "Seated Cable Row", cat: "Back" },
  { id: "dbrow", name: "Dumbbell Row", cat: "Back" },
  { id: "facepull", name: "Face Pull", cat: "Back" },
  { id: "squat", name: "Back Squat", cat: "Legs" },
  { id: "frontsq", name: "Front Squat", cat: "Legs" },
  { id: "legpress", name: "Leg Press", cat: "Legs" },
  { id: "rdl", name: "Romanian Deadlift", cat: "Legs" },
  { id: "legcurl", name: "Leg Curl", cat: "Legs" },
  { id: "legext", name: "Leg Extension", cat: "Legs" },
  { id: "lunge", name: "Lunge", cat: "Legs" },
  { id: "calf", name: "Calf Raise", cat: "Legs" },
  { id: "ohp", name: "Overhead Press", cat: "Shoulders" },
  { id: "dbohp", name: "Dumbbell OHP", cat: "Shoulders" },
  { id: "latrise", name: "Lateral Raise", cat: "Shoulders" },
  { id: "frontrise", name: "Front Rise", cat: "Shoulders" },
  { id: "reardelt", name: "Rear Delt Fly", cat: "Shoulders" },
  { id: "bbcurl", name: "Barbell Curl", cat: "Arms" },
  { id: "dbcurl", name: "Dumbbell Curl", cat: "Arms" },
  { id: "hammer", name: "Hammer Curl", cat: "Arms" },
  { id: "tpush", name: "Tricep Pushdown", cat: "Arms" },
  { id: "skull", name: "Skull Crusher", cat: "Arms" },
  { id: "tdip", name: "Tricep Dip", cat: "Arms" },
  { id: "plank", name: "Plank", cat: "Core" },
  { id: "crunch", name: "Crunch", cat: "Core" },
  { id: "legraise", name: "Leg Raise", cat: "Core" },
  { id: "rtwist", name: "Russian Twist", cat: "Core" },
  { id: "abwheel", name: "Ab Wheel", cat: "Core" },
  { id: "running", name: "Running", cat: "Cardio", cardio: true },
  { id: "jogging", name: "Jogging", cat: "Cardio", cardio: true },
  { id: "walking", name: "Walking", cat: "Cardio", cardio: true },
  { id: "cycling_c", name: "Cycling", cat: "Cardio", cardio: true },
  { id: "hiit", name: "HIIT", cat: "Cardio", cardio: true },
  { id: "elliptical", name: "Elliptical", cat: "Cardio", cardio: true },
  { id: "jumprope", name: "Jump Rope", cat: "Cardio", cardio: true },
  { id: "swimming", name: "Swimming", cat: "Cardio", cardio: true },
];
