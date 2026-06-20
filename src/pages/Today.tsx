import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  useBets,
  useMovements,
  useRules,
  useSettings,
} from "../store/data";
import {
  computeMetrics,
  computeRiskStatus,
  buildEquityCurve,
} from "../lib/calculations";
import { buildAlerts, isBackupLate } from "../lib/alerts";
import { runMonteCarlo } from "../lib/monteCarlo";
import { formatBRL, formatPct, formatNumber, formatDateBR } from "../lib/format";
import { StatCard, Card, SectionTitle, Sheet, Badge } from "../components/ui";
import { AlertList } from "../components/AlertList";
import { ChartCard, axisStyle, brlAxis, COLORS } from "../components/charts";
import { BetForm } from "../components/BetForm";
import { MovementForm } from "../components/MovementForm";
import type { TabKey } from "../components/BottomNav";

export default function Today({ onNavigate }: { onNavigate: (t: TabKey) => void }) {
  const bets = useBets();
  const movements = useMovements();
  const rules = useRules();
  const settings = useSettings();
  const [sheet, setSheet] = useState<null | "bet" | "movement">(null);

  const ready = bets && movements && rules && settings;

  const m = useMemo(
    () => (bets && movements ? computeMetrics(bets, movements) : null),
    [bets, movements]
  );
  const curve = useMemo(
    () => (bets && movements ? buildEquityCurve(bets, movements) : []),
    [bets, movements]
  );

  const mc = useMemo(() => {
    if (!m || !rules || m.activeBankroll <= 0) return null;
    const winP = m.winRate > 0 ? m.winRate : 0.5;
    const avgO = m.avgOdds > 1 ? m.avgOdds : 1.9;
    return runMonteCarlo({
      initialBankroll: m.activeBankroll,
      targetBankroll: rules.targetBankroll,
      stopBankroll: Math.max(1, m.activeBankroll * 0.2),
      averageOdds: avgO,
      winProbability: winP,
      stakeMode: "percentage",
      fixedStake: 0,
      stakePercentage: rules.maxStakePct,
      maxStake: rules.targetBankroll,
      numberOfBets: 500,
      numberOfSimulations: 800,
    });
  }, [m, rules]);

  if (!ready || !m) {
    return <p className="text-slate-400 text-sm">Carregando…</p>;
  }

  const backupLate = isBackupLate(settings);
  const risk = computeRiskStatus(m, rules, backupLate);
  const alerts = buildAlerts(m, rules, bets, movements, settings);

  const progress =
    rules.targetBankroll > 0
      ? Math.max(0, Math.min(1, m.activeBankroll / rules.targetBankroll))
      : 0;
  const distance = Math.max(0, rules.targetBankroll - m.activeBankroll);

  return (
    <div className="space-y-5">
      {/* Banca + status */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Banca ativa
          </span>
          <Badge tone={risk.tone === "neutral" ? "neutral" : risk.tone}>
            {risk.label}
          </Badge>
        </div>
        <div className="text-4xl font-bold tabular-nums mt-1">
          {formatBRL(m.activeBankroll)}
        </div>
        <div className="mt-1 text-sm">
          Lucro líquido real:{" "}
          <span
            className={
              m.netRealProfit > 0
                ? "text-gain font-semibold"
                : m.netRealProfit < 0
                  ? "text-loss font-semibold"
                  : "font-semibold"
            }
          >
            {formatBRL(m.netRealProfit)}
          </span>
        </div>

        {/* progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Progresso até a meta</span>
            <span>{formatPct(progress, 0)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gain transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatBRL(m.activeBankroll, true)}</span>
            <span>Falta {formatBRL(distance, true)}</span>
          </div>
        </div>
      </Card>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => setSheet("bet")}>
          + Nova aposta
        </button>
        <button className="btn-ghost" onClick={() => setSheet("movement")}>
          + Novo movimento
        </button>
      </div>

      {/* Alertas */}
      <div>
        <SectionTitle>Alertas ativos</SectionTitle>
        <AlertList alerts={alerts} />
      </div>

      {/* Métricas principais */}
      <div>
        <SectionTitle>Capital</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Capital em risco" value={formatBRL(m.capitalAtRisk)} tone={m.capitalAtRisk > 0 ? "warn" : "neutral"} />
          <StatCard label="Lucro realizado" value={formatBRL(m.realizedProfit)} tone={m.realizedProfit >= 0 ? "gain" : "loss"} />
          <StatCard label="Depósitos" value={formatBRL(m.depositsTotal)} />
          <StatCard label="Retiradas" value={formatBRL(m.withdrawalsTotal)} />
        </div>
      </div>

      {/* Curva da banca */}
      {curve.length > 1 && (
        <ChartCard title="Evolução da banca" subtitle="Banca acumulada ao longo do tempo">
          <LineChart data={curve} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDateBR} tick={axisStyle} minTickGap={28} />
            <YAxis tickFormatter={brlAxis} tick={axisStyle} width={48} />
            <Tooltip
              formatter={(v: number) => formatBRL(v)}
              labelFormatter={formatDateBR}
              contentStyle={{ borderRadius: 12, fontSize: 12 }}
            />
            <ReferenceLine y={rules.targetBankroll} stroke={COLORS.gain} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="bankroll" stroke={COLORS.base} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>
      )}

      {/* Indicadores estatísticos */}
      <div>
        <SectionTitle>Desempenho</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="ROI sobre depósitos" value={formatPct(m.roiOnDeposits)} tone={m.roiOnDeposits >= 0 ? "gain" : "loss"} />
          <StatCard label="Win rate" value={formatPct(m.winRate)} sub={`${m.wins}V / ${m.losses}D`} />
          <StatCard label="Odd média" value={m.avgOdds ? formatNumber(m.avgOdds) : "—"} />
          <StatCard label="Break-even" value={m.breakEven ? formatPct(m.breakEven) : "—"} sub="acerto necessário" />
          <StatCard label="Edge observado" value={m.settledCount >= 10 ? formatPct(m.edge) : "—"} tone={m.edge >= 0 ? "gain" : "loss"} sub={m.settledCount < 10 ? "amostra pequena" : undefined} />
          <StatCard label="Sequência atual" value={m.streakCount > 0 ? `${m.streakCount} ${m.streakType === "win" ? "ganhos" : "perdas"}` : "—"} tone={m.streakType === "win" ? "gain" : m.streakType === "loss" ? "loss" : "neutral"} />
          <StatCard label="Drawdown atual" value={formatPct(m.currentDrawdown)} tone={m.currentDrawdown >= 0.1 ? "loss" : "neutral"} />
          <StatCard label="Drawdown máximo" value={formatPct(m.maxDrawdown)} tone={m.maxDrawdown >= 0.2 ? "loss" : "neutral"} />
        </div>
      </div>

      {/* Probabilidade simulada */}
      {mc && (
        <div>
          <SectionTitle>Probabilidade simulada (com base no histórico)</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Chegar à meta" value={formatPct(mc.probabilityOfTarget)} tone="neutral" />
            <StatCard label="Quebrar antes" value={formatPct(mc.probabilityOfRuin)} tone={mc.probabilityOfRuin > 0.3 ? "loss" : "warn"} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Simulação baseada no seu win rate e odd média atuais. Amostra pequena distorce o resultado. Não é previsão.
          </p>
        </div>
      )}

      <Sheet open={sheet === "bet"} onClose={() => setSheet(null)} title="Nova aposta">
        <BetForm rules={rules} activeBankroll={m.activeBankroll} onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "movement"} onClose={() => setSheet(null)} title="Novo movimento">
        <MovementForm onDone={() => setSheet(null)} />
      </Sheet>

      <button
        onClick={() => onNavigate("rules")}
        className="w-full text-center text-sm text-slate-400 dark:text-slate-500 underline underline-offset-4 py-2"
      >
        Configurar regras e backup
      </button>
    </div>
  );
}
