import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BrokerProvider } from "@/contexts/BrokerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/common/ScrollToTop";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { getSubdomainFromHost } from "@/lib/broker";

// Main domain pages (platform marketing site)
import Platform from "./pages/public/Platform";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Pricing from "./pages/public/Pricing";
import Auth from "./pages/auth/Auth";
import Subscription from "./pages/dashboard/Subscription";

// Subdomain pages (broker's site)
import Index from "./pages/public/Index";
import Properties from "./pages/property/Properties";
import PropertyDetails from "./pages/property/PropertyDetails";
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardAddProperty from "./pages/dashboard/DashboardAddProperty";
import DashboardProperties from "./pages/dashboard/DashboardProperties";
import DashboardInsights from "./pages/dashboard/DashboardInsights";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import NotFound from "./pages/error/NotFound";

const queryClient = new QueryClient();

const subdomain = getSubdomainFromHost();
const isSubdomain = !!subdomain;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrokerProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {isSubdomain ? (
                <>
                  {/* Broker subdomain routes */}
                  <Route path="/home" element={<Index />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/properties/:id" element={<PropertyDetails />} />
                  <Route path="/dashboard" element={<ProtectedRoute />}>
                    <Route index element={<Dashboard />} />
                    <Route path="properties" element={<DashboardProperties />} />
                    <Route path="properties/new" element={<DashboardAddProperty />} />
                    <Route path="properties/edit/:id" element={<DashboardAddProperty />} />
                    <Route path="insights" element={<DashboardInsights />} />
                    <Route path="settings" element={<DashboardSettings />} />
                  </Route>
                  {/* Redirect root to /home on subdomains */}
                  <Route path="/" element={<Index />} />
                </>
              ) : (
                <>
                  {/* Main domain routes (platform site) */}
                  <Route path="/" element={<Platform />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/register" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/subscription" element={<Subscription />} />
                </>
              )}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </BrokerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
