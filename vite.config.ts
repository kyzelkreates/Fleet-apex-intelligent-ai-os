// Fleet Apex Admin — Vite Config (FLAT BUILD)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  root: ".",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["*.png", "*.ico", "*.svg"],
      manifest: false, // Using manifest.json at root
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-cache", expiration: { maxEntries: 100, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 200, maxAgeSeconds: 3600 } },
          },
        ],
        navigateFallback: "/index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      // All shared imports now resolve to this same flat directory
      "@shared": path.resolve(__dirname, "."),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: { main: path.resolve(__dirname, "index.html") },
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
