import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Palette, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { buildSubdomainRedirect } from "@/lib/sessionRelay";
import { useToast } from "@/hooks/use-toast";
import {
  BrandingFields,
  type BrandingFiles,
} from "@/components/settings/BrandingFields";
import { hasBrandingAccess, uploadBrokerBranding } from "@/lib/brokerBranding";

const POST_PAYMENT_KEY = "onboarding_post_payment";

export function markPostPaymentPending() {
  sessionStorage.setItem(POST_PAYMENT_KEY, "true");
}

export function clearPostPaymentPending() {
  sessionStorage.removeItem(POST_PAYMENT_KEY);
}

export function isPostPaymentPending() {
  return sessionStorage.getItem(POST_PAYMENT_KEY) === "true";
}

interface BrokerSummary {
  id: string;
  package: string;
  subdomain: string | null;
  hero_background_url: string | null;
  platform_icon_url: string | null;
}

export default function BrandingSetup() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("onboarding");

  const [isLoading, setIsLoading] = useState(true);
  const [broker, setBroker] = useState<BrokerSummary | null>(null);
  const [brandingFiles, setBrandingFiles] = useState<BrandingFiles>({
    hero: null,
    icon: null,
  });
  const [saving, setSaving] = useState(false);

  const brokerId = profile?.broker_id;

  useEffect(() => {
    if (authLoading) return;

    if (!isPostPaymentPending()) {
      navigate("/select-plan", { replace: true });
      return;
    }

    if (!brokerId) {
      // Session just set after payment — wait for profile fetch.
      if (user) return;
      toast({
        title: t("brandingSetup.toasts.loadFailedTitle"),
        description: t("brandingSetup.toasts.loadFailedDescription"),
        variant: "destructive",
      });
      navigate("/select-plan", { replace: true });
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/brokers/${brokerId}`);
        if (!active) return;

        const b: BrokerSummary = data?.data ?? data?.broker;
        if (!hasBrandingAccess(b?.package)) {
          clearPostPaymentPending();
          const sub =
            b?.subdomain || sessionStorage.getItem("broker_subdomain");
          sessionStorage.removeItem("broker_subdomain");
          if (sub) {
            window.location.href = await buildSubdomainRedirect(
              sub,
              "/dashboard",
              i18n.language,
            );
            return;
          }
          navigate("/select-plan", { replace: true });
          return;
        }

        setBroker(b);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading broker for branding setup:", err);
        if (!active) return;
        toast({
          title: t("brandingSetup.toasts.loadFailedTitle"),
          description: t("brandingSetup.toasts.loadFailedDescription"),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, user, brokerId, navigate, t, toast, i18n.language]);

  const goToDashboard = async () => {
    clearPostPaymentPending();
    const sub =
      broker?.subdomain || sessionStorage.getItem("broker_subdomain") || null;
    sessionStorage.removeItem("broker_subdomain");

    if (sub) {
      const url = await buildSubdomainRedirect(
        sub,
        "/dashboard",
        i18n.language,
      );
      window.location.href = url;
      return;
    }

    // Dashboard only exists on the broker subdomain — never soft-navigate
    // on the marketing host (that would 404).
    toast({
      title: t("brandingSetup.toasts.loadFailedTitle"),
      description: t("brandingSetup.toasts.loadFailedDescription"),
      variant: "destructive",
    });
  };

  const handleSave = async () => {
    if (!broker || saving) return;

    if (!brandingFiles.hero && !brandingFiles.icon) {
      await goToDashboard();
      return;
    }

    setSaving(true);
    try {
      await uploadBrokerBranding(broker.id, brandingFiles, {
        heroBackgroundUrl: broker.hero_background_url,
        platformIconUrl: broker.platform_icon_url,
      });
      toast({ title: t("brandingSetup.toasts.savedTitle") });
      await goToDashboard();
    } catch (err) {
      console.error("Error saving branding:", err);
      toast({
        title: t("brandingSetup.toasts.saveFailedTitle"),
        description: t("brandingSetup.toasts.saveFailedDescription"),
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!broker) return null;

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("brandingSetup.heading")}
          </h1>
          <p className="text-muted-foreground">
            {t("brandingSetup.subheading")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5" />
              {t("brandingSetup.cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("brandingSetup.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BrandingFields
              heroPreviewUrl={broker.hero_background_url}
              iconPreviewUrl={broker.platform_icon_url}
              onChange={setBrandingFiles}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="lg"
                disabled={saving}
                onClick={() => void goToDashboard()}
              >
                {t("brandingSetup.skip")}
              </Button>
              <Button
                variant="hero"
                size="lg"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {t("brandingSetup.saveAndContinue")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
