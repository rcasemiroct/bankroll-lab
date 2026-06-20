import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANTE: o repositório se chama "bankroll-lab".
// Se você renomear o repo no GitHub, troque o `base` abaixo para "/<novo-nome>/".
const REPO_BASE = "/bankroll-lab/";

export default defineConfig({
  base: REPO_BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-180.png", "icons/favicon.svg"],
      manifest: {
        name: "Bankroll Lab",
        short_name: "Bankroll",
        description:
          "Controle de banca, gestão de risco e simulação. Sistema pessoal, local-first.",
        theme_color: "#0f172a",
        background_color: "#0b1120",
        display: "standalone",
        orientation: "portrait",
        scope: REPO_BASE,
        start_url: REPO_BASE,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: `${REPO_BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
