import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Persistent admin shell: sidebar nav + top bar (admin email + logout).
 * Renders the active admin page via <Outlet />.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { admin, signOut } = useAdminAuth();
  const { t } = useTranslation("admin");

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-foreground"
              aria-label={t("topbar.openMenu")}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 ms-auto">
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {admin?.email}
              </span>
              <LanguageSwitcher variant="outline" />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("topbar.logout")}</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
