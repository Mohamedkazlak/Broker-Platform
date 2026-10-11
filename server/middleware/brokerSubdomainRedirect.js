/**
 * Old broker subdomain -> custom domain redirect.
 *
 * Runs after subdomainMiddleware. When a page is requested on a broker's
 * platform subdomain (https://<subdomain>.myflats.store/...) and that broker has
 * an active custom domain, the visitor is sent to the same path and query on
 * the custom domain.
 *
 * Never redirects when:
 *   - the method is not GET/HEAD
 *   - the request is not on a broker subdomain of a production platform domain
 *     (localhost, *.localhost, IP hosts, *.onrender.com, the main site, and
 *     custom domains themselves are all left alone)
 *   - the path is /api/* or a webhook path (see config/brokerHost.js)
 *   - the broker has no custom domain, or it is not active (the subdomain
 *     keeps working as the fallback)
 *   - the redirect target would be a platform host or the host already being
 *     served (this is what makes a redirect loop impossible)
 *   - the lookup fails (the subdomain keeps serving the page)
 *
 * The lookup uses the same cache as the custom-domain resolver, so there is no
 * extra database query per request.
 */

import {
  BROKER_SUBDOMAIN_REDIRECT_APEXES,
  BROKER_SUBDOMAIN_REDIRECT_EXEMPT_PREFIXES,
  BROKER_SUBDOMAIN_REDIRECT_STATUS,
} from "../config/brokerHost.js";
import { isPlatformHost, stripHostPort } from "../utils/customDomainHost.js";
import { resolveActiveCustomDomainForSubdomain } from "../utils/customDomainResolve.js";
import {
  getBrokerPublicOrigin,
  hasActiveCustomDomain,
} from "../utils/brokerPublicOrigin.js";

/** True for /api, /api/..., and any other exempt prefix (webhooks). */
export function isRedirectExemptPath(pathname) {
  // Express routes are case-insensitive, so /API/... reaches the API too.
  const path = String(pathname ?? "").toLowerCase();
  return BROKER_SUBDOMAIN_REDIRECT_EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * True only for <subdomain>.<production apex>, with the label exactly the
 * subdomain the host middleware resolved. A bare apex host that got its
 * subdomain from the X-Tenant-Subdomain header does not qualify.
 */
export function isRedirectableBrokerHost(hostname, subdomain) {
  const host = stripHostPort(hostname);
  if (!host || !subdomain) return false;
  return BROKER_SUBDOMAIN_REDIRECT_APEXES.some(
    (apex) => host === `${subdomain}.${apex}`,
  );
}

export function createBrokerSubdomainRedirect({
  lookup = resolveActiveCustomDomainForSubdomain,
  status = BROKER_SUBDOMAIN_REDIRECT_STATUS,
} = {}) {
  return async function brokerSubdomainRedirect(req, res, next) {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.tenantType !== "subdomain" || !req.subdomain) return next();
      if (!isRedirectableBrokerHost(req.hostnameRaw, req.subdomain)) {
        return next();
      }
      if (isRedirectExemptPath(req.path)) return next();

      const broker = await lookup(req.subdomain);
      if (!hasActiveCustomDomain(broker)) return next();

      const origin = getBrokerPublicOrigin(broker);
      const targetHost = new URL(origin).hostname;
      if (
        isPlatformHost(targetHost) ||
        targetHost === stripHostPort(req.hostnameRaw)
      ) {
        return next();
      }

      return res.redirect(status, `${origin}${req.originalUrl}`);
    } catch (error) {
      console.error(
        `[broker-subdomain-redirect] lookup failed for "${req.subdomain}", serving the subdomain:`,
        error?.message ?? error,
      );
      return next();
    }
  };
}

export const brokerSubdomainRedirect = createBrokerSubdomainRedirect();

export default brokerSubdomainRedirect;
