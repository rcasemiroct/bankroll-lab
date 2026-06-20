import { useState, useEffect, useRef, useMemo } from "react";
import {
  useRules,
  useBets,
  useMovements,
  useSettings,
  useSnapshots,
  saveRules,
} from "../store/data";
import { computeStrategyStats } from "../lib/calculations";
import {
  exportBackupJSON,
  exportBetsCSV,
  exportMovementsCSV,
  validateBackup,
  applyBackup,
  restoreSnapshot,
  createSnapshot,
} from "../lib/backup";
import { isBackupLate } from "../lib/alerts";
import { loadSeed, clearAllData } from "../db/seed";
import { deleteMovement } from "../store/data";
import {
  formatBRL,
  formatPct,
  formatNumber,
  formatDateBR,
} from "../lib/format";
import {
  Card,
  Field,
  SectionTitle,
  Badge,
  Sheet,
} from "../components/ui";
import type { Rules as RulesType, BackupPayload, BankrollMovement } from "../types";

const MOV_LABEL: Record<BankrollMovement["type"], string> = {
  deposit: "Depósito",
  withdrawal: "Retirada",
  bonus: "Bônus",
  adjustment: "Ajuste",
};

const SAMPLE_TONE: Record<string, "neutral" | "gain" | "loss" | "warn"> = {
  Insuficiente: "neutral",
  "Em observação": "warn",
  "Mais consistente": "gain",
  "Risco elevado": "loss",
  "Negativa até agora": "loss",
};

