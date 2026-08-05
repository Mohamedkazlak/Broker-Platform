import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useBroker } from "@/contexts/BrokerContext";
import { buildTenantUrl } from "@/utils/tenant";
import { cn } from "@/lib/utils";

interface ViewBrokerWebsiteButtonProps {
  className?: string;
}

export function ViewBrokerWebsiteButton({
  className,
}: ViewBrokerWebsiteButtonProps) {
  const { broker } = useBroker();
  const { i18n, t } = useTranslation("dashboard");

  const publicUrl = broker?.subdomain
    ? buildTenantUrl(broker.subdomain, `/${i18n.language}/home`)
    : null;

  if (!publicUrl) return null;

  return (
    <Button variant="outline" asChild className={cn(className)}>
      <a href={publicUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4" />
        <span className="hidden sm:inline">{t("overview.viewWebsite")}</span>
      </a>
    </Button>
  );
}
