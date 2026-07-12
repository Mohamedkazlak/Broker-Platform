import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

/**
 * Protects the admin area. Redirects unauthenticated or non-admin users to
 * /admin/login. Only used under the main-host /admin route tree.
 */
export default function RequireAdmin() {
  const { isAdmin, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
