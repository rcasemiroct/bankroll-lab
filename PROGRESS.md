# Histórico de desenvolvimento — Bankroll Lab

Documento de continuidade. Se o trabalho parar e recomeçar em outro ciclo, leia daqui.

## Decisões de arquitetura (e desvios do brief original)

- **shadcn/ui removido.** Setup via CLI/registry adiciona atrito num PWA estático. Usamos Tailwind + componentes próprios.
- **Sem fase de mock descartável.** Fomos direto para Dexie real + cálculos reais (mais econômico que mock → reescrita).
- **Navegação:** estado próprio (aba ativa) em vez de react-router. Menos dependência, melhor no Pages.
- **`base` do Vite = `/bankroll-lab/`.** Trocar se o repo mudar de nome.
- **Snapshots locais completos (checksum + 6 gatilhos) adiados.** MVP entrega export/import JSON + CSV e snapshot automático simples. Sistema completo de snapshots = fase futura.

## Estado das fases

- [x] **Fase 0 — Scaffold + config.** package.json, vite.config (PWA + base), tsconfig, tailwind, index.html (meta Apple), manifest, ícones PNG (180/192/512/maskable), .gitignore, workflow `deploy.yml`, README, este histórico.
- [x] **Fase 1 — Núcleo.** types, Dexie + seed, lib/calculations + format, store (useLiveQuery), App shell, BottomNav, tema claro/escuro, componentes base.
- [x] **Fase 2 — Telas.** Hoje (dashboard), Apostas (CRUD + filtros), Movimentos de banca (CRUD), Regras (config + análise por estratégia).
- [x] **Fase 3 — Projeção + Monte Carlo + gráficos.** lib/projections, lib/monteCarlo, telas Projection e Simulation, gráficos Recharts.
- [x] **Fase 4 — Alertas + Backup.** lib/alerts, card de alertas, lib/backup (JSON/CSV import-export + snapshots com checksum), snapshot automático (diário, antes de importar/resetar, em retirada), validação na importação com preview.
- [x] **Fase 5 — Build + git.** `npm install` + `npm run build` rodando limpo. Commit inicial criado no sandbox, mas o `.git` ficou inutilizável por restrição do mount (locks não removíveis). **Ação para o Rafa: apagar `.git` e rodar `git init` na sua máquina** (ver README). O código está 100% pronto.

> Observação sobre o `.git`: o sandbox de build não consegue apagar arquivos `.lock` que ele mesmo cria neste mount. Por isso o `.git` foi deixado pela metade. No seu Mac você é dono dos arquivos e consegue apagar normalmente. Faça `rm -rf .git` antes do `git init`.

## Próximas evoluções (pós-MVP)

- Sistema de snapshots completo (tabela `snapshots`, checksum, gatilhos: daily / before_import / before_reset / after_10_bets / withdrawal_milestone / manual), com tela "Ver/Restaurar snapshots".
- Web Worker para Monte Carlo (rodar muitas simulações sem travar a UI).
- Web Share API no export para salvar direto em Arquivos/iCloud.
- Mais gráficos por estratégia/casa.

## Critérios de aceite do MVP (checklist)

- [ ] Funciona bem no iPhone (mobile-first, safe area, bottom nav)
- [ ] Publicável no GitHub Pages + instalável como PWA
- [ ] Registrar apostas / depósitos / retiradas
- [ ] Calcular banca ativa e lucro líquido real
- [ ] Dashboard + gráficos básicos
- [ ] Projeção até a meta
- [ ] Monte Carlo básico
- [ ] Alertas internos
- [ ] Configurar regras pessoais
- [ ] Export/import JSON + export CSV
- [ ] Roda offline depois de carregado
- [ ] Sem login, sem servidor
