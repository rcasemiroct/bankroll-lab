import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  useSimulationSettings,
  saveSimulationSettings,
} from "../store/data";
import { type MonteCarloResult } from "../lib/monteCarlo";
import { runMonteCarloAsync } from "../lib/runMonteCarloAsync";
import { formatBRL, formatPct, formatNumber } from "../lib/format";
import { Card, Field, StatCard, SectionTitle, SegmentedControl } from "../components/ui";
import { ChartCard, axisStyle, brlAxis, COLORS } from "../components/charts";
import type { SimulationSettings } from "../types";

export default function Simulation() {
  const stored = useSimulationSettings();
  const [s, setS] = useState<SimulationSettings | null>(null);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (stored && !s) setS(stored);
  }, [stored, s]);

  if (!s) return <p className="text-slate-400 text-sm">Carregando…</p>;

  const update = (patch: Partial<SimulationSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSimulationSettings(next);
  };
  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const run = () => {
    setRunning(true);
    runMonteCarloAsync(s).then((r) => {
      setResult(r);
      setRunning(false);
    });
  };

  const impliedNeeded = s.averageOdds > 0 ? 1 / s.averageOdds : 0;
  const edge = s.winProbability - impliedNeeded;

  return (
    <div className="space-y-5">
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Simulação Monte Carlo de cenários hipotéticos. Não recomenda apostas nem prevê resultados — serve para entender risco de ruína e dispersão.
        </p>
      </Card>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Banca inicial (R$)">
            <input className="input" type="number" inputMode="decimal" value={s.initialBankroll} onChange={(e) => update({ initialBankroll: num(e.target.value) })} />
          </Field>
          <Field label="Meta (R$)">
            <input className="input" type="number" inputMode="decimal" value={s.targetBankroll} onChange={(e) => update({ targetBankroll: num(e.target.value) })} />
          </Field>
          <Field label="Stop (R$)">
            <input className="input" type="number" inputMode="decimal" value={s.stopBankroll} onChange={(e) => update({ stopBankroll: num(e.target.value) })} />
          </Field>
          <Field label="Odd média">
            <input className="input" type="number" inputMode="decimal" value={s.averageOdds} onChange={(e) => update({ averageOdds: num(e.target.value) })} />
          </Field>
          <Field label="Prob. de acerto (%)" hint={`Break-even: ${formatPct(impliedNeeded)}`}>
            <input className="input" type="number" inputMode="decimal" value={Math.round(s.winProbability * 100)} onChange={(e) => update({ winProbability: num(e.target.value) / 100 })} />
          </Field>
          <Field label="Stake máx (R$)">
            <input className="input" type="number" inputMode="decimal" value={s.maxStake} onChange={(e) => update({ maxStake: num(e.target.value) })} />
          </Field>
        </div>

        <Field label="Modo de stake">
          <SegmentedControl
            value={s.stakeMode}
            onChange={(v) => update({ stakeMode: v })}
            options={[
              { value: "percentage", label: "% da banca" },
              { value: "fixed", label: "Fixo" },
            ]}
          />
        </Field>
        {s.stakeMode === "percentage" ? (
          <Field label="Stake (% da banca)">
            <input className="input" type="number" inputMode="decimal" value={s.stakePercentage} onChange={(e) => update({ stakePercentage: num(e.target.value) })} />
          </Field>
        ) : (
          <Field label="Stake fixo (R$)">
            <input className="input" type="number" inputMode="decimal" value={s.fixedStake} onChange={(e) => update({ fixedStake: num(e.target.value) })} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Apostas por simulação">
            <input className="input" type="number" inputMode="numeric" value={s.numberOfBets} onChange={(e) => update({ numberOfBets: num(e.target.value) })} />
          </Field>
          <Field label="Nº de simulações">
            <input className="input" type="number" inputMode="numeric" value={s.numberOfSimulations} onChange={(e) => update({ numberOfSimulations: num(e.target.value) })} />
          </Field>
        </div>

        {edge < 0 && (
          <p className="text-sm text-warn font-medium">
            Com esses parâmetros o edge é negativo ({formatPct(edge)}): a odd média exige uma taxa de acerto maior que a informada.
          </p>
        )}

        <button className="btn-primary w-full" onClick={run} disabled={running}>
          {running ? "Simulando…" : "Rodar simulação"}
        </button>
      </div>

      {result && (
        <>
          <div>
            <SectionTitle>Resultado</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Prob. de meta" value={formatPct(result.probabilityOfTarget)} tone="neutral" />
              <StatCard label="Prob. de ruína" value={formatPct(result.probabilityOfRuin)} tone={result.probabilityOfRuin > 0.3 ? "loss" : "warn"} />
              <StatCard label="Banca final média" value={formatBRL(result.averageFinalBankroll)} />
              <StatCard label="Mediana" value={formatBRL(result.medianFinalBankroll)} />
              <StatCard label="P10 (pessimista)" value={formatBRL(result.p10FinalBankroll)} tone="loss" />
              <StatCard label="P90 (otimista)" value={formatBRL(result.p90FinalBankroll)} tone="gain" />
              <StatCard label="Drawdown médio" value={formatPct(result.averageMaxDrawdown)} tone={result.averageMaxDrawdown > 0.3 ? "loss" : "warn"} />
              <StatCard label="Apostas até meta" value={result.averageBetsToTarget ? formatNumber(result.averageBetsToTarget, 0) : "—"} />
            </div>
          </div>

          <ChartCard title="Distribuição da banca final" subtitle="Onde a banca terminou nas simulações">
            <BarChart data={result.histogram} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="mid" tickFormatter={brlAxis} tick={axisStyle} minTickGap={28} />
              <YAxis tick={axisStyle} width={36} />
              <Tooltip formatter={(v: number) => `${v} sim.`} labelFormatter={(v: number) => formatBRL(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill={COLORS.base} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Meta vs ruína" height={160}>
            <BarChart
              layout="vertical"
              data={[
                { name: "Meta", v: result.probabilityOfTarget * 100, fill: COLORS.gain },
                { name: "Ruína", v: result.probabilityOfRuin * 100, fill: COLORS.loss },
              ]}
              margin={{ top: 5, right: 16, left: 8, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={axisStyle} />
              <YAxis type="category" dataKey="name" tick={axisStyle} width={56} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="v" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>

          {result.samplePaths.length > 0 && (
            <ChartCard title="Caminhos simulados" subtitle="Amostra de trajetórias de banca">
              <LineChart margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis type="number" dataKey="bet" tick={axisStyle} allowDuplicatedCategory={false} />
                <YAxis tickFormatter={brlAxis} tick={axisStyle} width={48} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                {result.samplePaths.map((p, i) => (
                  <Line
                    key={i}
                    data={p}
                    dataKey="bankroll"
                    stroke={COLORS.neutral}
                    strokeWidth={1}
                    dot={false}
                    opacity={0.5}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
