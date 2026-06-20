import { useState } from "react";
import type { InternalAlert } from "../types";
import { cn } from "./ui";

// Ordem de prioridade: perda primeiro, depois risco, disciplina e por fim ganho.
const SEVERITY_ORDER: Record<InternalAlert["severity"], number> = {
  loss: 0,
  risk: 1,
  discipline: 2,
  gain: 3,
};

const STYLE: Record<
  InternalAlert["severity"],
  { dot: string; ring: string; label: string }
> = {
  gain: {
    dot: "bg-gain",
    ring: "border-green-200 dark:border-green-900/50",
    label: "Ganho",
  },
  loss: {
    dot: "bg-loss",
    ring: "border-red-200 dark:border-red-900/50",
    label: "Risco de perda",
  },
  discipline: {
    dot: "bg-warn",
    ring: "border-amber-200 dark:border-amber-900/50",
    label: "Disciplina",
  },
  risk: {
    dot: "bg-warn",
    ring: "border-amber-200 dark:border-amber-900/50",
    label: "Risco estatístico",
  },
};

export function AlertList({
  alerts,
  maxVisible = 3,
}: {
  alerts: InternalAlert[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-gain" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Nenhum alerta ativo. Você está dentro das suas regras.
        </p>
      </div>
    );
  }

  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hidden = sorted.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const s = STYLE[a.severity];
        return (
          <div
            key={a.id}
            className={cn("card p-3.5 border-l-4", s.ring)}
            style={{ borderLeftColor: "currentColor" }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {s.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {a.title}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {a.message}
            </p>
          </div>
        );
      })}
      {(hidden > 0 || expanded) && sorted.length > maxVisible && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-center text-sm text-slate-500 dark:text-slate-400 py-2 underline underline-offset-4"
        >
          {expanded ? "Ver menos" : `Ver mais ${hidden} alerta(s)`}
        </button>
      )}
    </div>
  );
}
