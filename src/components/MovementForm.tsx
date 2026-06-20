import { useState } from "react";
import { Field, SegmentedControl } from "./ui";
import { todayISO } from "../lib/format";
import { addMovement, type MovementInput } from "../store/data";
import { createSnapshot } from "../lib/backup";
import type { MovementType } from "../types";

const TYPE_OPTIONS: Array<{ value: MovementType; label: string }> = [
  { value: "deposit", label: "Depósito" },
  { value: "withdrawal", label: "Retirada" },
  { value: "bonus", label: "Bônus" },
  { value: "adjustment", label: "Ajuste" },
];

export function MovementForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<MovementType>("deposit");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const amt = parseFloat(amount.replace(",", ".")) || 0;
    if (type === "adjustment") {
      if (amt === 0) return setError("Informe um valor de ajuste (pode ser negativo).");
    } else if (amt <= 0) {
      return setError("Informe um valor válido.");
    }
    const input: MovementInput = {
      date,
      type,
      amount: amt,
      notes: notes.trim() || undefined,
    };
    await addMovement(input);
    // snapshot ao registrar retirada relevante
    if (type === "withdrawal") await createSnapshot("withdrawal_milestone");
    onDone();
  }

  return (
    <div className="space-y-4">
      <Field label="Tipo">
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Valor (R$)"
          hint={type === "adjustment" ? "Use negativo para reduzir." : undefined}
        >
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
      <Field label="Notas (opcional)">
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-loss font-medium">{error}</p>}

      <button className="btn-primary w-full" onClick={save}>
        Salvar movimento
      </button>
    </div>
  );
}
