import React from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ===== Card =====
export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={cn("card p-4", className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 mt-1">
      {children}
    </h2>
  );
}

// ===== StatCard =====
export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  big = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "gain" | "loss" | "warn";
  big?: boolean;
}) {
  const toneClass =
    tone === "gain"
      ? "text-gain"
      : tone === "loss"
        ? "text-loss"
        : tone === "warn"
          ? "text-warn"
          : "text-slate-900 dark:text-slate-100";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "font-bold tabular-nums mt-1",
          big ? "text-3xl" : "text-xl",
          toneClass
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

// ===== Badge =====
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gain" | "loss" | "warn";
}) {
  const map = {
    neutral:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    gain: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    loss: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

// ===== Field =====
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}

// ===== SegmentedControl =====
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
            value === o.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ===== Bottom Sheet =====
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}
