import Dexie, { type Table } from "dexie";
import type {
  Bet,
  BankrollMovement,
  Rules,
  Settings,
  SimulationSettings,
  ProjectionSettings,
  Snapshot,
} from "../types";

// Tabela kv guarda registros únicos de configuração (rules/settings/etc).
interface KV {
  key: string;
  value: unknown;
}

export class BankrollDB extends Dexie {
  bets!: Table<Bet, string>;
  movements!: Table<BankrollMovement, string>;
  snapshots!: Table<Snapshot, string>;
  kv!: Table<KV, string>;

  constructor() {
    super("bankroll-lab");
    this.version(1).stores({
      bets: "id, date, status, strategy, sportsbook",
      movements: "id, date, type",
      snapshots: "id, createdAt, reason",
      kv: "key",
    });
  }
}

export const db = new BankrollDB();

// ===== Defaults =====

export const defaultRules: Rules = {
  maxStakePct: 2,
  strongStakePct: 5,
  dailyStopPct: 5,
  weeklyStopPct: 15,
  partialWithdrawalTrigger: "double",
  partialWithdrawalPct: 50,
  targetBankroll: 5000,
  minBetsForStrategy: 100,
  pauseAfterLosses: 3,
  pauseAfterStop: true,
};

export const defaultSettings: Settings = {
  theme: "dark",
  currency: "BRL",
  startingDate: new Date().toISOString().slice(0, 10),
  lastBackupExportedAt: null,
  lastSnapshotAt: null,
  betsSinceBackup: 0,
  seeded: false,
};

export const defaultSimulationSettings: SimulationSettings = {
  initialBankroll: 140,
  targetBankroll: 5000,
  stopBankroll: 50,
  averageOdds: 1.9,
  winProbability: 0.55,
  stakeMode: "percentage",
  fixedStake: 5,
  stakePercentage: 2,
  maxStake: 200,
  numberOfBets: 200,
  numberOfSimulations: 2000,
};

export const defaultProjectionSettings: ProjectionSettings = {
  initialBankroll: 140,
  targetBankroll: 5000,
  expectedReturnPerCycle: 3,
  cyclesPerWeek: 5,
  startDate: new Date().toISOString().slice(0, 10),
};

// ===== KV helpers =====

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setKV<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}

// Garante que os registros de configuração existam.
export async function ensureInitialized(): Promise<void> {
  await db.transaction("rw", db.kv, async () => {
    if (!(await db.kv.get("rules")))
      await db.kv.put({ key: "rules", value: defaultRules });
    if (!(await db.kv.get("settings")))
      await db.kv.put({ key: "settings", value: defaultSettings });
    if (!(await db.kv.get("simulation")))
      await db.kv.put({ key: "simulation", value: defaultSimulationSettings });
    if (!(await db.kv.get("projection")))
      await db.kv.put({ key: "projection", value: defaultProjectionSettings });
  });
}
