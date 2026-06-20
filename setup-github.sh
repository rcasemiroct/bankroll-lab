#!/usr/bin/env bash
# ------------------------------------------------------------
# Bankroll Lab — publicação no GitHub em um comando.
# Uso:
#   cd "…/Montecarlo Bet 2026/bankroll-lab"
#   bash setup-github.sh
# ------------------------------------------------------------
set -e

REPO="bankroll-lab"

echo "==> Limpando .git parcial (se existir)…"
rm -rf .git

echo "==> Inicializando repositório…"
git init -q
git add -A
git -c user.name="Rafael Teixeira" -c user.email="rcasemiroct@gmail.com" \
    commit -q -m "feat: Bankroll Lab MVP — PWA local-first de banca, risco e Monte Carlo"
git branch -M main

if command -v gh >/dev/null 2>&1; then
  echo "==> GitHub CLI encontrado. Verificando login…"
  if ! gh auth status >/dev/null 2>&1; then
    echo "   Você ainda não está logado. Rodando 'gh auth login'…"
    gh auth login
  fi

  echo "==> Criando o repositório no GitHub e fazendo push…"
  gh repo create "$REPO" --public --source=. --remote=origin --push

  echo "==> Ativando GitHub Pages via GitHub Actions…"
  USER=$(gh api user --jq .login)
  gh api -X POST "repos/$USER/$REPO/pages" \
    -f build_type=workflow >/dev/null 2>&1 \
    && echo "   Pages ativado." \
    || echo "   (Se falhar, ative em Settings → Pages → Source: GitHub Actions.)"

  echo ""
  echo "✅ Pronto. Em ~1-2 min o deploy do Actions termina e o app fica em:"
  echo "   https://$USER.github.io/$REPO/"
  echo "   Abra esse link no Safari do iPhone → Compartilhar → Adicionar à Tela de Início."
else
  echo ""
  echo "⚠️  GitHub CLI (gh) não está instalado."
  echo "   Opção A (recomendada): instale e rode este script de novo:"
  echo "       brew install gh"
  echo "       bash setup-github.sh"
  echo ""
  echo "   Opção B (sem gh): crie um repo público vazio chamado '$REPO' no GitHub e rode:"
  echo "       git remote add origin https://github.com/<SEU-USUARIO>/$REPO.git"
  echo "       git push -u origin main"
  echo "   Depois: Settings → Pages → Source: GitHub Actions."
fi
