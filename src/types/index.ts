// ===== Domínio Bankroll Lab =====

export type BetStatus = "pending" | "win" | "loss" | "void";

export interface Bet {
  id: string;
  date: string; // ISO yyyy-mm-dd
  sportsbook: string;
  event: string;
  market: string;
  strategy: string;
  odds: number;
  stake: number;
  status: BetStatus;
  returnAmount: number; // retorno bruto (stake + lucro) quando win; 0 caso contrário
  profit: number; // lucro líquido da aposta
  notes?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type MovementType = "deposit" | "withdrawal" | "bonus" | "adjustment";

export interface BankrollMovement {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: MovementType;
  amount: number; // sempre positivo; o tipo define o sinal. "adjustment" pode ser negativo.
  notes?: string;
  createdAt: string;
}

export interface Rules {
  maxStakePct: number; // % da banca ativa
  strongStakePct: number; // alerta forte acima deste %
  dailyStopPct: number; // stop diário, % da banca
  weeklyStopPct: number; // stop semanal, % da banca
  partialWithdrawalTrigger: "double" | "target_partial"; // gatilho de retirada
  partialWithdrawalPct: number; // % a retirar ao atingir gatilho
  targetBankroll: number; // meta final em R$
  minBetsForStrategy: number; // amostra mínima para validar estratégia/edge
  pauseAfterLosses: number; // pausa após X perdas consecutivas
  pauseAfterStop: boolean; // pausa obrigatória após bater stop
}

export interface Settings {
  theme: "light" | "dark" | "system";
  currency: string; // "BRL"
  startingDate: string; // data inicial do plano (ISO)
  lastBackupExportedAt: string | null;
  lastSnapshotAt: string | null;
  betsSinceBackup: number;
  seeded: boolean;
}

export interface SimulationSettings {
  initialBankroll: number;
  targetBankroll: number;
  stopBankroll: number;
  averageOdds: number;
  winProbability: number; // 0..1
  stakeMode: "fixed" | "percentage";
  fixedStake: number;
  stakePercentage: number; // % da banca
  maxStake: number;
  numberOfBets: number;
  numberOfSimulations: number;
}

export interface ProjectionSettings {
  initialBankroll: number;
  targetBankroll: number;
  expectedReturnPerCycle: number; // % por ciclo
  cyclesPerWeek: number;
  startDate: string; // ISO
}

export type AlertSeverity = "gain" | "loss" | "discipline" | "risk";

export interface InternalAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  reason:
    | "daily"
    | "before_import"
    | "before_reset"
    | "after_10_bets"
    | "withdrawal_milestone"
    | "manual";
  data: BackupPayload;
  size: number;
  checksum: string;
  appVersion: string;
  schemaVersion: number;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  bets: Bet[];
  bankrollMovements: BankrollMovement[];
  rules: Rules;
  settings: Settings;
  simulationSettings: SimulationSettings;
  projectionSettings: ProjectionSettings;
  metadata: {
    betsCount: number;
    movementsCount: number;
  };
}

export const SCHEMA_VERSION = 1;
export const APP_VERSION = "0.1.0";
