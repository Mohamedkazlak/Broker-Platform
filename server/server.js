import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import brokerRoutes from './routes/brokerRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS — allow requests from the client (support subdomains like xyz.localhost:8080)
const subdomainOriginPattern = /^http:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/;
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:8080',
  'http://[::1]:5173',
  'http://[::1]:8080',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (subdomainOriginPattern.test(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP parameter pollution protection
app.use(hpp());

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth',       authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/brokers',    brokerRoutes);
app.use('/api/contact',    contactRoutes);
app.use('/api/analytics',  analyticsRoutes);

// Server start time — client uses this to detect restarts and force re-login
const serverStartedAt = Date.now();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), serverStartedAt });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

// 404 handler for unknown API routes
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ status: 'error', error: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
