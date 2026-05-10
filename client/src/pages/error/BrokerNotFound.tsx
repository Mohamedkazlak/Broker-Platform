import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { buildMainSiteUrl, getCurrentSubdomain } from "@/utils/tenant";

const BrokerNotFound = () => {
  const { t } = useTranslation("common");
  const subdomain = getCurrentSubdomain();
  const mainSiteUrl = buildMainSiteUrl("/");

  useEffect(() => {
    console.warn(
      `Subdomain "${subdomain ?? "<unknown>"}" is not registered to any broker.`,
    );
  }, [subdomain]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="max-w-lg text-center">
        <h1 className="mb-4 text-5xl font-bold">{t("brokerNotFound.code")}</h1>
        <h2 className="mb-3 text-2xl font-semibold">
          {t("brokerNotFound.title")}
        </h2>
        <p className="mb-6 text-muted-foreground">
          {subdomain
            ? t("brokerNotFound.message", { subdomain })
            : t("brokerNotFound.messageGeneric")}
        </p>
        <a
          href={mainSiteUrl}
          className="inline-block text-primary underline hover:text-primary/90"
        >
          {t("brokerNotFound.goToMain")}
        </a>
      </div>
    </div>
  );
};

export default BrokerNotFound;
