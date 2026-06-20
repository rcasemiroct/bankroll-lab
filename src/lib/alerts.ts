import type {
  Bet,
  BankrollMovement,
  Rules,
  Settings,
  InternalAlert,
} from "../types";
import type { Metrics } from "./calculations";
import { uid } from "./format";

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function buildAlerts(
  m: Metrics,
  rules: Rules,
  bets: Bet[],
  _movements: BankrollMovement[],
  settings: Settings
): InternalAlert[] {
  const out: InternalAlert[] = [];
  const push = (
    severity: InternalAlert["severity"],
    title: string,
    message: string
  ) => out.push({ id: uid(), severity, title, message });

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = daysAgoISO(7);
  const settled = bets.filter((b) => b.status !== "pending");

  const lossToday = settled
    .filter((b) => b.date === today)
    .reduce((s, b) => s + b.profit, 0);
  const lossWeek = settled
    .filter((b) => b.date >= weekAgo)
    .reduce((s, b) => s + b.profit, 0);

  // ===== Ganho =====
  if (m.depositsTotal > 0 && m.activeBankroll >= 2 * m.depositsTotal) {
    push(
      "gain",
      "Banca dobrou",
      "Sua banca dobrou em relação aos depósitos. Considere retirar parte do lucro."
    );
  }
  if (m.roiOnDeposits >= 0.2) {
    push(
      "gain",
      "Lucro acima de 20%",
      "Lucro líquido relevante sobre o capital depositado. Avalie uma retirada parcial."
    );
  }
  if (m.streakType === "win" && m.streakCount >= 5) {
    push(
      "gain",
      "Sequência positiva longa",
      `Sequência de ${m.streakCount} ganhos. Amostra pequena: não trate como método validado nem aumente a stake.`
    );
  }

  // ===== Perda =====
  if (m.currentDrawdown >= 0.2) {
    push(
      "loss",
      "Drawdown acima de 20%",
      "Sua banca caiu mais de 20% desde o pico. Pausa recomendada."
    );
  } else if (m.currentDrawdown >= 0.1) {
    push(
      "loss",
      "Drawdown acima de 10%",
      "Sua banca caiu mais de 10% desde o pico. Reduza exposição."
    );
  }
  if (m.activeBankroll > 0 && -lossToday > (rules.dailyStopPct / 100) * m.activeBankroll) {
    push(
      "loss",
      "Stop diário atingido",
      "Sua perda diária passou do limite definido. Pausa recomendada."
    );
  }
  if (m.activeBankroll > 0 && -lossWeek > (rules.weeklyStopPct / 100) * m.activeBankroll) {
    push(
      "loss",
      "Stop semanal atingido",
      "Sua perda semanal passou do limite definido."
    );
  }
  if (m.streakType === "loss" && m.streakCount >= rules.pauseAfterLosses) {
    push(
      "loss",
      `${m.streakCount} perdas consecutivas`,
      "Você atingiu o limite de perdas seguidas. Pausa recomendada. Nunca aumente a stake para recuperar."
    );
  }

  // ===== Disciplina =====
  if (m.settledCount > 0 && m.settledCount < rules.minBetsForStrategy) {
    push(
      "discipline",
      "Amostra ainda pequena",
      `Menos de ${rules.minBetsForStrategy} apostas registradas. Não trate o resultado como método validado.`
    );
  }

  // ===== Risco estatístico =====
  if (m.settledCount >= 10 && m.edge < 0) {
    push(
      "risk",
      "Edge observado negativo",
      "Seu acerto observado está abaixo do break-even das odds. Reavalie o método."
    );
  }
  if (m.settledCount < 50) {
    push(
      "risk",
      "Menos de 50 apostas",
      "Amostra insuficiente para qualquer conclusão estatística."
    );
  } else if (m.settledCount < 100) {
    push(
      "risk",
      "Menos de 100 apostas",
      "Amostra ainda baixa para validar edge. Continue registrando antes de concluir."
    );
  }
  // Resultado concentrado em poucas apostas
  if (m.realizedProfit > 0) {
    const profits = settled.map((b) => b.profit).sort((a, b) => b - a);
    const top3 = profits.slice(0, 3).reduce((s, v) => s + Math.max(0, v), 0);
    if (top3 > m.realizedProfit * 0.7 && m.settledCount >= 8) {
      push(
        "risk",
        "Lucro concentrado",
        "Boa parte do resultado positivo vem de poucas apostas. Cuidado ao extrapolar."
      );
    }
  }

  // ===== Backup =====
  const backupLate = isBackupLate(settings);
  if (!settings.lastBackupExportedAt) {
    push("discipline", "Sem backup", "Você ainda não exportou nenhum backup.");
  } else if (backupLate) {
    push(
      "discipline",
      "Backup atrasado",
      "Seu último backup exportado tem mais de 7 dias."
    );
  }
  if (settings.betsSinceBackup >= 20) {
    push(
      "discipline",
      "Muitas apostas sem backup",
      "Você registrou mais de 20 apostas desde o último backup."
    );
  }

  return out;
}

export function isBackupLate(settings: Settings): boolean {
  if (!settings.lastBackupExportedAt) return true;
  const last = new Date(settings.lastBackupExportedAt).getTime();
  return Date.now() - last > 7 * 24 * 3600 * 1000;
}
