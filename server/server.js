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
import planRoutes from "./routes/planRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import webhookRoutes from "./routes/webhooks.js";
import {
  apiLimiter,
  authLimiter,
  contactLimiter,
} from "./middleware/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Trust Proxy ────────────────────────────────────────────────────────────
// Required so req.hostname / req.ip / X-Forwarded-* headers are honored when
// the request comes through the Vite dev proxy or a reverse proxy in prod.
// Use a hop count (not `true`) — express-rate-limit rejects `true` because
// clients could spoof X-Forwarded-For and bypass rate limiting.
app.set("trust proxy", 1);

// ─── Global Middleware ──────────────────────────────────────────────────────

// Security headers
// Default Helmet CSP restricts img-src to 'self' + data:, which silently
// blocks broker-uploaded property/branding photos (hosted on Supabase
// Storage), broker-supplied external image URLs, and the Unsplash
// placeholder images used across the app. Widen img-src to allow any
// HTTPS origin plus data: (previews) and blob: (local file previews)
// while keeping every other Helmet default in place.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", "https:"],
        // default-src 'self' would block Supabase Auth/DB/Storage and Google Fonts CSS fetches
        "connect-src": [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
      },
    },
  }),
);

// CORS — allow the main host and ANY *.localhost / *.myflats.store /
// *.myflats.com / *.onrender.com subdomain on any port (covers 5173, 8080, 3000, etc).
const subdomainOriginPattern =
  /^https?:\/\/([a-z0-9-]+\.)*(localhost|myflats\.store|myflats\.com|onrender\.com)(:\d+)?$/i;
const explicitOrigins = [
  process.env.CLIENT_URL,
  "https://www.myflats.store",
  "https://myflats.store",
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
      // Reject without throwing — a thrown Error becomes a 500 and breaks
      // <script type="module" crossorigin> loads (browsers send Origin).
      return cb(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Subdomain"],
  }),
);

// Webhook routes — mounted before JSON body parser so Paymob HMAC verification
// can read the raw request body when implemented.
app.use("/api/webhooks", webhookRoutes);

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP parameter pollution protection
app.use(hpp());

// Subdomain detection — runs on EVERY request so controllers can access
// req.subdomain / req.tenantType. Mounted before routes intentionally.
app.use(subdomainMiddleware);

// Rate limiting — auth and POST /contact use dedicated limiters (see rateLimiter.js)
app.use("/api/auth", authLimiter);
app.use("/api/contact", (req, res, next) => {
  if (req.method === "POST") return contactLimiter(req, res, next);
  next();
});
app.use("/api", apiLimiter);

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/contact", contactRoutes);
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

  app.get("/{*wildcard}", (req, res) => {
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
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "production"}`);
});
