import type { ProjectionSettings } from "../types";

export type ScenarioKey = "conservative" | "base" | "aggressive";

export interface ProjectionPoint {
  cycle: number;
  date: string;
  conservative: number;
  base: number;
  aggressive: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  cyclesToTarget: Record<ScenarioKey, number | null>;
  dateToTarget: Record<ScenarioKey, string | null>;
  expectedBankrollToday: number; // onde a banca deveria estar hoje pelo cenário base
  cyclesElapsed: number;
}

const SCENARIO_FACTOR: Record<ScenarioKey, number> = {
  conservative: 0.5,
  base: 1,
  aggressive: 1.6,
};

function addDaysFromCycles(start: string, cycles: number, cyclesPerWeek: number) {
  const days = cyclesPerWeek > 0 ? (cycles / cyclesPerWeek) * 7 : 0;
  const d = new Date(`${start}T00:00:00`);
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function computeProjection(s: ProjectionSettings): ProjectionResult {
  const ratePerCycle = s.expectedReturnPerCycle / 100;
  const rates: Record<ScenarioKey, number> = {
    conservative: ratePerCycle * SCENARIO_FACTOR.conservative,
    base: ratePerCycle * SCENARIO_FACTOR.base,
    aggressive: ratePerCycle * SCENARIO_FACTOR.aggressive,
  };

  // nº de ciclos até a meta no cenário base (limite p/ eixo)
  const cyclesToTarget: Record<ScenarioKey, number | null> = {
    conservative: cyclesToReach(s.initialBankroll, s.targetBankroll, rates.conservative),
    base: cyclesToReach(s.initialBankroll, s.targetBankroll, rates.base),
    aggressive: cyclesToReach(s.initialBankroll, s.targetBankroll, rates.aggressive),
  };

  const horizon = Math.min(
    Math.max(
      cyclesToTarget.conservative ?? cyclesToTarget.base ?? 52,
      cyclesToTarget.base ?? 52
    ) + 2,
    300
  );

  const points: ProjectionPoint[] = [];
  for (let c = 0; c <= horizon; c++) {
    points.push({
      cycle: c,
      date: addDaysFromCycles(s.startDate, c, s.cyclesPerWeek),
      conservative: s.initialBankroll * Math.pow(1 + rates.conservative, c),
      base: s.initialBankroll * Math.pow(1 + rates.base, c),
      aggressive: s.initialBankroll * Math.pow(1 + rates.aggressive, c),
    });
  }

  const dateToTarget: Record<ScenarioKey, string | null> = {
    conservative:
      cyclesToTarget.conservative != null
        ? addDaysFromCycles(s.startDate, cyclesToTarget.conservative, s.cyclesPerWeek)
        : null,
    base:
      cyclesToTarget.base != null
        ? addDaysFromCycles(s.startDate, cyclesToTarget.base, s.cyclesPerWeek)
        : null,
    aggressive:
      cyclesToTarget.aggressive != null
        ? addDaysFromCycles(s.startDate, cyclesToTarget.aggressive, s.cyclesPerWeek)
        : null,
  };

  // Quantos ciclos já se passaram desde startDate.
  const now = new Date();
  const start = new Date(`${s.startDate}T00:00:00`);
  const weeks = (now.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000);
  // Cap nos ciclos da meta (cenário base): após atingir a meta no plano,
  // não faz sentido a "banca esperada hoje" continuar crescendo ao infinito.
  const elapsedRaw = Math.max(0, weeks * s.cyclesPerWeek);
  const cyclesElapsed =
    cyclesToTarget.base != null
      ? Math.min(elapsedRaw, cyclesToTarget.base)
      : elapsedRaw;
  const expectedBankrollToday = Math.min(
    s.targetBankroll,
    s.initialBankroll * Math.pow(1 + rates.base, cyclesElapsed)
  );

  return {
    points,
    cyclesToTarget,
    dateToTarget,
    expectedBankrollToday,
    cyclesElapsed,
  };
}

function cyclesToReach(initial: number, target: number, rate: number): number | null {
  if (initial <= 0 || target <= initial) return target <= initial ? 0 : null;
  if (rate <= 0) return null;
  return Math.ceil(Math.log(target / initial) / Math.log(1 + rate));
}
