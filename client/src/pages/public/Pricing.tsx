import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { PlanCategoryTabs } from "@/components/pricing/PlanCategoryTabs";
import {
  DEFAULT_PACKAGE_CATEGORY,
  planColors,
  planIcons,
  planIdsForCategory,
  type PackageCategory,
  type PlanId,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Prices mirror server/config/plans.js — update both together. */
const planPrices: Record<PlanId, string> = {
  free: "0",
  plus: "300",
  pro: "1,000",
  max: "3,000",
  ultra: "5,000",
};

/** The one plan carrying the "Most Popular" ribbon (Pro, in Personal). */
const RECOMMENDED_PLAN: PlanId = "pro";

/** Plans that use a filled accent button instead of the outline style. */
const SOLID_BUTTON_PLANS: PlanId[] = ["pro"];

const PANEL_ID = "pricing-plans-panel";

export default function Pricing() {
  const { t, i18n } = useTranslation("pricing");
  const isRtl = i18n.dir() === "rtl";
  const [category, setCategory] = useState<PackageCategory>(
    DEFAULT_PACKAGE_CATEGORY,
  );

  const faqItems = ["q1", "q2", "q3", "q4"] as const;
  const planIds = planIdsForCategory(category);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {t("hero.headlinePart1")}{" "}
            <span className="text-accent">{t("hero.headlineHighlight")}</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("hero.subheadline")}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-20 bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-8 md:mb-10">
            <PlanCategoryTabs
              value={category}
              onChange={setCategory}
              panelId={PANEL_ID}
            />
            <p className="mt-4 text-sm text-muted-foreground max-w-xl">
              {t(`categories.${category}.description`)}
            </p>
          </div>

          <div
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`plan-category-tab-${category}`}
            className={cn(
              "grid grid-cols-1 gap-3 md:gap-4 mx-auto items-stretch",
              planIds.length > 2
                ? "md:grid-cols-2 xl:grid-cols-4"
                : "md:grid-cols-2 max-w-4xl",
            )}
          >
            {planIds.map((planId, index) => {
              const features = t(`plans.${planId}.features`, {
                returnObjects: true,
              }) as string[];
              const colors = planColors[planId];
              const Icon = planIcons[planId];
              const highlighted =
                planId === RECOMMENDED_PLAN && category === "personal";
              const solidButton = SOLID_BUTTON_PLANS.includes(planId);

              return (
                <Card
                  // Remount on category change so the entry animation replays.
                  key={`${category}-${planId}`}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-card-hover animate-fade-in opacity-0",
                    colors.border,
                    colors.surface,
                    highlighted
                      ? "z-10 ring-1 ring-orange-200"
                      : "hover:-translate-y-1",
                  )}
                  style={{
                    animationDelay: `${index * 150}ms`,
                    animationFillMode: "forwards",
                  }}
                >
                  {highlighted && (
                    <div
                      className={cn(
                        "absolute top-3 end-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        colors.badge,
                      )}
                    >
                      {t("mostPopular")}
                    </div>
                  )}
                  <CardHeader className="space-y-2.5 p-5 pb-3 md:p-6 md:pb-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        colors.icon,
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="font-display text-xl md:text-2xl font-bold pe-14">
                      {t(`plans.${planId}.name`)}
                    </CardTitle>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {planPrices[planId]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("currencyPerMonth")}
                      </span>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                      {t(`plans.${planId}.description`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 md:px-6 md:pb-6 pt-0">
                    <Button
                      asChild
                      className={cn(
                        "w-full h-10 md:h-11 rounded-full text-sm font-semibold transition-colors duration-300",
                        colors.button,
                      )}
                      variant={solidButton ? "default" : "outline"}
                      size="lg"
                    >
                      <Link to="/register" className="gap-2">
                        {t("getStarted")}
                        <ArrowRight
                          className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
                        />
                      </Link>
                    </Button>
                    <ul className="space-y-3">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                              colors.icon,
                            )}
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
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              {t("faq.heading")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("faq.subheading")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqItems.map((item) => (
              <div
                key={item}
                className="bg-card rounded-xl p-6 border border-border"
              >
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {t(`faq.${item}Title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`faq.${item}Answer`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
