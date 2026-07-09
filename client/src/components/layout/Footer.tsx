import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBroker } from "@/contexts/BrokerContext";

export function Footer() {
  const { broker } = useBroker();
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  const displayPhone = broker?.phone_number || "12345";
  const displayEmail = broker?.email || "info@broker-platform.eg";
  const displayName = broker?.platform_name || t("brand.name");

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-semibold">
                {displayName}
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              {t("footer.description")}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
                aria-label={t("footer.socialFacebook")}
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
                aria-label={t("footer.socialInstagram")}
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
                aria-label={t("footer.socialTwitter")}
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
                aria-label={t("footer.socialLinkedIn")}
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4">
              {t("footer.contactUs")}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-accent shrink-0" />
                <a
                  href={`tel:${displayPhone}`}
                  className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  {displayPhone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent shrink-0" />
                <a
                  href={`mailto:${displayEmail}`}
                  className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                >
                  {displayEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © {currentYear} {displayName}. {t("footer.rightsReserved")}
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-primary-foreground/60 hover:text-accent text-sm transition-colors"
            >
              {t("footer.privacyPolicy")}
            </Link>
            <Link
              to="/terms"
              className="text-primary-foreground/60 hover:text-accent text-sm transition-colors"
            >
              {t("footer.termsOfService")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
