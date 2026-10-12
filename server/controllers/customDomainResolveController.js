import { resolveActiveCustomDomain } from "../utils/customDomainResolve.js";
import { isPlatformHost } from "../utils/customDomainHost.js";

/**
 * GET /api/tenant/resolve?host=<host>
 * Public. Returns { subdomain, broker } when the host is an active custom
 * domain. `broker` is the public profile so the SPA can skip a second
 * Supabase round-trip on first paint.
 */
export const resolveHost = async (req, res, next) => {
  try {
    const host = req.query.host;
    if (typeof host !== "string" || !host.trim()) {
      return res.status(400).json({
        status: "error",
        error: "host is required",
      });
    }

    if (isPlatformHost(host)) {
      return res.status(404).json({
        status: "error",
        error: "Broker not found",
      });
    }

    const broker = await resolveActiveCustomDomain(host);
    if (!broker?.subdomain) {
      return res.status(404).json({
        status: "error",
        error: "Broker not found",
      });
    }

    return res.json({ subdomain: broker.subdomain, broker });
  } catch (error) {
    next(error);
  }
};
