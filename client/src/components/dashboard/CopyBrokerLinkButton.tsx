import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useBroker } from "@/contexts/BrokerContext";
import { buildTenantUrl } from "@/utils/tenant";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyBrokerLinkButtonProps {
  className?: string;
}

export function CopyBrokerLinkButton({ className }: CopyBrokerLinkButtonProps) {
  const { broker } = useBroker();
  const { i18n, t } = useTranslation("dashboard");
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const publicUrl = broker?.subdomain
    ? buildTenantUrl(broker.subdomain, `/${i18n.language}/home`)
    : null;

  const handleCopy = useCallback(async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: t("copyLink.toastTitle"),
        description: t("copyLink.toastDescription"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("copyLink.toastErrorTitle"),
        description: t("copyLink.toastErrorDescription"),
        variant: "destructive",
      });
    }
  }, [publicUrl, toast, t]);

  if (!publicUrl) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("w-full gap-2", className)}
      onClick={handleCopy}
    >
      {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      {copied ? t("copyLink.copied") : t("copyLink.button")}
    </Button>
  );
}
