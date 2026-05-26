import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";
import { H } from "./lib/constants";
import useProfileData from "./lib/useProfileData";
import ProfileScreen from "./components/ProfileScreen";
import Dashboard from "./components/Dashboard";
import NutritionPage from "./components/NutritionPage";
import WorkoutPage from "./components/WorkoutPage";
import BodyPage from "./components/BodyPage";
import ProgressPage from "./components/ProgressPage";
import SettingsPage from "./components/SettingsPage";
import { Sidebar, BottomNav } from "./components/Layout";

export default function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const [profile, setProfile] = useState(() => {
    try { const s = localStorage.getItem("ft_active_profile"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const data = useProfileData(profile?.id);

  const selectProfile = (p) => {
    localStorage.setItem("ft_active_profile", JSON.stringify(p));
    setProfile(p);
  };
  const switchProfile = () => {
    localStorage.removeItem("ft_active_profile");
    setProfile(null);
    setPage("dashboard");
  };

  if (!supabase) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-4xl font-bold text-lime-400 mb-3" style={H}>FitTrack</div>
        <div className="text-zinc-400 text-sm">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel environment variables.
        </div>
      </div>
    </div>
  );

  if (!profile) return <ProfileScreen onSelect={selectProfile} />;

  if (data.loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={28} className="text-lime-400 animate-spin" />
        <div className="text-zinc-400 text-sm">Loading {profile.name}'s data…</div>
      </div>
    </div>
  );

  return (
    <div className="bg-zinc-950 min-h-screen text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar page={page} setPage={setPage} profile={profile} />
      <div className="md:ml-56 pb-20 md:pb-4">
        <div className="max-w-2xl md:max-w-4xl mx-auto">
          {page === "dashboard"  && <Dashboard    data={data} profile={profile} />}
          {page === "nutrition"  && <NutritionPage data={data} />}
          {page === "workout"    && <WorkoutPage   data={data} />}
          {page === "body"       && <BodyPage      data={data} />}
          {page === "progress"   && <ProgressPage  data={data} />}
          {page === "settings"   && <SettingsPage  data={data} profile={profile} onSwitchProfile={switchProfile} />}
        </div>
      </div>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
