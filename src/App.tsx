import { useEffect, useState } from "react";
import { BottomNav, type TabKey } from "./components/BottomNav";
import { useTheme } from "./hooks/useTheme";
import { maybeDailySnapshot } from "./lib/backup";
import Today from "./pages/Today";
import Bets from "./pages/Bets";
import Projection from "./pages/Projection";
import Simulation from "./pages/Simulation";
import Rules from "./pages/Rules";

const VALID: TabKey[] = ["today", "bets", "projection", "simulation", "rules"];

function tabFromHash(): TabKey {
  const h = window.location.hash.replace("#", "") as TabKey;
  return VALID.includes(h) ? h : "today";
}

const TITLES: Record<TabKey, string> = {
  today: "Hoje",
  bets: "Apostas",
  projection: "Projeção",
  simulation: "Simulação",
  rules: "Regras",
};

export default function App() {
  const [tab, setTab] = useState<TabKey>(tabFromHash);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    void maybeDailySnapshot();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (t: TabKey) => {
    window.location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight">
              Bankroll Lab
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-base font-medium text-slate-500 dark:text-slate-400">
              {TITLES[tab]}
            </span>
          </div>
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4 pb-28">
        {tab === "today" && <Today onNavigate={go} />}
        {tab === "bets" && <Bets />}
        {tab === "projection" && <Projection />}
        {tab === "simulation" && <Simulation />}
        {tab === "rules" && <Rules />}
      </main>

      <BottomNav active={tab} onChange={go} />
    </div>
  );
}
