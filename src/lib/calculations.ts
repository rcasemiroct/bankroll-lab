import type { Bet, BankrollMovement, BetStatus, Rules } from "../types";

// ===== Lucro de uma aposta =====
export function computeBetProfit(
  status: BetStatus,
  stake: number,
  odds: number
): { profit: number; returnAmount: number } {
  switch (status) {
    case "win":
      return { profit: stake * (odds - 1), returnAmount: stake * odds };
    case "loss":
      return { profit: -stake, returnAmount: 0 };
    case "void":
      return { profit: 0, returnAmount: stake };
    case "pending":
    default:
      return { profit: 0, returnAmount: 0 };
  }
}

export interface RiskStatus {
  key:
    | "healthy"
    | "small_sample"
    | "high_drawdown"
    | "ruin_risk"
    | "target_far"
    | "backup_late";
  label: string;
  tone: "gain" | "warn" | "loss" | "neutral";
}

export interface Metrics {
  activeBankroll: number;
  netRealProfit: number; // banca ativa + retiradas - depósitos
  capitalAtRisk: number; // stake de apostas pendentes
  depositsTotal: number;
  withdrawalsTotal: number;
  bonusTotal: number;
  adjustmentsTotal: number;
  realizedProfit: number; // lucro de apostas encerradas
  exposedProfit: number; // lucro/prejuízo ainda exposto (pendentes a odds atuais — não realizado)
  roiOnDeposits: number;
  settledCount: number;
  pendingCount: number;
  wins: number;
  losses: number;
  voids: number;
  winRate: number;
  avgOdds: number;
  breakEven: number; // 1/avgOdds
  edge: number; // winRate - breakEven
  currentDrawdown: number; // 0..1
  maxDrawdown: number; // 0..1
  peakBankroll: number;
  streakType: "win" | "loss" | "none";
  streakCount: number;
}

function sortByDate<T extends { date: string; createdAt?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ca = a.createdAt ?? "";
    const cb = b.createdAt ?? "";
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
}

export function computeMetrics(
  bets: Bet[],
  movements: BankrollMovement[]
): Metrics {
  const depositsTotal = movements
    .filter((m) => m.type === "deposit")
    .reduce((s, m) => s + m.amount, 0);
  const bonusTotal = movements
    .filter((m) => m.type === "bonus")
    .reduce((s, m) => s + m.amount, 0);
  const withdrawalsTotal = movements
    .filter((m) => m.type === "withdrawal")
    .reduce((s, m) => s + m.amount, 0);
  const adjustmentsTotal = movements
    .filter((m) => m.type === "adjustment")
    .reduce((s, m) => s + m.amount, 0);

  const settled = bets.filter((b) => b.status !== "pending");
  const pending = bets.filter((b) => b.status === "pending");
  const realizedProfit = settled.reduce((s, b) => s + b.profit, 0);
  const capitalAtRisk = pending.reduce((s, b) => s + b.stake, 0);
  const exposedProfit = pending.reduce(
    (s, b) => s + b.stake * (b.odds - 1),
    0
  );

  const activeBankroll =
    depositsTotal +
    bonusTotal +
    adjustmentsTotal -
    withdrawalsTotal +
    realizedProfit;

  // Fórmula do brief: lucro líquido real = banca ativa + retiradas - depósitos
  const netRealProfit = activeBankroll + withdrawalsTotal - depositsTotal;

  const wins = settled.filter((b) => b.status === "win").length;
  const losses = settled.filter((b) => b.status === "loss").length;
  const voids = settled.filter((b) => b.status === "void").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? wins / decided : 0;

  const oddsSample = settled.filter((b) => b.status !== "void");
  const avgOdds =
    oddsSample.length > 0
      ? oddsSample.reduce((s, b) => s + b.odds, 0) / oddsSample.length
      : 0;
  const breakEven = avgOdds > 0 ? 1 / avgOdds : 0;
  const edge = decided > 0 && avgOdds > 0 ? winRate - breakEven : 0;

  const roiOnDeposits = depositsTotal > 0 ? realizedProfit / depositsTotal : 0;

  // ===== Curva de banca para drawdown =====
  const { currentDrawdown, maxDrawdown, peakBankroll } = computeDrawdown(
    bets,
    movements
  );

  // ===== Streak =====
  const decidedSorted = sortByDate(
    settled.filter((b) => b.status === "win" || b.status === "loss")
  );
  let streakType: "win" | "loss" | "none" = "none";
  let streakCount = 0;
  for (let i = decidedSorted.length - 1; i >= 0; i--) {
    const s = decidedSorted[i].status as "win" | "loss";
    if (streakType === "none") {
      streakType = s;
      streakCount = 1;
    } else if (s === streakType) {
      streakCount++;
    } else break;
  }

  return {
    activeBankroll,
    netRealProfit,
    capitalAtRisk,
    depositsTotal,
    withdrawalsTotal,
    bonusTotal,
    adjustmentsTotal,
    realizedProfit,
    exposedProfit,
    roiOnDeposits,
    settledCount: settled.length,
    pendingCount: pending.length,
    wins,
    losses,
    voids,
    winRate,
    avgOdds,
    breakEven,
    edge,
    currentDrawdown,
    maxDrawdown,
    peakBankroll,
    streakType,
    streakCount,
  };
}

// Constrói a curva de banca cronológica e mede drawdown.
export interface EquityPoint {
  date: string;
  bankroll: number;
  cumulativeProfit: number;
}

