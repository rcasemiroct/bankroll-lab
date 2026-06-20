import { useMemo, useState } from "react";
import { useBets, useMovements, useRules } from "../store/data";
import { computeMetrics } from "../lib/calculations";
import { formatBRL, formatDateBR, formatNumber } from "../lib/format";
import { Sheet, Badge, cn } from "../components/ui";
import { BetForm } from "../components/BetForm";
import type { Bet, BetStatus } from "../types";

const STATUS_LABEL: Record<BetStatus, string> = {
  pending: "Pendente",
  win: "Ganho",
  loss: "Perda",
  void: "Anulada",
};
const STATUS_TONE: Record<BetStatus, "neutral" | "gain" | "loss" | "warn"> = {
  pending: "warn",
  win: "gain",
  loss: "loss",
  void: "neutral",
};

type PeriodFilter = "all" | "7" | "30" | "90";

export default function Bets() {
  const bets = useBets();
  const movements = useMovements();
  const rules = useRules();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Bet | undefined>();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [statusF, setStatusF] = useState<BetStatus | "all">("all");
  const [strategyF, setStrategyF] = useState<string>("all");
  const [houseF, setHouseF] = useState<string>("all");

  const strategies = useMemo(
    () => Array.from(new Set((bets ?? []).map((b) => b.strategy).filter(Boolean))),
    [bets]
  );
  const houses = useMemo(
    () => Array.from(new Set((bets ?? []).map((b) => b.sportsbook).filter(Boolean))),
    [bets]
  );

  const m =
    bets && movements ? computeMetrics(bets, movements) : null;

  const filtered = useMemo(() => {
    if (!bets) return [];
    const cutoff =
      period === "all"
        ? null
        : new Date(Date.now() - parseInt(period) * 86400000)
            .toISOString()
            .slice(0, 10);
    const q = search.trim().toLowerCase();
    return bets
      .filter((b) => (cutoff ? b.date >= cutoff : true))
      .filter((b) => (statusF === "all" ? true : b.status === statusF))
      .filter((b) => (strategyF === "all" ? true : b.strategy === strategyF))
      .filter((b) => (houseF === "all" ? true : b.sportsbook === houseF))
      .filter((b) =>
        q
          ? `${b.event} ${b.market} ${b.strategy} ${b.sportsbook}`
              .toLowerCase()
              .includes(q)
          : true
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [bets, period, statusF, strategyF, houseF, search]);

  if (!bets || !rules) return <p className="text-slate-400 text-sm">Carregando…</p>;

  const openNew = () => {
    setEditing(undefined);
    setSheetOpen(true);
  };
  const openEdit = (b: Bet) => {
    setEditing(b);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <button className="btn-primary w-full" onClick={openNew}>
        + Nova aposta
      </button>

      <input
        className="input"
        placeholder="Buscar evento, mercado, estratégia…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* filtros */}
      <div className="space-y-2">
        <Chips
          value={period}
          onChange={(v) => setPeriod(v as PeriodFilter)}
          options={[
            { value: "all", label: "Tudo" },
            { value: "7", label: "7d" },
            { value: "30", label: "30d" },
            { value: "90", label: "90d" },
          ]}
        />
        <Chips
          value={statusF}
          onChange={(v) => setStatusF(v as BetStatus | "all")}
          options={[
            { value: "all", label: "Status" },
            { value: "pending", label: "Pendente" },
            { value: "win", label: "Ganho" },
            { value: "loss", label: "Perda" },
            { value: "void", label: "Anulada" },
          ]}
        />
        {strategies.length > 0 && (
          <Chips
            value={strategyF}
            onChange={setStrategyF}
            options={[
              { value: "all", label: "Estratégia" },
              ...strategies.map((s) => ({ value: s, label: s })),
            ]}
          />
        )}
        {houses.length > 0 && (
          <Chips
            value={houseF}
            onChange={setHouseF}
            options={[
              { value: "all", label: "Casa" },
              ...houses.map((s) => ({ value: s, label: s })),
            ]}
          />
        )}
      </div>

      {m && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {filtered.length} aposta(s) · resultado realizado:{" "}
          <span className={m.realizedProfit >= 0 ? "text-gain" : "text-loss"}>
            {formatBRL(m.realizedProfit)}
          </span>
        </p>
      )}

      {/* lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-400">
            Nenhuma aposta encontrada.
          </div>
        )}
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => openEdit(b)}
            className="card p-3.5 w-full text-left active:scale-[0.99] transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">
                {formatDateBR(b.date)} · {b.sportsbook}
              </span>
              <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
            </div>
            <div className="font-semibold text-sm mt-1 truncate">{b.event}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {b.market} · {b.strategy}
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {formatNumber(b.odds)} @ {formatBRL(b.stake)}
              </span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  b.status === "win"
                    ? "text-gain"
                    : b.status === "loss"
                      ? "text-loss"
                      : "text-slate-400"
                )}
              >
                {b.status === "pending"
                  ? "—"
                  : formatBRL(b.profit)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Editar aposta" : "Nova aposta"}
      >
        <BetForm
          existing={editing}
          rules={rules}
          activeBankroll={m?.activeBankroll ?? 0}
          onDone={() => setSheetOpen(false)}
        />
      </Sheet>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition",
            value === o.value
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
              : "bg-transparent text-slate-500 border-slate-300 dark:border-slate-700"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
