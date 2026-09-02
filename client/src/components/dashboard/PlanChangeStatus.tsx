import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Sparkles, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { buildMainSiteUrl } from "@/utils/tenant";
import {
  dismissInstapayRejection,
  fetchMyInstapaySubmission,
  isInstapayRejectionDismissed,
  type MyInstapaySubmission,
} from "@/lib/instapay";

/**
 * Where a broker's Instapay receipt stands.
 *
 * An upgrade / downgrade paid by Instapay doesn't change anything until an
 * admin has seen the receipt, so between upload and review the dashboard would
 * otherwise look exactly as it did before — this is what says why.
 */
export function PlanChangeStatus({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tPricing } = useTranslation("pricing");

  const [submission, setSubmission] = useState<MyInstapaySubmission | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  const brokerId = profile?.broker_id;

  useEffect(() => {
    if (!brokerId || brokerId === "demo-broker-id") return;
    let active = true;
    (async () => {
      try {
        const data = await fetchMyInstapaySubmission();
        if (active) setSubmission(data);
      } catch (err) {
        console.error("Error loading payment status:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [brokerId]);

  if (!submission) return null;
  if (submission.status === "approved") return null;
  if (
    submission.status === "rejected" &&
    (dismissed || isInstapayRejectionDismissed(submission.id))
  ) {
    return null;
  }

  const localeNum = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const planName = (id: string | null) =>
    id ? tPricing(`plans.${id}.name`, { defaultValue: id }) : "";
  const isPlanChange =
    !!submission.requestedPackage &&
    submission.requestedPackage !== submission.currentPackage;
  // A requested subdomain that is already live needs no mention — the broker is
  // browsing it. One that still differs is waiting on the same approval as the
  // plan, so say so.
  const pendingSubdomain =
    submission.requestedSubdomain &&
    submission.requestedSubdomain !== submission.currentSubdomain
      ? submission.requestedSubdomain
      : null;

  if (submission.status === "rejected") {
    return (
      <div
        className={`rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${className ?? ""}`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-destructive">
              {t("planChange.rejectedTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {submission.rejectionReason || t("planChange.rejectedFallback")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              window.location.href = buildMainSiteUrl(
                `/${i18n.language}/select-plan`,
              );
            }}
          >
            {t("planChange.tryAgain")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t("planChange.dismiss")}
            onClick={() => {
              dismissInstapayRejection(submission.id);
              setDismissed(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-card px-4 py-3 shadow-card flex items-start gap-3 ${className ?? ""}`}
    >
      <div className="mt-0.5 shrink-0 rounded-md bg-muted p-2 text-primary">
        {isPlanChange ? (
          <Sparkles className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {isPlanChange
            ? t("planChange.pendingPlanTitle", {
                plan: planName(submission.requestedPackage),
              })
            : t("planChange.pendingTitle")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("planChange.pendingDescription", {
            amount: submission.amount.toLocaleString(localeNum),
            currency: submission.currency,
          })}
        </p>
        {pendingSubdomain && (
          <p className="text-sm text-muted-foreground">
            {t("planChange.pendingSubdomain", { subdomain: pendingSubdomain })}
          </p>
        )}
      </div>
    </div>
  );
}
