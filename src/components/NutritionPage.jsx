import { useState, useRef } from "react";
import { Plus, Search, Camera, X, Check, Sparkles, RefreshCw, Trash2, ArrowLeft, Edit2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Modal } from "./ui";
import { H, MEALS, AI_KEY } from "../lib/constants";
import { todayDate, round, estimateMealAI, uid } from "../lib/utils";

// ── Barcode Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const html5Ref = useRef(null);
  const startedRef = useRef(false);

  useState(() => {
    const t = setTimeout(async () => {
      if (startedRef.current) return;
      try {
        html5Ref.current = new Html5Qrcode("qr-reader-div");
        await html5Ref.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (text) => onDetected(text),
          undefined
        );
        startedRef.current = true;
      } catch {
        setError("Camera access denied. Enter barcode manually below.");
      }
    }, 150);
    return () => {
      clearTimeout(t);
      if (html5Ref.current && startedRef.current) html5Ref.current.stop().catch(() => {});
    };
  }, []);

  return (
    <Modal title="Scan Barcode" onClose={onClose}>
      <div className="p-4">
        <div id="qr-reader-div" className="rounded-2xl overflow-hidden bg-zinc-800 mb-3" style={{ minHeight: 200 }} />
        {error && <div className="text-zinc-400 text-sm bg-zinc-800 rounded-xl p-3 mb-3">{error}</div>}
        <div className="text-xs text-zinc-500 mb-2">Or enter barcode manually:</div>
        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && manual && onDetected(manual)}
            placeholder="e.g. 3017620422003" autoFocus
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm" />
          <button onClick={() => manual && onDetected(manual)}
            className="bg-lime-400 text-zinc-950 rounded-xl px-4 font-bold" style={H}>Go</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Food confirm screen ───────────────────────────────────────────────────────
function FoodConfirm({ food, meal, onAdd, onBack }) {
  const [grams, setGrams] = useState("100");
  const [notes, setNotes] = useState("");
  const g = parseFloat(grams) || 100, ratio = g / 100, n = food.nutriments || {};
  const get = (a, b) => ((n[a] ?? n[b]) || 0) * ratio;

  return (
    <Modal title="Confirm Food" onClose={onBack}>
      <div className="p-4">
        <div className="text-lg font-bold leading-snug mb-1">{food._name}</div>
        {food.brands && <div className="text-sm text-zinc-400 mb-4">{food.brands}</div>}
        <div className="mb-4">
          <label className="text-xs text-zinc-400 block mb-1">Amount (grams)</label>
          <input type="number" value={grams} onChange={(e) => setGrams(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl text-center font-bold" style={H} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ["Calories", round(get("energy-kcal_100g", "calories")), "kcal", "text-lime-400"],
            ["Protein", round(get("proteins_100g", "protein")), "g", "text-sky-400"],
            ["Carbs", round(get("carbohydrates_100g", "carbs")), "g", "text-amber-400"],
            ["Fat", round(get("fat_100g", "fat")), "g", "text-rose-400"],
            ["Fiber", round(get("fiber_100g", "fiber")), "g", "text-emerald-400"],
          ].map(([l, v, u, c]) => (
            <div key={l} className="bg-zinc-800 rounded-xl p-3">
              <div className={`text-2xl font-bold ${c}`} style={H}>{v}<span className="text-sm ml-0.5">{u}</span></div>
              <div className="text-xs text-zinc-400">{l}</div>
            </div>
          ))}
        </div>
        <div className="mb-5">
          <label className="text-xs text-zinc-400 block mb-1">Note <span className="text-zinc-600">(optional)</span></label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. homemade, ate half portion…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600" />
        </div>
        <button onClick={() => {
          onAdd({
            meal, name: food._name, brand: food.brands || food.brand || "", grams: g, notes,
            calories: get("energy-kcal_100g", "calories"), protein: get("proteins_100g", "protein"),
            carbs: get("carbohydrates_100g", "carbs"), fat: get("fat_100g", "fat"), fiber: get("fiber_100g", "fiber"),
          });
        }} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
          Add to {meal}
        </button>
      </div>
    </Modal>
  );
}

