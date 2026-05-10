import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useBroker } from "@/contexts/BrokerContext";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

interface DashboardSidebarProps {
  sidebarOpen: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ sidebarOpen, onClose }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  const { broker } = useBroker();
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  const links = [
    { to: "/dashboard", label: t("sidebar.dashboard"), icon: Home, exact: true },
    { to: "/dashboard/properties", label: t("sidebar.properties"), icon: Building2 },
    { to: "/dashboard/insights", label: t("sidebar.insights"), icon: TrendingUp },
    { to: "/dashboard/settings", label: t("sidebar.settings"), icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/home");
  };

  return (
    <>
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-50 w-64 bg-sidebar transform transition-transform ${
          sidebarOpen
            ? "translate-x-0"
            : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              {broker?.platform_name || t("sidebar.defaultPlatformName")}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {links.map((link) => {
              const active = isActive(link.to, link.exact);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Language switcher */}
          <div className="px-4 pb-2">
            <LanguageSwitcher variant="outline" className="w-full justify-center" />
          </div>

          {/* User */}
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sidebar-accent-foreground font-medium">
                  {profile?.full_name?.charAt(0) ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || t("sidebar.defaultUser")}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role || t("sidebar.defaultRole")}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                aria-label={tCommon("nav.signOut")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
