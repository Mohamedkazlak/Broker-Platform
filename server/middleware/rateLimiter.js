import rateLimit from "express-rate-limit";

// General API limiter — applied to all /api/* routes (auth and POST /contact skipped)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.originalUrl.split("?")[0];
    if (path.startsWith("/api/auth")) return true;
    if (req.method === "POST" && path === "/api/contact") return true;
    return false;
  },
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later.",
      status: 429,
    },
  },
});

// Strict limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts, please try again later.",
      status: 429,
    },
  },
});

// Contact form limiter
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many messages sent. Please wait before sending another.",
      status: 429,
    },
  },
});
