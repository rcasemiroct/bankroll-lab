import { db, getKV, setKV, defaultSettings } from "./db";
import { computeBetProfit } from "../lib/calculations";
import { uid, nowISO } from "../lib/format";
import type { Bet, BankrollMovement, Settings, BetStatus } from "../types";

// Seed opcional (exemplo). Pode ser apagado pelo usuário.
export async function loadSeed(): Promise<void> {
  const now = nowISO();

  const movements: BankrollMovement[] = [
    {
      id: uid(),
      date: "2026-05-20",
      type: "deposit",
      amount: 100,
      notes: "Depósito inicial (exemplo)",
      createdAt: now,
    },
    {
      id: uid(),
      date: "2026-06-05",
      type: "withdrawal",
      amount: 110,
      notes: "Retirada (exemplo)",
      createdAt: now,
    },
  ];

  const raw: Array<Omit<Bet, "profit" | "returnAmount" | "createdAt" | "updatedAt">> = [
    { id: uid(), date: "2026-05-21", sportsbook: "Casa A", event: "Time A x Time B", market: "ML", strategy: "Value odds", odds: 1.95, stake: 4, status: "win" },
    { id: uid(), date: "2026-05-22", sportsbook: "Casa B", event: "Time C x Time D", market: "Over 2.5", strategy: "Over/Under", odds: 1.85, stake: 4, status: "loss" },
    { id: uid(), date: "2026-05-24", sportsbook: "Casa A", event: "Time E x Time F", market: "ML", strategy: "Value odds", odds: 2.1, stake: 5, status: "win" },
    { id: uid(), date: "2026-05-26", sportsbook: "Casa A", event: "Time G x Time H", market: "Handicap", strategy: "Handicap", odds: 1.8, stake: 5, status: "win" },
    { id: uid(), date: "2026-05-28", sportsbook: "Casa B", event: "Time I x Time J", market: "ML", strategy: "Value odds", odds: 1.7, stake: 5, status: "loss" },
    { id: uid(), date: "2026-06-01", sportsbook: "Casa C", event: "Time K x Time L", market: "Over 2.5", strategy: "Over/Under", odds: 2.0, stake: 6, status: "win" },
    { id: uid(), date: "2026-06-03", sportsbook: "Casa A", event: "Time M x Time N", market: "ML", strategy: "Value odds", odds: 1.9, stake: 6, status: "void" },
    { id: uid(), date: "2026-06-07", sportsbook: "Casa B", event: "Time O x Time P", market: "Handicap", strategy: "Handicap", odds: 1.95, stake: 6, status: "win" },
    { id: uid(), date: "2026-06-10", sportsbook: "Casa C", event: "Time Q x Time R", market: "Over 2.5", strategy: "Over/Under", odds: 1.75, stake: 7, status: "loss" },
    { id: uid(), date: "2026-06-14", sportsbook: "Casa A", event: "Time S x Time T", market: "ML", strategy: "Value odds", odds: 2.2, stake: 7, status: "win" },
    { id: uid(), date: "2026-06-18", sportsbook: "Casa B", event: "Time U x Time V", market: "ML", strategy: "Value odds", odds: 1.88, stake: 7, status: "pending" },
  ];

  const bets: Bet[] = raw.map((b) => {
    const { profit, returnAmount } = computeBetProfit(
      b.status as BetStatus,
      b.stake,
      b.odds
    );
    return { ...b, profit, returnAmount, createdAt: now, updatedAt: now };
  });

  await db.transaction("rw", db.bets, db.movements, db.kv, async () => {
    await db.bets.bulkPut(bets);
    await db.movements.bulkPut(movements);
    const settings = await getKV<Settings>("settings", defaultSettings);
    await setKV<Settings>("settings", { ...settings, seeded: true });
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.bets, db.movements, db.snapshots, async () => {
    await db.bets.clear();
    await db.movements.clear();
    await db.snapshots.clear();
  });
}
