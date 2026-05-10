import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

type NavLink = {
  href: string;
  label: string;
  scrollTo?: string;
};

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks: NavLink[] = [
    { href: "/", label: t("nav.features"), scrollTo: "features" },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: NavLink,
  ) => {
    setIsOpen(false);
    if (link.scrollTo) {
      e.preventDefault();
      if (location.pathname === link.href) {
        scrollToId(link.scrollTo);
      } else {
        navigate(link.href, { state: { scrollTo: link.scrollTo } });
      }
      return;
    }
    window.scrollTo(0, 0);
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <span className="font-display text-lg font-semibold text-foreground">
              {t("brand.name")}
            </span>
            <p className="text-xs text-muted-foreground">{t("brand.tagline")}</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Button
              key={link.label}
              variant="ghost"
              className="text-foreground hover:text-accent-foreground hover:scale-105 hover:shadow-gold transition-all duration-300"
              asChild
            >
              <Link
                to={link.href}
                onClick={(e) => handleLinkClick(e, link)}
              >
                {link.label}
              </Link>
            </Button>
          ))}

          <LanguageSwitcher />

          <Button
            variant="ghost"
            className="text-foreground hover:text-accent-foreground hover:scale-105 hover:shadow-gold transition-all duration-300"
            asChild
          >
            <Link to="/login">{t("nav.login")}</Link>
          </Button>

          <Button asChild variant="hero">
            <Link to="/register">{t("nav.getStarted")}</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t("nav.toggleMenu")}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-full inset-x-0 bg-background border-b border-border shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="block py-3 font-display text-lg font-medium text-foreground hover:text-primary transition-colors border-b border-border/50 last:border-0"
                onClick={(e) => handleLinkClick(e, link)}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-4 space-y-3">
              <LanguageSwitcher variant="outline" className="w-full justify-center" />
              <Button
                variant="ghost"
                className="w-full justify-start text-lg h-12"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button
                variant="hero"
                className="w-full justify-center text-lg h-12"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link to="/register">{t("nav.getStarted")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
