import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from the repo root (one level up) so VITE_* and PORT live in one place.
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  // Backend Express server URL — defaults to :5000 (current repo) but accepts
  // :3000 if the developer prefers that port. Tweak via VITE_API_PROXY_TARGET
  // or SERVER_PORT in the root .env file.
  const apiTarget =
    env.VITE_API_PROXY_TARGET ||
    `http://localhost:${env.SERVER_PORT || env.PORT || "5000"}`;

  // Vite dev server port — keep the existing 8080 default so we don't break
  // anyone's bookmarks, but allow easy override to 5173 via env.
  const clientPort = Number(env.CLIENT_PORT || env.VITE_PORT || 8080);

  return {
    envDir: path.resolve(__dirname, ".."),
    server: {
      // Bind to ALL interfaces so foo.localhost / 127.0.0.1 / IPv6 loopback
      // all reach the dev server. This is required for *.localhost subdomains.
      host: true,
      port: clientPort,
      strictPort: true,
      // Allow any *.localhost / *.myflat.com host to talk to the dev server.
      // Vite ≥4 blocks unknown hosts by default.
      allowedHosts: [".localhost", ".myflat.com"],
      proxy: {
        // Forward all /api/* calls to the Express backend, preserving the
        // original Host header so the subdomain middleware sees e.g.
        // "ahmed.localhost" instead of "localhost".
        "/api": {
          target: apiTarget,
          changeOrigin: false, // keep Host: ahmed.localhost intact
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              // Belt-and-braces: explicitly forward the original Host and add
              // an X-Tenant-Subdomain header derived from it, so the backend
              // can fall back on the header even if a future proxy mangles
              // the Host line.
              const incomingHost = req.headers.host || "";
              const hostname = incomingHost.split(":")[0];
              proxyReq.setHeader("X-Forwarded-Host", incomingHost);
              proxyReq.setHeader("Host", incomingHost);

              if (hostname && hostname !== "localhost") {
                const parts = hostname.split(".");
                if (
                  parts.length >= 2 &&
                  parts[parts.length - 1] === "localhost"
                ) {
                  proxyReq.setHeader("X-Tenant-Subdomain", parts[0]);
                }
              }
            });
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split large third-party libraries into separate, long-lived cache
          // chunks so the main app bundle stays small and vendor code isn't
          // re-downloaded on every app deploy. Each library is only fetched by
          // the routes that actually import it (e.g. charts on the insights page).
          manualChunks: (id) => {
            if (!id.includes("node_modules")) return undefined;
            if (
              /[\\/](react(?:-dom)?|react-router|@remix-run|scheduler|lucide-react)[\\/]/.test(
                id,
              )
            )
              return "react-vendor";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            if (id.includes("i18next")) return "i18n";
            if (id.includes("@radix-ui")) return "radix";
            return "vendor";
          },
        },
      },
    },
  };
});
