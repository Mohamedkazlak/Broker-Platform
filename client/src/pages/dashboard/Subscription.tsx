import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { buildMainSiteUrl } from "@/utils/tenant";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { PlanCategoryTabs } from "@/components/pricing/PlanCategoryTabs";
import {
  DEFAULT_PACKAGE_CATEGORY,
  planColors,
  planIcons,
  planIdsForCategory,
  type PackageCategory,
} from "@/lib/plans";

const PANEL_ID = "dashboard-subscription-panel";

export default function Subscription() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tPricing } = useTranslation("pricing");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [category, setCategory] = useState<PackageCategory>(
    DEFAULT_PACKAGE_CATEGORY,
  );

  const planIds = planIdsForCategory(category);

  const plans = planIds.map((id) => {
    const featuresVal = tPricing(`plans.${id}.features`, {
      returnObjects: true,
    }) as string[];
    return {
      id,
      name: tPricing(`plans.${id}.name`),
      price: tPricing(`plans.${id}.price`),
      description: tPricing(`plans.${id}.description`),
      features: Array.isArray(featuresVal) ? featuresVal : [],
      icon: planIcons[id],
      highlighted: id === "pro" && category === "personal",
      colors: planColors[id],
    };
  });

  /**
   * Changing plan is never a straight write to the broker row: it has to be
   * priced, paid for, and (with Instapay) approved. That whole flow lives on
   * the main host, so this hands off to it with the chosen plan.
   */
  const handleSelectPlan = (planId: string) => {
    if (!profile?.broker_id) {
      toast({
        title: t("subscription.toasts.errorTitle"),
        description: t("subscription.toasts.noPlatform"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(planId);
    window.location.href = buildMainSiteUrl(
      `/${i18n.language}/select-plan?plan=${planId}&category=${category}`,
    );
  };

  return (
    <div className="min-h-screen bg-muted/40 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher variant="outline" />
        </div>
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("subscription.heading")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("subscription.subheading")}
          </p>
        </div>

        <div className="flex flex-col items-center text-center mb-10">
          <PlanCategoryTabs
            value={category}
            onChange={setCategory}
            panelId={PANEL_ID}
          />
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            {tPricing(`categories.${category}.description`)}
          </p>
        </div>

        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={`plan-category-tab-${category}`}
          className={`grid grid-cols-1 gap-3 md:gap-4 items-stretch ${
            plans.length > 2
              ? "md:grid-cols-2 xl:grid-cols-4"
              : "md:grid-cols-2 max-w-4xl mx-auto"
          }`}
        >
          {plans.map((plan) => {
            const solidButton = plan.id === "pro";
            return (
              <Card
                key={`${category}-${plan.id}`}
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${plan.colors.border} ${plan.colors.surface ?? ""}`}
              >
                {plan.highlighted && (
                  <div
                    className={`absolute top-3 end-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      plan.colors.badge || ""
                    }`}
                  >
                    {t("subscription.recommended")}
                  </div>
                )}
                <CardHeader className="space-y-2.5 p-5 pb-3 md:p-6 md:pb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.colors.icon}`}
                  >
                    <plan.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="font-display text-xl md:text-2xl font-bold pe-14">
                    {plan.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {tPricing("pricePerMonth")}
                    </span>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 md:px-6 md:pb-6 pt-0">
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isLoading !== null}
                    className={`w-full h-10 md:h-11 rounded-full text-sm font-semibold transition-colors duration-300 ${plan.colors.button}`}
                    variant={solidButton ? "default" : "outline"}
                  >
                    {isLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("subscription.selectPlan")
                    )}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.colors.icon}`}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-muted-foreground leading-snug">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
