import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  useProjectionSettings,
  useBets,
  useMovements,
  saveProjectionSettings,
} from "../store/data";
import { computeProjection } from "../lib/projections";
import { computeMetrics } from "../lib/calculations";
import { formatBRL, formatDateBR } from "../lib/format";
import { Card, Field, StatCard, SectionTitle } from "../components/ui";
import { ChartCard, axisStyle, brlAxis, COLORS } from "../components/charts";
import type { ProjectionSettings } from "../types";

export default function Projection() {
  const stored = useProjectionSettings();
  const bets = useBets();
  const movements = useMovements();
  const [s, setS] = useState<ProjectionSettings | null>(null);

  useEffect(() => {
    if (stored && !s) setS(stored);
  }, [stored, s]);

  const m = bets && movements ? computeMetrics(bets, movements) : null;
  const proj = useMemo(() => (s ? computeProjection(s) : null), [s]);

  if (!s || !proj) return <p className="text-slate-400 text-sm">Carregando…</p>;

  const update = (patch: Partial<ProjectionSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveProjectionSettings(next);
  };

  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const actual = m?.activeBankroll ?? 0;
  const gap = actual - proj.expectedBankrollToday;

  return (
    <div className="space-y-5">
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Projeção não é previsão. Ela depende de edge real, disciplina de stake e amostra estatística suficiente.
        </p>
      </Card>

      <div>
        <SectionTitle>Parâmetros</SectionTitle>
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Banca inicial (R$)">
              <input className="input" type="number" inputMode="decimal" value={s.initialBankroll} onChange={(e) => update({ initialBankroll: num(e.target.value) })} />
            </Field>
            <Field label="Meta (R$)">
              <input className="input" type="number" inputMode="decimal" value={s.targetBankroll} onChange={(e) => update({ targetBankroll: num(e.target.value) })} />
            </Field>
            <Field label="Retorno por ciclo (%)">
              <input className="input" type="number" inputMode="decimal" value={s.expectedReturnPerCycle} onChange={(e) => update({ expectedReturnPerCycle: num(e.target.value) })} />
            </Field>
            <Field label="Ciclos por semana">
              <input className="input" type="number" inputMode="numeric" value={s.cyclesPerWeek} onChange={(e) => update({ cyclesPerWeek: num(e.target.value) })} />
            </Field>
          </div>
          <Field label="Data inicial">
            <input className="input" type="date" value={s.startDate} onChange={(e) => update({ startDate: e.target.value })} />
          </Field>
        </div>
      </div>

      <div>
        <SectionTitle>Cenários até a meta</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <ScenarioCard label="Conservador" cycles={proj.cyclesToTarget.conservative} date={proj.dateToTarget.conservative} />
          <ScenarioCard label="Base" cycles={proj.cyclesToTarget.base} date={proj.dateToTarget.base} />
          <ScenarioCard label="Agressivo" cycles={proj.cyclesToTarget.aggressive} date={proj.dateToTarget.aggressive} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Falta para a meta" value={formatBRL(Math.max(0, s.targetBankroll - actual))} />
        <StatCard
          label="Banca esperada hoje"
          value={formatBRL(proj.expectedBankrollToday)}
          sub="cenário base"
        />
        <StatCard
          label="Banca atual"
          value={formatBRL(actual)}
          tone={gap >= 0 ? "gain" : "loss"}
          sub={gap >= 0 ? "acima do plano" : "abaixo do plano"}
        />
        <StatCard
          label="Ciclos positivos p/ meta"
          value={proj.cyclesToTarget.base != null ? String(proj.cyclesToTarget.base) : "—"}
          sub="cenário base"
        />
      </div>

      <ChartCard title="Banca projetada" subtitle="Conservador · Base · Agressivo" height={240}>
        <LineChart data={proj.points} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDateBR} tick={axisStyle} minTickGap={32} />
          <YAxis tickFormatter={brlAxis} tick={axisStyle} width={48} />
          <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={formatDateBR} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={s.targetBankroll} stroke={COLORS.gain} strokeDasharray="4 4" />
          {actual > 0 && <ReferenceLine y={actual} stroke={COLORS.base} strokeDasharray="2 2" />}
          <Line name="Conservador" type="monotone" dataKey="conservative" stroke={COLORS.warn} strokeWidth={2} dot={false} />
          <Line name="Base" type="monotone" dataKey="base" stroke={COLORS.base} strokeWidth={2} dot={false} />
          <Line name="Agressivo" type="monotone" dataKey="aggressive" stroke={COLORS.gain} strokeWidth={2} dot={false} />
        </LineChart>
      </ChartCard>
    </div>
  );
}

function ScenarioCard({
  label,
  cycles,
  date,
}: {
  label: string;
  cycles: number | null;
  date: string | null;
}) {
  return (
    <div className="card p-3">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-bold mt-1">
        {cycles != null ? `${cycles}` : "—"}
        <span className="text-xs font-normal text-slate-400"> ciclos</span>
      </div>
      <div className="text-xs text-slate-400 mt-0.5">
        {date ? formatDateBR(date) : "inatingível"}
      </div>
    </div>
  );
}
