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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSubdomainAvailability } from "@/hooks/useSubdomainAvailability";
import {
  useCustomDomainAvailability,
  type DomainPriceQuote,
} from "@/hooks/useCustomDomainAvailability";
import {
  useTldCatalog,
  useTldSearch,
  type TldListQuote,
} from "@/hooks/useTldCatalog";
import { isPendingSubdomain } from "@/utils/subdomain";
import {
  getOnboardingDraft,
  hasOnboardingDraft,
  updateOnboardingDraft,
} from "@/lib/onboardingDraft";
import { getPlanChangeDraft, updatePlanChangeDraft } from "@/lib/planChange";

type DomainMode = "subdomain" | "custom";

type DisplayCurrency = "EGP" | "USD";

function formatQuotedPrice(amount: number, currency: DisplayCurrency) {
  if (currency === "USD") {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return amount.toLocaleString();
}

export default function DomainSetup() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("onboarding");

  const [isLoading, setIsLoading] = useState(true);
  const [currentSubdomain, setCurrentSubdomain] = useState("");
  const [mode, setMode] = useState<DomainMode>("subdomain");
  const [saving, setSaving] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [canUseCustomDomain, setCanUseCustomDomain] = useState(false);

  const [subdomainValue, setSubdomainValue] = useState("");
  const [customName, setCustomName] = useState("");
  const [customTld, setCustomTld] = useState<string>("com");
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("EGP");
  const [selectedQuote, setSelectedQuote] = useState<DomainPriceQuote | null>(
    null,
  );
  const { tlds: tldCatalog, isLoading: tldCatalogLoading } =
    useTldCatalog(canUseCustomDomain);

  const brokerId = profile?.broker_id;
  const isDraftFlow = !brokerId && hasOnboardingDraft();

  // Upgrade / downgrade in progress: the domain belongs to the pending change,
  // not to the account, so it's held in the draft until the payment for it
  // clears instead of being saved onto the broker here.
  const [planChange] = useState(() => getPlanChangeDraft());
  const isPlanChange = !!brokerId && !!planChange;

  useEffect(() => {
    if (isDraftFlow) {
      const draft = getOnboardingDraft();
      if (!draft?.package || draft.package === "free") {
        navigate("/select-plan", { replace: true });
        return;
      }
      setSelectedPackage(draft.package);
      if (draft.domain?.domain_type === "subdomain" && draft.domain.subdomain) {
        setSubdomainValue(draft.domain.subdomain);
        setCurrentSubdomain(draft.domain.subdomain);
      }
      if (
        draft.domain?.domain_type === "custom" &&
        draft.domain.custom_domain
      ) {
        setMode("custom");
        const [name, ...tldParts] = draft.domain.custom_domain.split(".");
        setCustomName(name ?? "");
        if (tldParts.length) setCustomTld(tldParts.join("."));
      }
      setIsLoading(false);
      return;
    }

    if (!brokerId) {
      navigate("/register", { replace: true });
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/brokers/${brokerId}`);
        const broker = data?.data;
        if (!active) return;

        if (!isPlanChange && broker?.package === "free") {
          navigate("/select-plan", { replace: true });
          return;
        }

        const rawSubdomain = broker?.subdomain ?? "";
        const resolvedSubdomain = isPendingSubdomain(rawSubdomain)
          ? ""
          : rawSubdomain;

        // Capabilities follow the plan being bought, not the one being left.
        setSelectedPackage(planChange?.package ?? broker?.package ?? null);
        setCurrentSubdomain(resolvedSubdomain);

        const chosen = planChange?.domain;
        if (chosen?.domain_type === "custom" && chosen.custom_domain) {
          setMode("custom");
          const [name, ...tldParts] = chosen.custom_domain.split(".");
          setCustomName(name ?? "");
          if (tldParts.length) setCustomTld(tldParts.join("."));
          setSubdomainValue(resolvedSubdomain);
        } else {
          setSubdomainValue(chosen?.subdomain ?? resolvedSubdomain);
          setMode(
            !chosen && broker?.domain_type === "custom"
              ? "custom"
              : "subdomain",
          );
          if (!chosen && broker?.domain_type === "custom") {
            const [name, ...tldParts] = String(
              broker.custom_domain ?? "",
            ).split(".");
            setCustomName(name ?? "");
            if (tldParts.length) setCustomTld(tldParts.join("."));
          }
        }
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
  }, [isDraftFlow, isPlanChange, planChange, brokerId, navigate, t, toast]);

  // Custom domains are a per-plan capability (Max and Ultra today). The server
  // rejects them on other plans, so don't offer the option there at all.
  useEffect(() => {
    if (!selectedPackage) return;

    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/plans");
        if (!active) return;
        const plan = (data?.plans ?? []).find(
          (p: { id: string }) => p.id === selectedPackage,
        );
        setCanUseCustomDomain(!!plan?.customDomain);
      } catch (err) {
        console.error("Error loading plans:", err);
        // Fall back to subdomain-only rather than offering something the
        // server may refuse at submit time.
        if (active) setCanUseCustomDomain(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedPackage]);

  useEffect(() => {
    if (!canUseCustomDomain && mode === "custom") setMode("subdomain");
  }, [canUseCustomDomain, mode]);

  const normalizedSubdomain = subdomainValue.trim().toLowerCase();
  const isOwnSubdomain =
    !isDraftFlow &&
    normalizedSubdomain.length > 0 &&
    normalizedSubdomain === currentSubdomain;

  const { status: liveSubdomainStatus } = useSubdomainAvailability(
    mode === "subdomain" && !isOwnSubdomain ? subdomainValue : "",
  );
  const subdomainStatus = isOwnSubdomain ? "current" : liveSubdomainStatus;

  const customDomain = useMemo(() => {
    const name = customName.trim().toLowerCase();
    return name ? `${name}.${customTld}` : "";
  }, [customName, customTld]);

  const { status: customStatus, quote: liveQuote } =
    useCustomDomainAvailability(mode === "custom" ? customDomain : "");

  const catalogQuote = useMemo((): DomainPriceQuote | null => {
    const row = tldCatalog.find((entry) => entry.tld === customTld);
    return row ? { priceUSD: row.priceUSD, priceEGP: row.priceEGP } : null;
  }, [customTld, tldCatalog]);

  const quotedPrice = liveQuote ?? catalogQuote ?? selectedQuote;

  const canContinue =
    mode === "subdomain"
      ? subdomainStatus === "available" || subdomainStatus === "current"
      : customStatus === "available";

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);

    const payload =
      mode === "subdomain"
        ? {
            domain_type: "subdomain" as const,
            subdomain: normalizedSubdomain,
          }
        : {
            domain_type: "custom" as const,
            custom_domain: customDomain,
          };

    if (isDraftFlow) {
      updateOnboardingDraft({ domain: payload });
      navigate("/payment");
      return;
    }

    if (!brokerId) {
      setSaving(false);
      return;
    }

    // Plan change: the domain moves with the plan, so it stays in the draft
    // until the payment behind it is confirmed.
    if (isPlanChange) {
      updatePlanChangeDraft({ domain: payload });
      navigate("/payment");
      return;
    }

    try {
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
                  <div className="flex items-center gap-2" dir="ltr">
                    <Input
                      id="subdomain"
                      value={subdomainValue}
                      dir="ltr"
                      className="text-start"
                      onChange={(e) =>
                        setSubdomainValue(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                    />
                    <span
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                      dir="ltr"
                    >
                      {t("domainSetup.subdomain.suffix")}
                    </span>
                  </div>
                  <SubdomainStatusLine status={subdomainStatus} />
                </div>
              </CardContent>
            )}
          </Card>

          {canUseCustomDomain && (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("domainSetup.custom.reassurance")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {mode === "custom" && (
                <CardContent>
                  <div
                    className="space-y-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Label htmlFor="customName">
                      {t("domainSetup.custom.label")}
                    </Label>
                    <div className="flex items-center gap-2" dir="ltr">
                      <Input
                        id="customName"
                        value={customName}
                        dir="ltr"
                        className="min-w-0 flex-1 text-start"
                        placeholder={t("domainSetup.custom.namePlaceholder")}
                        onChange={(e) =>
                          setCustomName(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, ""),
                          )
                        }
                      />
                    </div>
                    <DomainPriceLine
                      tld={customTld}
                      quote={quotedPrice}
                      quoteLoading={tldCatalogLoading && !quotedPrice}
                      currency={displayCurrency}
                      onCurrencyChange={setDisplayCurrency}
                    />
                    <CustomStatusLine status={customStatus} />
                    <TldCatalogList
                      tlds={tldCatalog}
                      isLoading={tldCatalogLoading}
                      selectedTld={customTld}
                      currency={displayCurrency}
                      onSelect={(row) => {
                        setCustomTld(row.tld);
                        setSelectedQuote({
                          priceUSD: row.priceUSD,
                          priceEGP: row.priceEGP,
                        });
                      }}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )}
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

function DomainPriceLine({
  tld,
  quote,
  quoteLoading,
  currency,
  onCurrencyChange,
}: {
  tld: string;
  quote: DomainPriceQuote | null;
  quoteLoading: boolean;
  currency: DisplayCurrency;
  onCurrencyChange: (currency: DisplayCurrency) => void;
}) {
  const { t } = useTranslation("onboarding");
  const amount =
    quote == null ? null : currency === "USD" ? quote.priceUSD : quote.priceEGP;

  return (
    <div className="flex items-center justify-between gap-3" dir="ltr">
      <p className="text-sm font-medium text-foreground min-w-0">
        {amount == null ? (
          quoteLoading ? (
            <span className="inline-flex items-center gap-1.5">
              .{tld} —{" "}
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              {` ${currency}/year`}
            </span>
          ) : tld ? (
            t("domainSetup.custom.tldPrice", {
              tld,
              price: "—",
              currency,
            })
          ) : null
        ) : (
          t("domainSetup.custom.tldPrice", {
            tld,
            price: formatQuotedPrice(amount, currency),
            currency,
          })
        )}
      </p>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          className={
            currency === "EGP"
              ? "font-medium text-foreground"
              : "hover:text-foreground"
          }
          onClick={() => onCurrencyChange("EGP")}
        >
          EGP
        </button>
        <Switch
          checked={currency === "USD"}
          onCheckedChange={(checked) =>
            onCurrencyChange(checked ? "USD" : "EGP")
          }
          aria-label={t("domainSetup.custom.currencyToggleAria")}
        />
        <button
          type="button"
          className={
            currency === "USD"
              ? "font-medium text-foreground"
              : "hover:text-foreground"
          }
          onClick={() => onCurrencyChange("USD")}
        >
          USD
        </button>
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

function CustomStatusLine({ status }: { status: string }) {
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
      </p>
    );
  }
  if (
    status === "taken" ||
    status === "invalid" ||
    status === "unsupportedTld" ||
    status === "checkFailed"
  ) {
    return (
      <p className="text-sm text-destructive">
        {t(`domainSetup.custom.${status}`)}
      </p>
    );
  }
  return null;
}

function TldCatalogList({
  tlds,
  isLoading,
  selectedTld,
  currency,
  onSelect,
}: {
  tlds: TldListQuote[];
  isLoading: boolean;
  selectedTld: string;
  currency: DisplayCurrency;
  onSelect: (row: TldListQuote) => void;
}) {
  const { t } = useTranslation("onboarding");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase().replace(/^\.+/, "");
  const { tlds: searchHits, isSearching } = useTldSearch(query, true);

  const rows = needle ? searchHits : tlds;
  const showLoading = isLoading || (Boolean(needle) && isSearching);

  return (
    <div className="space-y-2 pt-1">
      <p className="text-sm font-medium text-foreground">
        {t("domainSetup.custom.browseTlds")}
      </p>
      <Input
        value={query}
        dir="ltr"
        className="text-start"
        placeholder={t("domainSetup.custom.tldSearchPlaceholder")}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showLoading ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t("domainSetup.custom.catalogLoading")}
        </p>
      ) : tlds.length === 0 && !needle ? (
        <p className="text-sm text-muted-foreground">
          {t("domainSetup.custom.catalogEmpty")}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("domainSetup.custom.noSearchResults")}
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto rounded-md border divide-y">
          {rows.map((row) => {
            const amount = currency === "USD" ? row.priceUSD : row.priceEGP;
            const selected = row.tld === selectedTld;
            return (
              <li key={row.tld}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-start ${
                    selected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/60"
                  }`}
                  onClick={() => onSelect(row)}
                >
                  <span className="font-medium" dir="ltr">
                    .{row.tld}
                  </span>
                  <span
                    className="tabular-nums text-muted-foreground"
                    dir="ltr"
                  >
                    {formatQuotedPrice(amount, currency)} {currency}/year
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
