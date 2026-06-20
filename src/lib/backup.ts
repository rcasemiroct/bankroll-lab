import {
  db,
  getKV,
  setKV,
  defaultRules,
  defaultSettings,
  defaultSimulationSettings,
  defaultProjectionSettings,
} from "../db/db";
import { nowISO, uid } from "./format";
import {
  SCHEMA_VERSION,
  APP_VERSION,
  type BackupPayload,
  type Rules,
  type Settings,
  type SimulationSettings,
  type ProjectionSettings,
  type Snapshot,
} from "../types";

function simpleChecksum(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [bets, movements, rules, settings, simulation, projection] =
    await Promise.all([
      db.bets.toArray(),
      db.movements.toArray(),
      getKV<Rules>("rules", defaultRules),
      getKV<Settings>("settings", defaultSettings),
      getKV<SimulationSettings>("simulation", defaultSimulationSettings),
      getKV<ProjectionSettings>("projection", defaultProjectionSettings),
    ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    appVersion: APP_VERSION,
    bets,
    bankrollMovements: movements,
    rules,
    settings,
    simulationSettings: simulation,
    projectionSettings: projection,
    metadata: {
      betsCount: bets.length,
      movementsCount: movements.length,
    },
  };
}

function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `bankroll-lab-backup-${stamp}.json`;
}

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareOrDownload(
  content: string,
  filename: string,
  type: string
) {
  // Tenta Web Share API com arquivo (iOS Safari) — facilita salvar em Arquivos/iCloud.
  try {
    const file = new File([content], filename, { type });
    const navAny = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
    };
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    // cai para download
  }
  triggerDownload(content, filename, type);
}

export async function exportBackupJSON(): Promise<void> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  await shareOrDownload(json, backupFilename(), "application/json");

  const settings = await getKV<Settings>("settings", defaultSettings);
  await setKV<Settings>("settings", {
    ...settings,
    lastBackupExportedAt: nowISO(),
    betsSinceBackup: 0,
  });
}

// ===== CSV =====
function toCSV(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.join(";");
  const body = rows
    .map((r) => headers.map((h) => esc(r[h])).join(";"))
    .join("\n");
  return `${head}\n${body}`;
}

export async function exportBetsCSV(): Promise<void> {
  const bets = await db.bets.toArray();
  const headers = [
    "date",
    "sportsbook",
    "event",
    "market",
    "strategy",
    "odds",
    "stake",
    "status",
    "profit",
    "returnAmount",
    "notes",
  ];
  const csv = toCSV(bets as unknown as Record<string, unknown>[], headers);
  await shareOrDownload(csv, "bankroll-lab-apostas.csv", "text/csv");
}

export async function exportMovementsCSV(): Promise<void> {
  const movements = await db.movements.toArray();
  const headers = ["date", "type", "amount", "notes"];
  const csv = toCSV(movements as unknown as Record<string, unknown>[], headers);
  await shareOrDownload(csv, "bankroll-lab-movimentos.csv", "text/csv");
}

// ===== Importação =====
export interface ImportValidation {
  ok: boolean;
  error?: string;
  payload?: BackupPayload;
}

export function validateBackup(raw: string): ImportValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Arquivo não é um JSON válido." };
  }
  const p = parsed as Partial<BackupPayload>;
  if (typeof p !== "object" || p == null)
    return { ok: false, error: "Estrutura inválida." };
  if (typeof p.schemaVersion !== "number")
    return { ok: false, error: "schemaVersion ausente." };
  if (p.schemaVersion > SCHEMA_VERSION)
    return {
      ok: false,
      error: `Backup de versão mais nova (v${p.schemaVersion}) que o app (v${SCHEMA_VERSION}).`,
    };
  if (!Array.isArray(p.bets) || !Array.isArray(p.bankrollMovements))
    return { ok: false, error: "Dados de apostas/movimentos ausentes." };

  return { ok: true, payload: parsed as BackupPayload };
}

export async function applyBackup(payload: BackupPayload): Promise<void> {
  // snapshot de segurança antes de substituir
  await createSnapshot("before_import");

  await db.transaction(
    "rw",
    db.bets,
    db.movements,
    db.kv,
    async () => {
      await db.bets.clear();
      await db.movements.clear();
      await db.bets.bulkPut(payload.bets);
      await db.movements.bulkPut(payload.bankrollMovements);
      if (payload.rules) await setKV("rules", payload.rules);
      if (payload.settings) await setKV("settings", payload.settings);
      if (payload.simulationSettings)
        await setKV("simulation", payload.simulationSettings);
      if (payload.projectionSettings)
        await setKV("projection", payload.projectionSettings);
    }
  );
}

// ===== Snapshots =====
export async function createSnapshot(
  reason: Snapshot["reason"]
): Promise<void> {
  const data = await buildBackupPayload();
  const json = JSON.stringify(data);
  const snap: Snapshot = {
    id: uid(),
    createdAt: nowISO(),
    reason,
    data,
    size: json.length,
    checksum: simpleChecksum(json),
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
  await db.snapshots.put(snap);

  // mantém no máximo 30 snapshots
  const all = await db.snapshots.orderBy("createdAt").toArray();
  if (all.length > 30) {
    const remove = all.slice(0, all.length - 30).map((s) => s.id);
    await db.snapshots.bulkDelete(remove);
  }

  const settings = await getKV<Settings>("settings", defaultSettings);
  await setKV<Settings>("settings", { ...settings, lastSnapshotAt: nowISO() });
}

export async function restoreSnapshot(id: string): Promise<void> {
  const snap = await db.snapshots.get(id);
  if (!snap) return;
  await applyBackup(snap.data);
}

// Snapshot diário simples (se passou 1 dia desde o último).
export async function maybeDailySnapshot(): Promise<void> {
  const settings = await getKV<Settings>("settings", defaultSettings);
  const last = settings.lastSnapshotAt
    ? new Date(settings.lastSnapshotAt).getTime()
    : 0;
  if (Date.now() - last > 24 * 3600 * 1000) {
    await createSnapshot("daily");
  }
}
