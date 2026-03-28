import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/** GitHub Pages project site: set to /repo-name/ in CI (see .github/workflows). */
function viteBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim() || "/";
  if (raw === "/") return "/";
  return raw.startsWith("/") ? (raw.endsWith("/") ? raw : `${raw}/`) : `/${raw.endsWith("/") ? raw : `${raw}/`}`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const base = viteBase();
  return {
  base,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2,png,jpg,webp}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: "Былина — Славянская RPG",
        short_name: "Былина",
        description: "Пошаговая фэнтези-RPG в славянском сеттинге",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "fullscreen",
        orientation: "portrait",
        scope: base,
        start_url: base,
        icons: [
          { src: `${base}pwa-icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}pwa-icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}pwa-icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});