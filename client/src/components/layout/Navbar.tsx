import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useBroker } from "@/contexts/BrokerContext";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  links?: { href: string; label: string }[];
  transparent?: boolean;
}

export function Navbar({ links, transparent }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { broker } = useBroker();
  const { user, signOut } = useAuth();
  const { t } = useTranslation("common");

  const handleSignOut = async () => {
    await signOut();
    navigate("/home");
  };

  const defaultLinks = [
    { href: "/home", label: t("nav.home") },
    { href: "/properties", label: t("nav.properties") },
    { href: "/properties?type=sale", label: t("nav.buy") },
    { href: "/properties?type=rent", label: t("nav.rent") },
  ];

  const navLinks = links || defaultLinks;

  const isActive = (path: string) => {
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path && !location.search;
  };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent border-none"
          : "glass border-b border-border/50"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex flex-1 items-center justify-start">
            <Link to="/home" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                {broker?.platform_name || t("brand.name")}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`font-body text-sm font-medium transition-colors duration-200 hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex flex-1 items-center justify-end gap-4">
            <LanguageSwitcher />
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="w-4 h-4 me-2" />
                    {t("nav.dashboard")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 me-2" />
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              !["/home", "/properties"].includes(location.pathname) &&
              !location.pathname.startsWith("/properties/") && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">{t("nav.signIn")}</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link to="/register">{t("nav.getStarted")}</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex flex-1 justify-end lg:hidden">
            <button
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={t("nav.toggleMenu")}
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-full inset-x-0 bg-background border-b border-border shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`block py-2 font-body text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border space-y-2">
              <LanguageSwitcher variant="outline" className="w-full justify-center" />
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <LayoutDashboard className="w-4 h-4 me-2" />
                      {t("nav.dashboard")}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="w-4 h-4 me-2" />
                    {t("nav.signOut")}
                  </Button>
                </>
              ) : (
                !["/home", "/properties"].includes(location.pathname) &&
                !location.pathname.startsWith("/properties/") && (
                  <>
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        {t("nav.signIn")}
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/register" onClick={() => setIsOpen(false)}>
                        {t("nav.getStarted")}
                      </Link>
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
