import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { BrokerProvider, useBroker } from "@/contexts/BrokerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/common/ScrollToTop";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import OnboardingRoute from "@/components/common/OnboardingRoute";
import { getSubdomainFromHost } from "@/lib/broker";
import type { SupportedLanguage } from "@/i18n";
import { MarketingAnimatedLayout } from "@/components/layout/MarketingAnimatedLayout";
import BrokerNotFound from "@/pages/error/BrokerNotFound";

const Platform = lazy(() => import("./pages/public/Platform"));
const About = lazy(() => import("./pages/public/About"));
const Contact = lazy(() => import("./pages/public/Contact"));
const Pricing = lazy(() => import("./pages/public/Pricing"));
const Auth = lazy(() => import("./pages/auth/Auth"));
const Subscription = lazy(() => import("./pages/dashboard/Subscription"));
const SelectPlan = lazy(() => import("./pages/onboarding/SelectPlan"));
const DomainSetup = lazy(() => import("./pages/onboarding/DomainSetup"));
const Payment = lazy(() => import("./pages/onboarding/Payment"));
const BrandingSetup = lazy(() => import("./pages/onboarding/BrandingSetup"));

const Index = lazy(() => import("./pages/public/Index"));
const Properties = lazy(() => import("./pages/property/Properties"));
const PropertyDetails = lazy(() => import("./pages/property/PropertyDetails"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const DashboardAddProperty = lazy(
  () => import("./pages/dashboard/DashboardAddProperty"),
);
const DashboardProperties = lazy(
  () => import("./pages/dashboard/DashboardProperties"),
);
const DashboardInsights = lazy(
  () => import("./pages/dashboard/DashboardInsights"),
);
const DashboardSettings = lazy(
  () => import("./pages/dashboard/DashboardSettings"),
);
const NotFound = lazy(() => import("./pages/error/NotFound"));

const queryClient = new QueryClient();

const subdomain = getSubdomainFromHost();
const isSubdomain = !!subdomain;

interface AppProps {
  lang: SupportedLanguage;
}

const routeFallback = (
  <div className="min-h-[35vh] w-full animate-pulse bg-muted/40" aria-hidden />
);

/**
 * Layout route for tenant subdomains. Blocks rendering of any subdomain
 * page until the broker lookup is finished, and shows the dedicated
 * BrokerNotFound page when the subdomain isn't registered to any broker.
 */
const SubdomainGuard = () => {
  const { broker, isLoading, error } = useBroker();

  if (isLoading) return routeFallback;
  if (!broker || error) return <BrokerNotFound />;

  return <Outlet />;
};

const App = ({ lang }: AppProps) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrokerProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={`/${lang}`}>
            <ScrollToTop />
            <Suspense fallback={routeFallback}>
              <Routes>
                {isSubdomain ? (
                  <Route element={<SubdomainGuard />}>
                    <Route path="/home" element={<Index />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route
                      path="/properties/:id"
                      element={<PropertyDetails />}
                    />
                    <Route path="/dashboard" element={<ProtectedRoute />}>
                      <Route index element={<Dashboard />} />
                      <Route
                        path="properties"
                        element={<DashboardProperties />}
                      />
                      <Route
                        path="properties/new"
                        element={<DashboardAddProperty />}
                      />
                      <Route
                        path="properties/edit/:id"
                        element={<DashboardAddProperty />}
                      />
                      <Route path="insights" element={<DashboardInsights />} />
                      <Route path="settings" element={<DashboardSettings />} />
                      <Route path="subscription" element={<Subscription />} />
                    </Route>
                    <Route path="/" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                ) : (
                  <Route element={<MarketingAnimatedLayout />}>
                    <Route index element={<Platform />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="register" element={<Auth />} />
                    <Route path="login" element={<Auth />} />
                    <Route path="subscription" element={<Subscription />} />
                    {/* Onboarding: draft signup (no DB yet) or authenticated upgrade */}
                    <Route element={<OnboardingRoute />}>
                      <Route path="select-plan" element={<SelectPlan />} />
                      <Route path="domain-setup" element={<DomainSetup />} />
                      <Route path="payment" element={<Payment />} />
                      <Route
                        path="branding-setup"
                        element={<BrandingSetup />}
                      />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Route>
                )}
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </BrokerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