export function buildEquityCurve(
  bets: Bet[],
  movements: BankrollMovement[]
): EquityPoint[] {
  type Ev = { date: string; createdAt: string; delta: number; isBet: boolean };
  const events: Ev[] = [];

  for (const m of movements) {
    let delta = 0;
    if (m.type === "deposit" || m.type === "bonus") delta = m.amount;
    else if (m.type === "withdrawal") delta = -m.amount;
    else if (m.type === "adjustment") delta = m.amount;
    events.push({ date: m.date, createdAt: m.createdAt, delta, isBet: false });
  }
  for (const b of bets) {
    if (b.status === "pending") continue;
    events.push({ date: b.date, createdAt: b.updatedAt, delta: b.profit, isBet: true });
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });

  // Colapsa por data, mantendo o último valor do dia.
  const byDate = new Map<string, EquityPoint>();
  let bankroll = 0;
  let cumProfit = 0;
  for (const e of events) {
    bankroll += e.delta;
    if (e.isBet) cumProfit += e.delta;
    byDate.set(e.date, { date: e.date, bankroll, cumulativeProfit: cumProfit });
  }

  return Array.from(byDate.values());
}

function computeDrawdown(bets: Bet[], movements: BankrollMovement[]) {
  const curve = buildEquityCurve(bets, movements);
  let peak = 0;
  let maxDd = 0;
  let last = 0;
  for (const p of curve) {
    if (p.bankroll > peak) peak = p.bankroll;
    if (peak > 0) {
      const dd = (peak - p.bankroll) / peak;
      if (dd > maxDd) maxDd = dd;
    }
    last = p.bankroll;
  }
  const currentDrawdown = peak > 0 ? Math.max(0, (peak - last) / peak) : 0;
  return { currentDrawdown, maxDrawdown: maxDd, peakBankroll: peak };
}

// ===== Análise por estratégia =====
export interface StrategyStat {
  strategy: string;
  count: number;
  profit: number;
  roi: number;
  winRate: number;
  avgOdds: number;
  breakEven: number;
  edge: number;
  maxLossStreak: number;
  sampleStatus:
    | "Insuficiente"
    | "Em observação"
    | "Mais consistente"
    | "Risco elevado"
    | "Negativa até agora";
}

export function computeStrategyStats(
  bets: Bet[],
  minBetsForStrategy: number
): StrategyStat[] {
  const groups = new Map<string, Bet[]>();
  for (const b of bets) {
    const key = b.strategy?.trim() || "Sem estratégia";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const stats: StrategyStat[] = [];
  for (const [strategy, list] of groups) {
    const settled = list.filter((b) => b.status !== "pending");
    const decided = settled.filter(
      (b) => b.status === "win" || b.status === "loss"
    );
    const wins = decided.filter((b) => b.status === "win").length;
    const profit = settled.reduce((s, b) => s + b.profit, 0);
    const totalStake = settled.reduce((s, b) => s + b.stake, 0);
    const roi = totalStake > 0 ? profit / totalStake : 0;
    const winRate = decided.length > 0 ? wins / decided.length : 0;
    const oddsSample = settled.filter((b) => b.status !== "void");
    const avgOdds =
      oddsSample.length > 0
        ? oddsSample.reduce((s, b) => s + b.odds, 0) / oddsSample.length
        : 0;
    const breakEven = avgOdds > 0 ? 1 / avgOdds : 0;
    const edge = decided.length > 0 && avgOdds > 0 ? winRate - breakEven : 0;

    // maior sequência de perdas
    const sorted = sortByDate(decided);
    let maxLoss = 0;
    let cur = 0;
    for (const b of sorted) {
      if (b.status === "loss") {
        cur++;
        if (cur > maxLoss) maxLoss = cur;
      } else cur = 0;
    }

    let sampleStatus: StrategyStat["sampleStatus"];
    if (profit < 0) sampleStatus = "Negativa até agora";
    else if (settled.length < minBetsForStrategy / 4) sampleStatus = "Insuficiente";
    else if (settled.length < minBetsForStrategy) sampleStatus = "Em observação";
    else if (maxLoss >= 6) sampleStatus = "Risco elevado";
    else sampleStatus = "Mais consistente";

    stats.push({
      strategy,
      count: settled.length,
      profit,
      roi,
      winRate,
      avgOdds,
      breakEven,
      edge,
      maxLossStreak: maxLoss,
      sampleStatus,
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}

// ===== Status de risco geral =====
export function computeRiskStatus(
  m: Metrics,
  rules: Rules,
  backupLate: boolean
): RiskStatus {
  if (backupLate)
    return { key: "backup_late", label: "Backup atrasado", tone: "warn" };
  if (m.currentDrawdown >= 0.2)
    return {
      key: "ruin_risk",
      label: "Risco de ruína aumentando",
      tone: "loss",
    };
  if (m.currentDrawdown >= 0.1)
    return { key: "high_drawdown", label: "Drawdown elevado", tone: "warn" };
  if (m.settledCount < 50)
    return {
      key: "small_sample",
      label: "Amostra ainda pequena",
      tone: "warn",
    };
  if (m.activeBankroll > 0 && rules.targetBankroll / m.activeBankroll > 10)
    return {
      key: "target_far",
      label: "Meta distante, não extrapole a sequência atual",
      tone: "neutral",
    };
  return { key: "healthy", label: "Controle saudável", tone: "gain" };
}
