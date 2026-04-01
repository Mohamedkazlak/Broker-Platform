import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Wraps routes that require authentication.
 * Redirects to /login on the main domain if the user is not signed in.
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
    // If on a subdomain, redirect to main domain login
    const hostname = window.location.hostname;
    if (hostname.endsWith('.localhost') || (hostname !== 'localhost' && hostname.split('.').length >= 3)) {
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `http://localhost${port}/login`;
      return null;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
