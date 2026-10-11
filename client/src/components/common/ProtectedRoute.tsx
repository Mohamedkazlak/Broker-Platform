import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildMainSiteUrl,
  isOnBrokerCustomDomain,
  isSubdomainTenant,
} from "@/utils/tenant";

/**
 * Wraps routes that require authentication.
 * Signed-out visitors go to /login: on the broker's custom domain that is the
 * same host, on a platform subdomain it is the platform host's login.
 */
export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // A broker's custom domain serves /login itself. A platform subdomain still
    // sends visitors to the platform host's login.
    if (isOnBrokerCustomDomain()) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (isSubdomainTenant()) {
      const lang = localStorage.getItem("i18nextLng") || "en";
      window.location.href = buildMainSiteUrl(`/${lang}/login`);
      return null;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
