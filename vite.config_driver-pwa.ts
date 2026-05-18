// Fleet Apex Driver PWA — Vite Config (FLAT BUILD)
// Use this as vite.config.ts when building the driver app entry point
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
      includeAssets: ["*.png", "*.ico"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "map-tiles", expiration: { maxEntries: 1000, maxAgeSeconds: 2592000 } },
          },
          {
            urlPattern: /\/api\/routes\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "routes-cache", expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
          },
        ],
        navigateFallback: "/index.html",
      },
    }),
  ],
  resolve: {
    alias: { "@shared": path.resolve(__dirname, ".") },
  },
  server: {
    port: 3001,
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
  build: {
    outDir: "dist-driver",
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
