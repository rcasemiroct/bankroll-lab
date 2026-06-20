import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  getKV,
  setKV,
  defaultRules,
  defaultSettings,
  defaultSimulationSettings,
  defaultProjectionSettings,
} from "../db/db";
import { computeBetProfit } from "../lib/calculations";
import { uid, nowISO } from "../lib/format";
import type {
  Bet,
  BankrollMovement,
  Rules,
  Settings,
  SimulationSettings,
  ProjectionSettings,
  Snapshot,
} from "../types";

// ===== Hooks de leitura (reativos) =====
export function useBets(): Bet[] | undefined {
  return useLiveQuery(() => db.bets.toArray(), []);
}
export function useMovements(): BankrollMovement[] | undefined {
  return useLiveQuery(() => db.movements.toArray(), []);
}
export function useSnapshots(): Snapshot[] | undefined {
  return useLiveQuery(
    () => db.snapshots.orderBy("createdAt").reverse().toArray(),
    []
  );
}
export function useRules(): Rules | undefined {
  return useLiveQuery(() => getKV<Rules>("rules", defaultRules), []);
}
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getKV<Settings>("settings", defaultSettings), []);
}
export function useSimulationSettings(): SimulationSettings | undefined {
  return useLiveQuery(
    () => getKV<SimulationSettings>("simulation", defaultSimulationSettings),
    []
  );
}
export function useProjectionSettings(): ProjectionSettings | undefined {
  return useLiveQuery(
    () => getKV<ProjectionSettings>("projection", defaultProjectionSettings),
    []
  );
}

// ===== Mutators =====
export type BetInput = Omit<
  Bet,
  "id" | "profit" | "returnAmount" | "createdAt" | "updatedAt"
>;

async function bumpBetsSinceBackup(delta: number) {
  const s = await getKV<Settings>("settings", defaultSettings);
  await setKV<Settings>("settings", {
    ...s,
    betsSinceBackup: Math.max(0, s.betsSinceBackup + delta),
  });
}

export async function addBet(input: BetInput): Promise<void> {
  const now = nowISO();
  const { profit, returnAmount } = computeBetProfit(
    input.status,
    input.stake,
    input.odds
  );
  const bet: Bet = {
    ...input,
    id: uid(),
    profit,
    returnAmount,
    createdAt: now,
    updatedAt: now,
  };
  await db.bets.put(bet);
  await bumpBetsSinceBackup(1);
}

export async function updateBet(id: string, input: BetInput): Promise<void> {
  const existing = await db.bets.get(id);
  if (!existing) return;
  const { profit, returnAmount } = computeBetProfit(
    input.status,
    input.stake,
    input.odds
  );
  await db.bets.put({
    ...existing,
    ...input,
    profit,
    returnAmount,
    updatedAt: nowISO(),
  });
}

export async function deleteBet(id: string): Promise<void> {
  await db.bets.delete(id);
}

export type MovementInput = Omit<BankrollMovement, "id" | "createdAt">;

export async function addMovement(input: MovementInput): Promise<void> {
  const mov: BankrollMovement = {
    ...input,
    id: uid(),
    createdAt: nowISO(),
  };
  await db.movements.put(mov);
}

export async function deleteMovement(id: string): Promise<void> {
  await db.movements.delete(id);
}

export async function saveRules(rules: Rules): Promise<void> {
  await setKV<Rules>("rules", rules);
}
export async function saveSettings(settings: Settings): Promise<void> {
  await setKV<Settings>("settings", settings);
}
export async function saveSimulationSettings(
  s: SimulationSettings
): Promise<void> {
  await setKV<SimulationSettings>("simulation", s);
}
export async function saveProjectionSettings(
  s: ProjectionSettings
): Promise<void> {
  await setKV<ProjectionSettings>("projection", s);
}
