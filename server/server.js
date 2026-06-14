import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import errorHandler from "./middleware/errorHandler.js";
import subdomainMiddleware from "./middleware/subdomain.middleware.js";
import authRoutes from "./routes/authRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import brokerRoutes from "./routes/brokerRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust Proxy ────────────────────────────────────────────────────────────
// Required so req.hostname / req.ip / X-Forwarded-* headers are honored when
// the request comes through the Vite dev proxy or any reverse proxy in prod.
app.set("trust proxy", true);

// ─── Global Middleware ──────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS — allow the main host and ANY *.localhost / *.myflat.com / *.lovable.app
// subdomain on any port (covers 5173, 8080, 3000, etc).
const subdomainOriginPattern =
  /^https?:\/\/([a-z0-9-]+\.)*(localhost|myflat\.com|lovable\.app)(:\d+)?$/i;
const explicitOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://[::1]:5173",
  "http://[::1]:8080",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server (no Origin header) → allow.
      if (!origin) return cb(null, true);
      if (explicitOrigins.includes(origin)) return cb(null, true);
      if (subdomainOriginPattern.test(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Subdomain"],
  }),
);

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP parameter pollution protection
app.use(hpp());

// Subdomain detection — runs on EVERY request so controllers can access
// req.subdomain / req.tenantType. Mounted before routes intentionally.
app.use(subdomainMiddleware);

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/translate", translateRoutes);

// Server start time — client uses this to detect restarts and force re-login
const serverStartedAt = Date.now();

// Health check endpoint — also echoes detected tenant for easy debugging.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    serverStartedAt,
    tenant: {
      hostname: req.hostnameRaw,
      subdomain: req.subdomain,
      tenantType: req.tenantType,
    },
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

// 404 handler for unknown API routes
app.use("/api/{*path}", (req, res) => {
  res
    .status(404)
    .json({ status: "error", error: `Route ${req.originalUrl} not found` });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
  });
}

// Global error handler (must be last)
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────

// Bind to 0.0.0.0 so foo.localhost / 127.0.0.1 / IPv6 loopback all reach us.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
});