// ── Food Search Modal ─────────────────────────────────────────────────────────
function FoodSearchModal({ meal, onAdd, onClose, customFoods, recipes }) {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdjust, setAiAdjust] = useState(1.0);
  const abortRef = useRef(null);

  const doSearch = async (q) => {
    const term = q || query; if (!term.trim()) return;
    abortRef.current?.abort(); abortRef.current = new AbortController();
    setLoading(true); setError(""); setResults([]);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&json=1&page_size=25&lc=en&fields=product_name_en,product_name,brands,nutriments,code&action=process`,
        { signal: abortRef.current.signal }
      );
      const data = await res.json();
      const valid = (data.products || [])
        .filter((p) => (p.product_name_en || p.product_name) && p.nutriments?.["energy-kcal_100g"] != null)
        .map((p) => ({ ...p, _name: p.product_name_en || p.product_name }));
      setResults(valid);
      if (!valid.length) setError("No results. Try different keywords.");
    } catch (e) { if (e.name !== "AbortError") setError("Search failed. Check connection."); }
    setLoading(false);
  };

  const handleBarcode = async (code) => {
    setShowScanner(false); setLoading(true); setError(""); setResults([]);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        setSelected({ _name: p.product_name_en || p.product_name || "Unknown", brands: p.brands, nutriments: p.nutriments });
      } else { setError(`No product found for barcode: ${code}`); }
    } catch { setError("Barcode lookup failed."); }
    setLoading(false);
  };

  const doAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const est = await estimateMealAI(aiQuery, AI_KEY);
      setAiResult(est); setAiAdjust(1.0);
    } catch {
      setAiResult({ error: AI_KEY ? "AI request failed." : "Add VITE_ANTHROPIC_API_KEY to Vercel to use AI estimation." });
    }
    setAiLoading(false);
  };

  if (showScanner) return <BarcodeScanner onDetected={handleBarcode} onClose={() => setShowScanner(false)} />;
  if (selected) return (
    <FoodConfirm food={selected} meal={meal}
      onAdd={(entry) => { onAdd(entry); onClose(); }}
      onBack={() => setSelected(null)} />
  );

  return (
    <Modal title={`Add to ${meal}`} onClose={onClose}>
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[["search", "Search"], ["ai", "AI Guess"], ["custom", "My Foods"], ["recipes", "Recipes"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold ${tab === t ? "text-lime-400 border-b-2 border-lime-400" : "text-zinc-500"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search foods…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm" />
            <button onClick={() => doSearch()} className="bg-lime-400 text-zinc-950 rounded-xl px-3 font-bold"><Search size={18} /></button>
            <button onClick={() => setShowScanner(true)} className="bg-zinc-700 text-white rounded-xl px-3"><Camera size={18} /></button>
          </div>
          {loading && <div className="text-center text-zinc-400 py-10 text-sm">Searching…</div>}
          {error && <div className="text-zinc-500 text-sm text-center py-8">{error}</div>}
          {results.map((p, i) => (
            <button key={p.code || i} onClick={() => setSelected(p)}
              className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
              <div className="flex-1 mr-3">
                <div className="font-medium text-sm text-white leading-tight">{p._name}</div>
                {p.brands && <div className="text-xs text-zinc-400 mt-0.5">{p.brands}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lime-400 font-bold" style={H}>{round(p.nutriments["energy-kcal_100g"])}</div>
                <div className="text-xs text-zinc-500">kcal/100g</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* AI tab */}
      {tab === "ai" && (
        <div className="p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 mb-4 text-xs text-zinc-400 flex gap-2 items-start">
            <Sparkles size={14} className="text-lime-400 flex-shrink-0 mt-0.5" />
            Describe any meal and Claude will estimate the nutrition. Adjust the portion up or down.
          </div>
          <div className="flex gap-2 mb-4">
            <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doAI()}
              placeholder="e.g. homemade lasagna, large portion…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm" />
            <button onClick={doAI} disabled={!aiQuery.trim() || aiLoading}
              className="bg-lime-400 disabled:opacity-50 text-zinc-950 rounded-xl px-3 font-bold">
              {aiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </button>
          </div>
          {aiResult?.error && <div className="text-zinc-500 text-sm bg-zinc-800 rounded-xl p-3">{aiResult.error}</div>}
          {aiResult && !aiResult.error && (
            <div className="bg-zinc-900 border border-lime-900 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-lime-400 font-semibold mb-0.5">
                <Sparkles size={12} /> Estimated — {aiResult.serving}
              </div>
              <div className="text-xs text-zinc-500 mb-3">Not exact. Slide to adjust portion size.</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  ["Calories", round(aiResult.calories * aiAdjust), "kcal", "text-lime-400"],
                  ["Protein", round((aiResult.protein || 0) * aiAdjust), "g", "text-sky-400"],
                  ["Carbs", round((aiResult.carbs || 0) * aiAdjust), "g", "text-amber-400"],
                  ["Fat", round((aiResult.fat || 0) * aiAdjust), "g", "text-rose-400"],
                ].map(([l, v, u, c]) => (
                  <div key={l} className="bg-zinc-800 rounded-xl p-2.5">
                    <div className={`text-xl font-bold ${c}`} style={H}>{v}<span className="text-xs ml-0.5">{u}</span></div>
                    <div className="text-xs text-zinc-400">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                  <span>Adjust portion</span>
                  <span className="font-bold text-white">{Math.round(aiAdjust * 100)}%</span>
                </div>
                <input type="range" min="0.5" max="2.5" step="0.1" value={aiAdjust}
                  onChange={(e) => setAiAdjust(parseFloat(e.target.value))}
                  className="w-full accent-lime-400" />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>50%</span><span>100%</span><span>250%</span>
                </div>
              </div>
              <button onClick={() => {
                onAdd({
                  meal, name: aiQuery, brand: "AI Estimate", grams: 100,
                  calories: round(aiResult.calories * aiAdjust),
                  protein: round((aiResult.protein || 0) * aiAdjust),
                  carbs: round((aiResult.carbs || 0) * aiAdjust),
                  fat: round((aiResult.fat || 0) * aiAdjust),
                  fiber: round((aiResult.fiber || 0) * aiAdjust),
                });
                onClose();
              }} className="w-full bg-lime-400 text-zinc-950 font-bold rounded-xl py-3" style={H}>
                Log — Estimated {round(aiResult.calories * aiAdjust)} kcal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom foods tab */}
      {tab === "custom" && (
        <div className="p-4">
          {!customFoods.length
            ? <div className="text-center text-zinc-500 py-12 text-sm">No custom foods yet.</div>
            : customFoods.map((f) => (
              <button key={f.id} onClick={() => setSelected({
                _name: f.name, brands: f.brand,
                nutriments: { "energy-kcal_100g": f.calories, proteins_100g: f.protein, carbohydrates_100g: f.carbs, fat_100g: f.fat, fiber_100g: f.fiber },
              })} className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3.5 mb-2 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm text-white">{f.name}</div>
                  <div className="text-xs text-zinc-400">{f.brand || "Custom"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lime-400 font-bold" style={H}>{f.calories}</div>
                  <div className="text-xs text-zinc-500">kcal/100g</div>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Recipes tab */}
      {tab === "recipes" && (
        <div className="p-4">
          {!recipes.length
            ? <div className="text-center text-zinc-500 py-12 text-sm">No recipes yet.</div>
            : recipes.map((r) => {
              const [srvs, setSrvs] = useState("1");
              return (
                <div key={r.id} className="bg-zinc-800 rounded-xl p-3.5 mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm text-white">{r.name}</div>
                      <div className="text-xs text-zinc-400">{(r.ingredients || []).length} ingredients</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lime-400 font-bold text-sm" style={H}>{round(r.totals?.cal || 0)}</div>
                      <div className="text-xs text-zinc-500">kcal/serving</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={srvs} onChange={(e) => setSrvs(e.target.value)}
                      className="w-14 text-center bg-zinc-700 border border-zinc-600 rounded-lg py-1.5 text-white text-sm" />
                    <span className="text-xs text-zinc-400">servings</span>
                    <button onClick={() => {
                      const x = parseFloat(srvs) || 1, t = r.totals || {};
                      onAdd({ meal, name: r.name, brand: "Recipe", grams: 100 * x, calories: (t.cal || 0) * x, protein: (t.protein || 0) * x, carbs: (t.carbs || 0) * x, fat: (t.fat || 0) * x, fiber: (t.fiber || 0) * x });
                      onClose();
                    }} className="ml-auto bg-lime-400 text-zinc-950 font-bold text-xs px-3 py-1.5 rounded-lg" style={H}>Add</button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Modal>
  );
}

// ── Add Custom Food ───────────────────────────────────────────────────────────
function AddCustomFoodModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", brand: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const s = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="New Custom Food" onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="bg-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400">Values per 100g</div>
        {[["Food name *", "name", "text"], ["Brand (optional)", "brand", "text"],
          ["Calories *", "calories", "number"], ["Protein (g)", "protein", "number"],
          ["Carbs (g)", "carbs", "number"], ["Fat (g)", "fat", "number"], ["Fiber (g)", "fiber", "number"],
        ].map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
            <input type={type} value={form[key]} onChange={(e) => s(key, e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm" />
          </div>
        ))}
        <button onClick={() => {
          if (!form.name || !form.calories) return;
          onAdd({ name: form.name, brand: form.brand, calories: parseFloat(form.calories) || 0, protein: parseFloat(form.protein) || 0, carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0, fiber: parseFloat(form.fiber) || 0 });
          onClose();
        }} disabled={!form.name || !form.calories}
          className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
          Save Food
        </button>
      </div>
    </Modal>
  );
}

// ── Recipe Manager ────────────────────────────────────────────────────────────
function RecipeManager({ recipes, onAdd, onUpdate, onDelete, onClose }) {
  const [creating, setCreating] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [ingGrams, setIngGrams] = useState({});

  // USDA FoodData Central — has raw ingredients like "Broccoli, raw", "Chicken breast, cooked"
  // Much better than Open Food Facts for recipe building
  const doSearch = async (term) => {
    const q = (term !== undefined ? term : searchQ).trim();
    if (!q) return;
    setSearching(true); setSearchRes([]); setSearchError("");
    try {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&api_key=DEMO_KEY&dataType=Foundation,SR%20Legacy&pageSize=15`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const items = (data.foods || []).map((f) => ({
        code: String(f.fdcId),
        _name: f.description,
        nutriments: {
          "energy-kcal_100g": f.foodNutrients?.find((n) => n.nutrientId === 1008)?.value || 0,
          proteins_100g: f.foodNutrients?.find((n) => n.nutrientId === 1003)?.value || 0,
          carbohydrates_100g: f.foodNutrients?.find((n) => n.nutrientId === 1005)?.value || 0,
          fat_100g: f.foodNutrients?.find((n) => n.nutrientId === 1004)?.value || 0,
          fiber_100g: f.foodNutrients?.find((n) => n.nutrientId === 1079)?.value || 0,
        },
      }));
      if (!items.length) setSearchError("No results. Try a simpler term like \"chicken\" or \"rice\".");
      setSearchRes(items);
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    }
    setSearching(false);
  };

  const addIngredient = (p) => {
    const gr = parseFloat(ingGrams[p.code] || "100") || 100, ratio = gr / 100, n = p.nutriments || {};
    setIngredients((prev) => [...prev, {
      id: uid(), name: p._name, grams: gr,
      calories: (n["energy-kcal_100g"] || 0) * ratio, protein: (n.proteins_100g || 0) * ratio,
      carbs: (n.carbohydrates_100g || 0) * ratio, fat: (n.fat_100g || 0) * ratio, fiber: (n.fiber_100g || 0) * ratio,
    }]);
    setSearchRes([]); setSearchQ(""); setIngGrams({});
  };

  const totals = ingredients.reduce((t, i) => ({
    cal: t.cal + i.calories, protein: t.protein + i.protein,
    carbs: t.carbs + i.carbs, fat: t.fat + i.fat, fiber: t.fiber + i.fiber,
  }), { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const openCreate = () => { setEditingRecipe(null); setName(""); setIngredients([]); setCreating(true); };
  const openEdit = (r) => { setEditingRecipe(r); setName(r.name); setIngredients(r.ingredients || []); setCreating(true); };

  const handleSave = () => {
    if (!name.trim() || !ingredients.length) return;
    if (editingRecipe) { onUpdate(editingRecipe.id, { name, ingredients, totals }); }
    else { onAdd({ name, ingredients, totals }); }
    setCreating(false); setName(""); setIngredients([]); setEditingRecipe(null);
  };

  if (creating) return (
    <Modal title={editingRecipe ? "Edit Recipe" : "Create Recipe"} onClose={() => { setCreating(false); setEditingRecipe(null); }}>
      <div className="p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white" />
        <div className="flex gap-2">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(e.target.value); } }}
            placeholder="e.g. chicken breast, brown rice…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500"
          />
          <button
            onClick={() => doSearch(searchQ)}
            disabled={searching || !searchQ.trim()}
            className="bg-lime-400 disabled:opacity-40 text-zinc-950 rounded-xl px-3 font-bold">
            {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
        {searchError && <div className="text-zinc-500 text-xs bg-zinc-800 rounded-xl px-3 py-2">{searchError}</div>}
        {searching && <div className="text-zinc-400 text-xs text-center py-2">Searching USDA database…</div>}
        {searchRes.map((p) => (
          <div key={p.code} className="bg-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 text-sm text-white leading-tight">{p._name}</div>
            <input type="number" value={ingGrams[p.code] || "100"}
              onChange={(e) => setIngGrams((g) => ({ ...g, [p.code]: e.target.value }))}
              className="w-14 bg-zinc-700 border border-zinc-600 rounded-lg py-1 text-white text-xs text-center" />
            <span className="text-xs text-zinc-400">g</span>
            <button onClick={() => addIngredient(p)} className="text-lime-400 font-bold text-xs">+Add</button>
          </div>
        ))}
        {ingredients.length > 0 && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            {ingredients.map((ing, i) => (
              <div key={ing.id} className="flex justify-between items-center px-3 py-2 border-b border-zinc-800 last:border-0">
                <span className="text-sm text-white flex-1 mr-2 leading-tight">{ing.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-zinc-400">{ing.grams}g</span>
                  <span className="text-xs text-lime-400" style={H}>{round(ing.calories)} kcal</span>
                  <button onClick={() => setIngredients((p) => p.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {ingredients.length > 0 && (
          <div className="bg-zinc-800 rounded-xl p-3 flex justify-around text-xs">
            {[["Cal", round(totals.cal), "text-lime-400"], ["P", round(totals.protein), "text-sky-400"],
              ["C", round(totals.carbs), "text-amber-400"], ["F", round(totals.fat), "text-rose-400"]].map(([l, v, c]) => (
              <div key={l} className="text-center"><div className={`font-bold text-base ${c}`} style={H}>{v}</div><div className="text-zinc-500">{l}</div></div>
            ))}
          </div>
        )}
        <button onClick={handleSave} disabled={!name.trim() || !ingredients.length}
          className="w-full bg-lime-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl py-3.5" style={H}>
          {editingRecipe ? "Save Changes" : "Save Recipe"}
        </button>
        {editingRecipe && <div className="text-xs text-zinc-500 text-center">Editing won't affect meals you've already logged.</div>}
      </div>
    </Modal>
  );

  return (
    <Modal title="Recipes" onClose={onClose}>
      <div className="p-4">
        <button onClick={openCreate} className="w-full border-2 border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-3 text-sm mb-4">+ Create Recipe</button>
        {!recipes.length ? <div className="text-center text-zinc-500 py-8 text-sm">No recipes yet.</div>
          : recipes.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 mr-2">
                  <div className="font-semibold text-white">{r.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{(r.ingredients || []).length} ingredients</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(r)} className="text-zinc-400 hover:text-lime-400 p-1"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(r.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                {[["Cal", round(r.totals?.cal || 0), "text-lime-400"], ["P", round(r.totals?.protein || 0), "text-sky-400"],
                  ["C", round(r.totals?.carbs || 0), "text-amber-400"], ["F", round(r.totals?.fat || 0), "text-rose-400"]].map(([l, v, c]) => (
                  <span key={l}><span className={`font-bold ${c}`} style={H}>{v}</span><span className="text-zinc-500"> {l}</span></span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </Modal>
  );
}

// ── Main Nutrition Page ───────────────────────────────────────────────────────
export default function NutritionPage({ data }) {
  const { settings, foodEntries, customFoods, recipes, addFoodEntry, deleteFoodEntry, addCustomFood, deleteCustomFood, addRecipe, updateRecipe, deleteRecipe } = data;
  const [offset, setOffset] = useState(0);
  const [addModal, setAddModal] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [customMeals, setCustomMeals] = useState([]); // extra meal slots for this session
  const [addingMealName, setAddingMealName] = useState(false);
  const [newMealName, setNewMealName] = useState("");

  const d = new Date(); d.setDate(d.getDate() + offset);
  const dateStr = d.toISOString().split("T")[0];
  const label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const entries = foodEntries.filter((e) => e.date === dateStr);

  // All meal slots: default + any custom ones used today + any added this session
  const usedCustomMeals = [...new Set(entries.map(e => e.meal).filter(m => !MEALS.includes(m)))];
  const allMeals = [...MEALS, ...usedCustomMeals, ...customMeals.filter(m => !usedCustomMeals.includes(m))];

  const cal = round(entries.reduce((s, e) => s + (e.calories || 0), 0));
  const protein = round(entries.reduce((s, e) => s + (e.protein || 0), 0));
  const carbs = round(entries.reduce((s, e) => s + (e.carbs || 0), 0));
  const fat = round(entries.reduce((s, e) => s + (e.fat || 0), 0));
  const fiber = round(entries.reduce((s, e) => s + (e.fiber || 0), 0));
  const allMet = cal >= settings.calorieGoal && protein >= settings.proteinGoal && carbs >= settings.carbsGoal && fat >= settings.fatGoal;

  return (
    <div className="pt-12 md:pt-6 pb-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={H}>Nutrition {allMet && <span className="text-lime-400">🎯</span>}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowRecipes(true)} className="text-zinc-400 text-xs border border-zinc-700 px-3 py-1.5 rounded-full">Recipes</button>
          <button onClick={() => setShowCustom(true)} className="text-lime-400 text-xs border border-lime-400 px-3 py-1.5 rounded-full">+ Custom</button>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <button onClick={() => setOffset((o) => o - 1)} className="text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center">‹</button>
        <span className="text-sm font-semibold w-28 text-center">{label}</span>
        <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} disabled={offset >= 0}
          className={`text-zinc-400 text-2xl w-8 h-8 flex items-center justify-center ${offset >= 0 ? "opacity-20" : ""}`}>›</button>
      </div>

      {/* Daily totals bar */}
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-around">
          {[
            ["Cal", cal, "kcal", "text-lime-400", cal >= settings.calorieGoal],
            ["Protein", protein, "g", "text-sky-400", protein >= settings.proteinGoal],
            ["Carbs", carbs, "g", "text-amber-400", carbs >= settings.carbsGoal],
            ["Fat", fat, "g", "text-rose-400", fat >= settings.fatGoal],
            ["Fiber", fiber, "g", "text-emerald-400", fiber >= settings.fiberGoal],
          ].map(([l, v, u, c, done]) => (
            <div key={l} className="text-center">
              <div className={`text-xl font-bold ${done ? "text-lime-400" : c}`} style={H}>{v}<span className="text-xs ml-0.5 font-normal">{u}</span></div>
              <div className={`text-xs ${done ? "text-lime-400" : "text-zinc-500"}`}>{done ? "✓" : ""}{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {allMeals.map((meal) => {
        const me = entries.filter((e) => e.meal === meal);
        const mCal = round(me.reduce((s, e) => s + (e.calories || 0), 0));
        return (
          <div key={meal} className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{meal}</span>
                {mCal > 0 && <span className="text-zinc-500 text-xs">{mCal} kcal</span>}
              </div>
              <button onClick={() => setAddModal({ meal })} className="flex items-center gap-1 text-lime-400 text-xs font-semibold">
                <Plus size={14} />Add
              </button>
            </div>
            {me.length === 0
              ? <div className="text-zinc-700 text-xs py-1">Nothing logged</div>
              : me.map((entry) => (
                <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 mb-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-2">
                      <div className="text-sm font-medium text-white leading-tight">
                        {entry.name}
                        {entry.brand === "AI Estimate" && <span className="ml-1.5 text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">est.</span>}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{round(entry.grams)}g · P:{round(entry.protein)} C:{round(entry.carbs)} F:{round(entry.fat)}</div>
                      {entry.notes && <div className="text-xs text-zinc-500 mt-0.5 italic">"{entry.notes}"</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lime-400 font-bold text-sm" style={H}>{round(entry.calories)}</span>
                      <button onClick={() => deleteFoodEntry(entry.id)} className="text-zinc-700 hover:text-red-400 p-0.5"><X size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        );
      })}

      {/* Add custom meal slot */}
      <div className="mx-4 mb-4">
        {addingMealName ? (
          <div className="flex gap-2">
            <input value={newMealName} onChange={(e) => setNewMealName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMealName.trim()) {
                  setCustomMeals(m => [...m, newMealName.trim()]);
                  setNewMealName(""); setAddingMealName(false);
                }
              }}
              placeholder="Meal name (e.g. Pre-workout snack)…" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-600" />
            <button onClick={() => {
              if (newMealName.trim()) { setCustomMeals(m => [...m, newMealName.trim()]); }
              setNewMealName(""); setAddingMealName(false);
            }} className="bg-lime-400 text-zinc-950 font-bold text-xs px-3 rounded-xl" style={H}>Add</button>
            <button onClick={() => { setNewMealName(""); setAddingMealName(false); }}
              className="text-zinc-500 px-2"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setAddingMealName(true)}
            className="text-zinc-500 text-xs flex items-center gap-1.5 hover:text-lime-400 transition-colors">
            <Plus size={12} /> Add custom meal slot
          </button>
        )}
      </div>

      {addModal && (
        <FoodSearchModal meal={addModal.meal}
          onAdd={(e) => addFoodEntry({ ...e, date: dateStr })}
          onClose={() => setAddModal(null)}
          customFoods={customFoods} recipes={recipes} />
      )}
      {showCustom && <AddCustomFoodModal onAdd={(f) => addCustomFood(f)} onClose={() => setShowCustom(false)} />}
      {showRecipes && <RecipeManager recipes={recipes} onAdd={(r) => addRecipe(r)} onUpdate={(id, r) => updateRecipe(id, r)} onDelete={(id) => deleteRecipe(id)} onClose={() => setShowRecipes(false)} />}
    </div>
  );
}