export default function Rules() {
  const stored = useRules();
  const bets = useBets();
  const movements = useMovements();
  const settings = useSettings();
  const snapshots = useSnapshots();

  const [r, setR] = useState<RulesType | null>(null);
  const [importPreview, setImportPreview] = useState<BackupPayload | null>(null);
  const [importError, setImportError] = useState("");
  const [snapOpen, setSnapOpen] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stored && !r) setR(stored);
  }, [stored, r]);

  const strategyStats = useMemo(
    () => (bets && r ? computeStrategyStats(bets, r.minBetsForStrategy) : []),
    [bets, r]
  );

  if (!r || !settings) return <p className="text-slate-400 text-sm">Carregando…</p>;

  const update = (patch: Partial<RulesType>) => {
    const next = { ...r, ...patch };
    setR(next);
    saveRules(next);
  };
  const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const backupLate = isBackupLate(settings);
  const backupStatus = !settings.lastBackupExportedAt
    ? { label: "Nenhum backup exportado", tone: "loss" as const }
    : backupLate
      ? { label: "Backup atrasado", tone: "warn" as const }
      : { label: "Backup em dia", tone: "gain" as const };

  async function onExport() {
    await exportBackupJSON();
    flash("Backup exportado.");
  }
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const v = validateBackup(text);
    if (!v.ok || !v.payload) {
      setImportError(v.error ?? "Arquivo inválido.");
      return;
    }
    setImportPreview(v.payload);
    e.target.value = "";
  }
  async function confirmImport() {
    if (!importPreview) return;
    await applyBackup(importPreview);
    setImportPreview(null);
    flash("Dados importados. Um snapshot de segurança foi criado.");
  }

  return (
    <div className="space-y-5">
      {/* ===== Regras ===== */}
      <div>
        <SectionTitle>Regras pessoais</SectionTitle>
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stake máx (% banca)">
              <input className="input" type="number" inputMode="decimal" value={r.maxStakePct} onChange={(e) => update({ maxStakePct: num(e.target.value) })} />
            </Field>
            <Field label="Alerta forte (%)">
              <input className="input" type="number" inputMode="decimal" value={r.strongStakePct} onChange={(e) => update({ strongStakePct: num(e.target.value) })} />
            </Field>
            <Field label="Stop diário (%)">
              <input className="input" type="number" inputMode="decimal" value={r.dailyStopPct} onChange={(e) => update({ dailyStopPct: num(e.target.value) })} />
            </Field>
            <Field label="Stop semanal (%)">
              <input className="input" type="number" inputMode="decimal" value={r.weeklyStopPct} onChange={(e) => update({ weeklyStopPct: num(e.target.value) })} />
            </Field>
            <Field label="Meta final (R$)">
              <input className="input" type="number" inputMode="decimal" value={r.targetBankroll} onChange={(e) => update({ targetBankroll: num(e.target.value) })} />
            </Field>
            <Field label="Retirada na meta (%)">
              <input className="input" type="number" inputMode="decimal" value={r.partialWithdrawalPct} onChange={(e) => update({ partialWithdrawalPct: num(e.target.value) })} />
            </Field>
            <Field label="Pausa após X perdas">
              <input className="input" type="number" inputMode="numeric" value={r.pauseAfterLosses} onChange={(e) => update({ pauseAfterLosses: num(e.target.value) })} />
            </Field>
            <Field label="Mín. apostas p/ validar">
              <input className="input" type="number" inputMode="numeric" value={r.minBetsForStrategy} onChange={(e) => update({ minBetsForStrategy: num(e.target.value) })} />
            </Field>
          </div>
          <label className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-600 dark:text-slate-300">Pausa obrigatória após bater stop</span>
            <input type="checkbox" className="h-5 w-5 accent-slate-900 dark:accent-white" checked={r.pauseAfterStop} onChange={(e) => update({ pauseAfterStop: e.target.checked })} />
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Regra fixa: nunca aumentar a stake para recuperar uma perda.
          </p>
        </div>
      </div>

      {/* ===== Análise por estratégia ===== */}
      <div>
        <SectionTitle>Análise por estratégia</SectionTitle>
        {strategyStats.length === 0 ? (
          <Card><p className="text-sm text-slate-400">Nenhuma aposta registrada ainda.</p></Card>
        ) : (
          <div className="space-y-2">
            {strategyStats.map((st) => (
              <div key={st.strategy} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{st.strategy}</span>
                  <Badge tone={SAMPLE_TONE[st.sampleStatus]}>{st.sampleStatus}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <Mini label="Apostas" value={String(st.count)} />
                  <Mini label="Resultado" value={formatBRL(st.profit)} tone={st.profit >= 0 ? "gain" : "loss"} />
                  <Mini label="ROI" value={formatPct(st.roi)} tone={st.roi >= 0 ? "gain" : "loss"} />
                  <Mini label="Win rate" value={formatPct(st.winRate)} />
                  <Mini label="Odd média" value={st.avgOdds ? formatNumber(st.avgOdds) : "—"} />
                  <Mini label="Edge" value={st.count >= 10 ? formatPct(st.edge) : "—"} tone={st.edge >= 0 ? "gain" : "loss"} />
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Nenhuma estratégia é marcada como “garantida” ou “vencedora”. Amostra pequena não valida método.
            </p>
          </div>
        )}
      </div>

      {/* ===== Backup ===== */}
      <div>
        <SectionTitle>Backup e recuperação</SectionTitle>
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge tone={backupStatus.tone}>{backupStatus.label}</Badge>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
            <div>Último backup exportado: {settings.lastBackupExportedAt ? formatDateBR(settings.lastBackupExportedAt) : "—"}</div>
            <div>Último snapshot local: {settings.lastSnapshotAt ? formatDateBR(settings.lastSnapshotAt) : "—"}</div>
            <div>Snapshots locais: {snapshots?.length ?? 0}</div>
            <div>Apostas desde o último backup: {settings.betsSinceBackup}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary" onClick={onExport}>Exportar backup</button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Importar backup</button>
            <button className="btn-ghost" onClick={() => exportBetsCSV()}>CSV apostas</button>
            <button className="btn-ghost" onClick={() => exportMovementsCSV()}>CSV movimentos</button>
            <button className="btn-ghost" onClick={() => setSnapOpen(true)}>Ver snapshots</button>
            <button className="btn-ghost" onClick={async () => { await createSnapshot("manual"); flash("Snapshot criado."); }}>Criar snapshot</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          {importError && <p className="text-sm text-loss font-medium">{importError}</p>}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Os dados ficam apenas no seu dispositivo. IndexedDB não substitui backup externo — exporte com frequência.
          </p>
        </div>
      </div>

      {/* ===== Movimentos ===== */}
      <div>
        <SectionTitle>Movimentos de banca</SectionTitle>
        <div className="space-y-2">
          {(movements ?? []).length === 0 && (
            <Card><p className="text-sm text-slate-400">Nenhum movimento registrado.</p></Card>
          )}
          {(movements ?? [])
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((mv) => (
              <div key={mv.id} className="card p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{MOV_LABEL[mv.type]}</div>
                  <div className="text-xs text-slate-400">{formatDateBR(mv.date)}{mv.notes ? ` · ${mv.notes}` : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold tabular-nums ${mv.type === "withdrawal" ? "text-loss" : "text-gain"}`}>
                    {mv.type === "withdrawal" ? "-" : "+"}{formatBRL(mv.amount)}
                  </span>
                  <button onClick={() => deleteMovement(mv.id)} className="text-slate-300 hover:text-loss text-lg leading-none" aria-label="Excluir">×</button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ===== Dados ===== */}
      <div>
        <SectionTitle>Dados</SectionTitle>
        <div className="card p-4 space-y-2">
          {!settings.seeded && (
            <button className="btn-ghost w-full" onClick={async () => { await loadSeed(); flash("Dados de exemplo carregados."); }}>
              Carregar dados de exemplo
            </button>
          )}
          <button
            className="btn-ghost w-full text-loss"
            onClick={async () => {
              await createSnapshot("before_reset");
              await clearAllData();
              flash("Dados apagados. Snapshot de segurança criado.");
            }}
          >
            Apagar todas as apostas e movimentos
          </button>
        </div>
      </div>

      {/* Privacidade */}
      <Card>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Sem servidor · sem login · sem analytics · sem trackers · sem integração com casas de aposta. Bankroll Lab é um sistema pessoal de controle e disciplina.
        </p>
      </Card>

      {/* preview de importação */}
      <Sheet open={!!importPreview} onClose={() => setImportPreview(null)} title="Confirmar importação">
        {importPreview && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Isto vai <strong>substituir todos os dados atuais</strong>. Um snapshot de segurança será criado antes.
            </p>
            <div className="card p-3 text-sm space-y-1">
              <div>Versão do schema: {importPreview.schemaVersion}</div>
              <div>Exportado em: {formatDateBR(importPreview.exportedAt)}</div>
              <div>Apostas: {importPreview.metadata?.betsCount ?? importPreview.bets.length}</div>
              <div>Movimentos: {importPreview.metadata?.movementsCount ?? importPreview.bankrollMovements.length}</div>
            </div>
            <button className="btn-primary w-full" onClick={confirmImport}>Substituir dados</button>
          </div>
        )}
      </Sheet>

      {/* snapshots */}
      <Sheet open={snapOpen} onClose={() => setSnapOpen(false)} title="Snapshots locais">
        <div className="space-y-2">
          {(snapshots ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Nenhum snapshot ainda.</p>
          )}
          {(snapshots ?? []).map((s) => (
            <div key={s.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{formatDateBR(s.createdAt)}</div>
                <div className="text-xs text-slate-400">{s.reason} · {s.data.bets.length} apostas</div>
              </div>
              <button
                className="btn-ghost text-sm px-3 py-2"
                onClick={async () => { await restoreSnapshot(s.id); setSnapOpen(false); flash("Snapshot restaurado."); }}
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      </Sheet>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4">
          <div className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 text-sm font-medium shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "gain" | "loss";
}) {
  const c = tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-slate-700 dark:text-slate-200";
  return (
    <div>
      <div className="text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`font-semibold ${c}`}>{value}</div>
    </div>
  );
}
