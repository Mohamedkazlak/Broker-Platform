import { useTranslation } from "react-i18next";

/**
 * Shared "Coming soon" placeholder for admin sections that are implemented in
 * later prompts (Payments, Properties, Domains). No data fetching here.
 */
export default function AdminPlaceholder({
  section,
}: {
  section: "payments" | "properties" | "domains";
}) {
  const { t } = useTranslation("admin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t(`placeholders.${section}.heading`)}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t(`placeholders.${section}.subheading`)}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="flex items-center justify-center rounded-lg py-20">
          <p className="text-muted-foreground">{t("common.comingSoon")}</p>
        </div>
      </div>
    </div>
  );
}
