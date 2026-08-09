import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBroker } from "@/contexts/BrokerContext";
import { hasBrandingAccess } from "@/lib/brokerBranding";
import { hasAnySocialLink, socialLinksFromBroker } from "@/lib/socialLinks";
import {
  dismissSocialLinksNudge,
  shouldShowSocialLinksNudge,
} from "@/lib/socialLinksNudge";

export function SocialLinksNudge() {
  const { t } = useTranslation("dashboard");
  const { broker } = useBroker();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!broker?.id) {
      setVisible(false);
      return;
    }
    if (!hasBrandingAccess(broker.package)) {
      setVisible(false);
      return;
    }
    if (hasAnySocialLink(socialLinksFromBroker(broker))) {
      setVisible(false);
      return;
    }
    setVisible(shouldShowSocialLinksNudge(broker.id));
  }, [broker]);

  if (!broker || !visible) return null;

  const dismiss = () => {
    dismissSocialLinksNudge(broker.id);
    setVisible(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 shrink-0 rounded-md bg-muted p-2 text-primary">
          <Share2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("socialNudge.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("socialNudge.description")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="default" size="sm" asChild>
          <Link to="/dashboard/settings">{t("socialNudge.cta")}</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={dismiss}
          aria-label={t("socialNudge.dismiss")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
