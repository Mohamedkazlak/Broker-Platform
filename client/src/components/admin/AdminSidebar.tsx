import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Building2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ sidebarOpen, onClose }: AdminSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation("admin");

  const links = [
    {
      to: "/admin",
      label: t("sidebar.dashboard"),
      icon: LayoutDashboard,
      exact: true,
    },
    { to: "/admin/brokers", label: t("sidebar.brokers"), icon: Users },
    { to: "/admin/payments", label: t("sidebar.payments"), icon: CreditCard },
    {
      to: "/admin/properties",
      label: t("sidebar.properties"),
      icon: Building2,
    },
    { to: "/admin/domains", label: t("sidebar.domains"), icon: Globe },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
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
          {/* Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-sidebar-foreground">
              {t("brand")}
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

export default AdminSidebar;
