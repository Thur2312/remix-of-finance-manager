import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // injectManifest (em vez de generateSW) porque precisamos de código
      // próprio no service worker pra lidar com push notifications de venda
      // (self.addEventListener('push'/'notificationclick') em src/sw.ts) —
      // o generateSW não permite injetar lógica arbitrária.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        // Mesmo escopo de antes: só o app shell estático entra no precache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Seller Finance — Gestão Financeira para Vendedores de Marketplace",
        short_name: "Seller Finance",
        description:
          "Plataforma de gestão financeira para vendedores da Shopee e TikTok Shop. Sincronize pedidos, calcule lucro real, controle fluxo de caixa e gere relatórios automáticos.",
        lang: "pt-BR",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        theme_color: "#2c8ffa",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ── Otimização de bundle ──────────────────────────────────────────────────
  build: {
    rollupOptions: {
      output: {
        // Divide o bundle em chunks menores e mais cacheáveis
        manualChunks: {
          // Bibliotecas do React — mudam raramente, ficam em cache por mais tempo
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // Supabase — separado porque é grande e muda pouco
          "vendor-supabase": ["@supabase/supabase-js"],

          // Tanstack Query
          "vendor-query": ["@tanstack/react-query"],

          // Componentes UI Radix — bundle grande, mas raramente muda
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],

          // Gráficos — carregados só quando necessário via lazy
          "vendor-charts": ["recharts"],

          // Animações
          "vendor-motion": ["framer-motion", "gsap"],

          // Formulários
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],

          // Utilitários de data
          "vendor-date": ["date-fns", "react-day-picker"],
        },
      },
    },

    // Avisa quando algum chunk ficar acima de 500kb
    chunkSizeWarningLimit: 500,
  },

}));