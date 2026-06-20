import { cn } from "./ui";

export type TabKey = "today" | "bets" | "projection" | "simulation" | "rules";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "today", label: "Hoje", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { key: "bets", label: "Apostas", icon: "M4 7h16M4 12h16M4 17h10" },
  {
    key: "projection",
    label: "Projeção",
    icon: "M4 19V5m0 14h16M7 15l4-5 3 3 5-7",
  },
  {
    key: "simulation",
    label: "Simulação",
    icon: "M4 5h16v4H4zM4 13h7v6H4zM14 13h6v6h-6z",
  },
  { key: "rules", label: "Regras", icon: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h4" },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-5">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 transition",
                isActive
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 2.2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={t.icon} />
              </svg>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
