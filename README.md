# Bankroll Lab

Sistema pessoal de **controle de banca, gestão de risco e simulação estatística**. Não é um app de apostas: ele não recomenda entradas, não sugere apostas, não se conecta a casas e não usa linguagem de cassino. O objetivo é disciplina, leitura honesta de risco e preservação de banca.

- **Local-first**: todos os dados ficam no seu dispositivo (IndexedDB via Dexie). Nenhum dado é enviado para servidor.
- **Sem login, sem backend, sem analytics, sem trackers.**
- **PWA instalável** no iPhone, iPad e desktop.
- **Backup manual** por exportação/importação JSON e exportação CSV.

> IndexedDB **não** substitui backup externo. Exporte um backup com frequência.

---

## Stack

React + Vite + TypeScript + Tailwind CSS + Recharts + Dexie (IndexedDB) + vite-plugin-pwa.

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite serve em `http://localhost:5173/bankroll-lab/` (o caminho `/bankroll-lab/` vem do `base` configurado para o GitHub Pages).

## Build e preview

```bash
npm run build
npm run preview
```

---

## Publicar no GitHub Pages

### 1. Criar o repositório no GitHub
Crie um repositório **público** chamado `bankroll-lab` (sem README, sem .gitignore — já temos).

> Se usar outro nome, ajuste `REPO_BASE` em `vite.config.ts` para `"/<novo-nome>/"`.

### 2. Conectar o remoto, commit e push
Na raiz do projeto:

```bash
rm -rf .git                    # remove um .git parcial deixado pelo ambiente de build
git init
git add .
git commit -m "feat: Bankroll Lab MVP"
git branch -M main
git remote add origin https://github.com/<SEU-USUARIO>/bankroll-lab.git
git push -u origin main
```

### 3. Ativar GitHub Pages (via Actions)
No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

O workflow em `.github/workflows/deploy.yml` faz `npm ci`, `npm run build` e publica a pasta `dist`. A cada `push` na branch `main` o deploy roda sozinho.

### 4. URL de produção
```
https://<SEU-USUARIO>.github.io/bankroll-lab/
```

---

## Instalar no iPhone

1. Abra a URL de produção no **Safari** do iPhone.
2. Toque em **Compartilhar**.
3. Toque em **Adicionar à Tela de Início**.
4. Abra o app pelo ícone instalado (roda em tela cheia, offline depois de carregado).

---

## Privacidade

Sem servidor, sem analytics, sem trackers, sem integração com casas de aposta, sem backup automático em nuvem. Os dados ficam locais no dispositivo. Exporte backups manualmente.

## Histórico de desenvolvimento

Veja `PROGRESS.md` para o estado das fases e o que falta — útil para retomar o trabalho em outro ciclo.
