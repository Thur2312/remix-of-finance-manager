import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
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
          "vendor-motion": ["framer-motion"],

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