import type { SimulationSettings } from "../types";

export interface MonteCarloResult {
  probabilityOfTarget: number;
  probabilityOfRuin: number;
  averageFinalBankroll: number;
  medianFinalBankroll: number;
  p10FinalBankroll: number;
  p90FinalBankroll: number;
  averageMaxDrawdown: number;
  averageBetsToTarget: number;
  finals: number[]; // banca final de cada simulação (para histograma)
  histogram: Array<{ bucket: string; count: number; mid: number }>;
  samplePaths: Array<Array<{ bet: number; bankroll: number }>>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarlo(s: SimulationSettings): MonteCarloResult {
  const sims = Math.max(1, Math.min(s.numberOfSimulations, 20000));
  const maxBets = Math.max(1, Math.min(s.numberOfBets, 5000));

  const finals: number[] = [];
  let targetHits = 0;
  let ruinHits = 0;
  let sumMaxDd = 0;
  let sumBetsToTarget = 0;
  let targetCountForBets = 0;

  const samplePaths: Array<Array<{ bet: number; bankroll: number }>> = [];
  const sampleCount = Math.min(8, sims);
  const sampleStride = Math.max(1, Math.floor(sims / sampleCount));

  for (let i = 0; i < sims; i++) {
    let bankroll = s.initialBankroll;
    let peak = bankroll;
    let maxDd = 0;
    let betsTaken = 0;
    const recordPath = i % sampleStride === 0 && samplePaths.length < sampleCount;
    const path: Array<{ bet: number; bankroll: number }> = recordPath
      ? [{ bet: 0, bankroll }]
      : [];

    for (let b = 0; b < maxBets; b++) {
      // calcula stake
      let stake =
        s.stakeMode === "fixed"
          ? s.fixedStake
          : (s.stakePercentage / 100) * bankroll;
      if (s.maxStake > 0) stake = Math.min(stake, s.maxStake);
      stake = Math.min(stake, bankroll);
      if (stake <= 0) break;

      betsTaken++;
      if (Math.random() < s.winProbability) {
        bankroll += stake * (s.averageOdds - 1);
      } else {
        bankroll -= stake;
      }

      if (bankroll > peak) peak = bankroll;
      if (peak > 0) {
        const dd = (peak - bankroll) / peak;
        if (dd > maxDd) maxDd = dd;
      }
      if (recordPath) path.push({ bet: b + 1, bankroll });

      if (bankroll >= s.targetBankroll) {
        targetHits++;
        sumBetsToTarget += betsTaken;
        targetCountForBets++;
        break;
      }
      if (bankroll <= s.stopBankroll) {
        ruinHits++;
        break;
      }
    }

    finals.push(bankroll);
    sumMaxDd += maxDd;
    if (recordPath) samplePaths.push(path);
  }

  const sorted = [...finals].sort((a, b) => a - b);
  const avg = finals.reduce((s2, v) => s2 + v, 0) / finals.length;

  // Histograma (20 buckets)
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const buckets = 20;
  const span = max - min || 1;
  const step = span / buckets;
  const counts = new Array(buckets).fill(0);
  for (const v of finals) {
    let idx = Math.floor((v - min) / step);
    if (idx >= buckets) idx = buckets - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const histogram = counts.map((count, i) => {
    const mid = min + step * (i + 0.5);
    return { bucket: Math.round(mid).toString(), count, mid };
  });

  return {
    probabilityOfTarget: targetHits / sims,
    probabilityOfRuin: ruinHits / sims,
    averageFinalBankroll: avg,
    medianFinalBankroll: percentile(sorted, 0.5),
    p10FinalBankroll: percentile(sorted, 0.1),
    p90FinalBankroll: percentile(sorted, 0.9),
    averageMaxDrawdown: sumMaxDd / sims,
    averageBetsToTarget:
      targetCountForBets > 0 ? sumBetsToTarget / targetCountForBets : 0,
    finals,
    histogram,
    samplePaths,
  };
}
