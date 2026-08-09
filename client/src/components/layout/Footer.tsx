import { Link } from "react-router-dom";
import { Phone, Mail, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBroker } from "@/contexts/BrokerContext";
import { SocialPlatformIcon } from "@/components/settings/SocialPlatformIcon";
import { hasBrandingAccess } from "@/lib/brokerBranding";
import {
  SOCIAL_PLATFORMS,
  socialLinksFromBroker,
  type SocialPlatform,
} from "@/lib/socialLinks";

export function Footer() {
  const { broker } = useBroker();
  const { t } = useTranslation("common");
  const currentYear = new Date().getFullYear();

  const displayPhone = broker?.phone_number || "(+20) 127 001 8663";
  const displayEmail = broker?.email || "info@brokerplatform.eg";
  const displayName = broker?.platform_name || t("brand.name");
  const homePath = broker ? "/home" : "/";

  const socialLinks = socialLinksFromBroker(broker);
  const showSocial =
    Boolean(broker) &&
    hasBrandingAccess(broker?.package) &&
    SOCIAL_PLATFORMS.some((p) => Boolean(socialLinks[p]));

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
            {showSocial && (
              <div className="flex items-center gap-2 pt-1">
                {SOCIAL_PLATFORMS.map((platform: SocialPlatform) => {
                  const href = socialLinks[platform];
                  if (!href) return null;
                  return (
                    <a
                      key={platform}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors"
                      aria-label={t(`footer.social.${platform}`)}
                    >
                      <SocialPlatformIcon
                        platform={platform}
                        className="h-4 w-4"
                      />
                    </a>
                  );
                })}
              </div>
            )}
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
              to={homePath}
              className="text-primary-foreground/60 hover:text-accent text-sm transition-colors"
            >
              {t("footer.privacyPolicy")}
            </Link>
            <Link
              to={homePath}
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
