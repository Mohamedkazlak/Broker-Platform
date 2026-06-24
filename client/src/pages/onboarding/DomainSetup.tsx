import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Globe, Loader2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSubdomainAvailability } from "@/hooks/useSubdomainAvailability";
import { useCustomDomainAvailability } from "@/hooks/useCustomDomainAvailability";
import { getLocalDevPort, isPendingSubdomain } from "@/utils/subdomain";

type DomainMode = "subdomain" | "custom";

const TLD_OPTIONS = ["com", "net", "store", "org", "io"] as const;

export default function DomainSetup() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("onboarding");

  const [isLoading, setIsLoading] = useState(true);
  const [currentSubdomain, setCurrentSubdomain] = useState("");
  const [mode, setMode] = useState<DomainMode>("subdomain");
  const [saving, setSaving] = useState(false);

  const [subdomainValue, setSubdomainValue] = useState("");
  const [customName, setCustomName] = useState("");
  const [customTld, setCustomTld] = useState<string>("com");

  const brokerId = profile?.broker_id;

  // Load the broker's own record: gates free-plan brokers out and pre-fills
  // the subdomain field with their current value.
  useEffect(() => {
    if (!brokerId) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/brokers/${brokerId}`);
        const broker = data?.data;
        if (!active) return;

        // Free plan never reaches domain setup — bounce them back.
        if (broker?.package === "free") {
          navigate("/select-plan", { replace: true });
          return;
        }

        const rawSubdomain = broker?.subdomain ?? "";
        const resolvedSubdomain = isPendingSubdomain(rawSubdomain)
          ? ""
          : rawSubdomain;

        setCurrentSubdomain(resolvedSubdomain);
        setSubdomainValue(resolvedSubdomain);
        setMode(broker?.domain_type === "custom" ? "custom" : "subdomain");
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading broker:", err);
        if (!active) return;
        toast({
          title: t("domainSetup.toasts.loadFailedTitle"),
          description: t("domainSetup.toasts.loadFailedDescription"),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [brokerId, navigate, t, toast]);

  const normalizedSubdomain = subdomainValue.trim().toLowerCase();
  const isOwnSubdomain =
    normalizedSubdomain.length > 0 && normalizedSubdomain === currentSubdomain;

  // Don't fire the live check for the broker's own current subdomain (it would
  // read as "taken" against their own row), nor when the custom tab is active.
  const { status: liveSubdomainStatus } = useSubdomainAvailability(
    mode === "subdomain" && !isOwnSubdomain ? subdomainValue : "",
  );
  const subdomainStatus = isOwnSubdomain ? "current" : liveSubdomainStatus;

  const customDomain = useMemo(() => {
    const name = customName.trim().toLowerCase();
    return name ? `${name}.${customTld}` : "";
  }, [customName, customTld]);

  const customDomainLocalSuffix = `.localhost:${getLocalDevPort()}`;

  const { status: customStatus, price: customPrice } =
    useCustomDomainAvailability(mode === "custom" ? customDomain : "");

  const canContinue =
    mode === "subdomain"
      ? subdomainStatus === "available" || subdomainStatus === "current"
      : customStatus === "available";

  const handleContinue = async () => {
    if (!brokerId || !canContinue) return;
    setSaving(true);
    try {
      const payload =
        mode === "subdomain"
          ? { domain_type: "subdomain", subdomain: normalizedSubdomain }
          : { domain_type: "custom", custom_domain: customDomain };

      await api.patch(`/brokers/${brokerId}`, payload);
      navigate("/payment");
    } catch (err) {
      console.error("Error saving domain:", err);
      toast({
        title: t("domainSetup.toasts.saveFailedTitle"),
        description: t("domainSetup.toasts.saveFailedDescription"),
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

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("domainSetup.heading")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("domainSetup.subheading")}
          </p>
        </div>

        <div className="space-y-5">
          {/* Subdomain option */}
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setMode("subdomain")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setMode("subdomain");
            }}
            className={`cursor-pointer transition-all ${
              mode === "subdomain"
                ? "border-primary ring-2 ring-primary/30"
                : "hover:border-primary/40"
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {t("domainSetup.subdomain.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("domainSetup.subdomain.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {mode === "subdomain" && (
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">
                    {t("domainSetup.subdomain.label")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      value={subdomainValue}
                      dir="ltr"
                      onChange={(e) =>
                        setSubdomainValue(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                      {t("domainSetup.subdomain.suffix")}
                    </span>
                  </div>
                  <SubdomainStatusLine status={subdomainStatus} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Custom domain option */}
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setMode("custom")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setMode("custom");
            }}
            className={`cursor-pointer transition-all ${
              mode === "custom"
                ? "border-primary ring-2 ring-primary/30"
                : "hover:border-primary/40"
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {t("domainSetup.custom.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("domainSetup.custom.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {mode === "custom" && (
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="customName">
                    {t("domainSetup.custom.label")}
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="customName"
                      value={customName}
                      dir="ltr"
                      placeholder={t("domainSetup.custom.namePlaceholder")}
                      onChange={(e) =>
                        setCustomName(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                    />
                    <span className="text-muted-foreground">.</span>
                    <Select value={customTld} onValueChange={setCustomTld}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TLD_OPTIONS.map((tld) => (
                          <SelectItem key={tld} value={tld}>
                            .{tld}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                      dir="ltr"
                    >
                      {customDomainLocalSuffix}
                    </span>
                  </div>
                  <CustomStatusLine
                    status={customStatus}
                    price={customPrice}
                    priceLabel={(price) =>
                      t("domainSetup.custom.price", {
                        price: price.toLocaleString(),
                      })
                    }
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full mt-8"
          disabled={!canContinue || saving}
          onClick={handleContinue}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("domainSetup.continue")
          )}
        </Button>
      </div>
    </div>
  );
}

function SubdomainStatusLine({ status }: { status: string }) {
  const { t } = useTranslation("onboarding");
  if (status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("domainSetup.subdomain.checking")}
      </p>
    );
  }
  if (status === "current") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="w-3.5 h-3.5" />
        {t("domainSetup.subdomain.current")}
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-green-600">
        <Check className="w-3.5 h-3.5" />
        {t("domainSetup.subdomain.available")}
      </p>
    );
  }
  if (status === "taken" || status === "reserved" || status === "invalid") {
    return (
      <p className="text-sm text-destructive">
        {t(`domainSetup.subdomain.${status}`)}
      </p>
    );
  }
  return null;
}

function CustomStatusLine({
  status,
  price,
  priceLabel,
}: {
  status: string;
  price: number | null;
  priceLabel: (price: number) => string;
}) {
  const { t } = useTranslation("onboarding");
  if (status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("domainSetup.custom.checking")}
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="flex items-center gap-2 text-sm text-green-600">
        <Check className="w-3.5 h-3.5" />
        {t("domainSetup.custom.available")}
        {price != null && (
          <span className="font-medium text-foreground">
            · {priceLabel(price)}
          </span>
        )}
      </p>
    );
  }
  if (status === "taken" || status === "invalid") {
    return (
      <p className="text-sm text-destructive">
        {t(`domainSetup.custom.${status}`)}
      </p>
    );
  }
  return null;
}
