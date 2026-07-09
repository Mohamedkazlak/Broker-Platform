import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasOnboardingDraft } from "@/lib/onboardingDraft";

/**
 * Allows onboarding routes when the user either:
 * - has a session (existing broker upgrading / finishing), or
 * - has an in-progress registration draft in sessionStorage (deferred DB write).
 */
export default function OnboardingRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user || hasOnboardingDraft()) {
    return <Outlet />;
  }

  return <Navigate to="/register" state={{ from: location }} replace />;
}
