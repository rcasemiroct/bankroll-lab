import { useState } from "react";
import { Field, SegmentedControl } from "./ui";
import { computeBetProfit } from "../lib/calculations";
import { formatBRL, todayISO } from "../lib/format";
import { addBet, updateBet, deleteBet, type BetInput } from "../store/data";
import type { Bet, BetStatus, Rules } from "../types";

const STATUS_OPTIONS: Array<{ value: BetStatus; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "win", label: "Ganho" },
  { value: "loss", label: "Perda" },
  { value: "void", label: "Anulada" },
];

export function BetForm({
  existing,
  rules,
  activeBankroll,
  onDone,
}: {
  existing?: Bet;
  rules: Rules;
  activeBankroll: number;
  onDone: () => void;
}) {
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [sportsbook, setSportsbook] = useState(existing?.sportsbook ?? "");
  const [event, setEvent] = useState(existing?.event ?? "");
  const [market, setMarket] = useState(existing?.market ?? "");
  const [strategy, setStrategy] = useState(existing?.strategy ?? "");
  const [odds, setOdds] = useState(existing ? String(existing.odds) : "");
  const [stake, setStake] = useState(existing ? String(existing.stake) : "");
  const [status, setStatus] = useState<BetStatus>(existing?.status ?? "pending");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");

  const oddsNum = parseFloat(odds.replace(",", ".")) || 0;
  const stakeNum = parseFloat(stake.replace(",", ".")) || 0;
  const preview = computeBetProfit(status, stakeNum, oddsNum);

  const stakePct = activeBankroll > 0 ? (stakeNum / activeBankroll) * 100 : 0;
  const stakeWarn =
    stakeNum > 0 && stakePct > rules.maxStakePct
      ? stakePct > rules.strongStakePct
        ? `Stake em ${stakePct.toFixed(1)}% da banca — acima do limite forte de ${rules.strongStakePct}%.`
        : `Stake em ${stakePct.toFixed(1)}% da banca — acima do limite de ${rules.maxStakePct}%.`
      : "";

  async function save() {
    setError("");
    if (oddsNum < 1.01) return setError("Informe uma odd válida (>= 1.01).");
    if (stakeNum <= 0) return setError("Informe um stake válido.");
    if (!strategy.trim())
      return setError("Defina uma estratégia (registrar sem estratégia não é permitido).");

    const input: BetInput = {
      date,
      sportsbook: sportsbook.trim() || "—",
      event: event.trim() || "—",
      market: market.trim() || "—",
      strategy: strategy.trim(),
      odds: oddsNum,
      stake: stakeNum,
      status,
      notes: notes.trim() || undefined,
    };
    if (existing) await updateBet(existing.id, input);
    else await addBet(input);
    onDone();
  }

  async function remove() {
    if (existing) {
      await deleteBet(existing.id);
      onDone();
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Status">
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Odd">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="1.90"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
          />
        </Field>
        <Field label="Stake (R$)">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0,00"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </Field>
      </div>

      {stakeWarn && (
        <p className="text-sm text-warn font-medium">{stakeWarn}</p>
      )}

      {stakeNum > 0 && oddsNum >= 1.01 && status !== "pending" && (
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm">
          Resultado:{" "}
          <span
            className={
              preview.profit > 0
                ? "text-gain font-semibold"
                : preview.profit < 0
                  ? "text-loss font-semibold"
                  : "font-semibold"
            }
          >
            {formatBRL(preview.profit)}
          </span>
        </div>
      )}

      <Field label="Estratégia">
        <input
          className="input"
          placeholder="Ex.: Value odds, Over/Under, Handicap"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Casa">
          <input
            className="input"
            placeholder="Casa"
            value={sportsbook}
            onChange={(e) => setSportsbook(e.target.value)}
          />
        </Field>
        <Field label="Data">
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Evento">
        <input
          className="input"
          placeholder="Time A x Time B"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        />
      </Field>
      <Field label="Mercado">
        <input
          className="input"
          placeholder="ML, Over 2.5, Handicap..."
          value={market}
          onChange={(e) => setMarket(e.target.value)}
        />
      </Field>
      <Field label="Notas (opcional)">
        <textarea
          className="input min-h-[72px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-loss font-medium">{error}</p>}

      <div className="flex gap-3 pt-1">
        {existing && (
          <button className="btn-ghost text-loss" onClick={remove}>
            Excluir
          </button>
        )}
        <button className="btn-primary flex-1" onClick={save}>
          {existing ? "Salvar alterações" : "Salvar aposta"}
        </button>
      </div>
    </div>
  );
}
