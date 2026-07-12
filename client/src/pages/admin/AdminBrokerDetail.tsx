import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Ban, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BrokerStatusBadge } from "@/components/admin/BrokerStatusBadge";
import { adminService, type BrokerDetail } from "@/services/adminService";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-foreground break-words">{value || "—"}</span>
    </div>
  );
}

function ComingSoonSection({ title }: { title: string }) {
  const { t } = useTranslation("admin");
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border py-10">
        <p className="text-muted-foreground">{t("common.comingSoon")}</p>
      </div>
    </div>
  );
}

export default function AdminBrokerDetail() {
  const { brokerId } = useParams<{ brokerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("admin");

  const [broker, setBroker] = useState<BrokerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!brokerId) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const data = await adminService.getBroker(brokerId);
        if (!cancelled) setBroker(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brokerId]);

  const isSuspended = broker?.status === "suspended";
  const nextStatus: "active" | "suspended" = isSuspended
    ? "active"
    : "suspended";

  const handleConfirm = async () => {
    if (!broker) return;
    setIsSubmitting(true);
    try {
      const result = await adminService.updateBrokerStatus(
        broker.id,
        nextStatus,
      );
      setBroker({
        ...broker,
        status: result.status,
        isActive: result.isActive,
      });
      toast({
        title:
          nextStatus === "suspended"
            ? t("detail.suspendedToast")
            : t("detail.reactivatedToast"),
      });
      setConfirmOpen(false);
    } catch {
      toast({
        title: t("detail.actionErrorTitle"),
        description: t("detail.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      i18n.language === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !broker) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/brokers")}>
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t("detail.back")}
        </Button>
        <div className="text-center py-16 text-muted-foreground">
          {t("detail.notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ms-3"
            onClick={() => navigate("/admin/brokers")}
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("detail.back")}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
              {broker.platformName}
            </h1>
            <BrokerStatusBadge status={broker.status} />
          </div>
        </div>

        <Button
          variant={isSuspended ? "default" : "destructive"}
          onClick={() => setConfirmOpen(true)}
          className="gap-2"
        >
          {isSuspended ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Ban className="w-4 h-4" />
          )}
          {isSuspended ? t("detail.reactivate") : t("detail.suspend")}
        </Button>
      </div>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-2">
          {t("detail.profileHeading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <InfoRow
            label={t("detail.fields.contactName")}
            value={`${broker.firstName} ${broker.lastName}`.trim()}
          />
          <InfoRow label={t("detail.fields.email")} value={broker.email} />
          <InfoRow
            label={t("detail.fields.phone")}
            value={broker.phoneNumber}
          />
          <InfoRow
            label={t("detail.fields.whatsapp")}
            value={broker.whatsappNumber}
          />
          <InfoRow
            label={t("detail.fields.governorate")}
            value={broker.governorate}
          />
          <InfoRow
            label={t("detail.fields.subdomain")}
            value={broker.subdomain}
          />
          <InfoRow
            label={t("detail.fields.customDomain")}
            value={broker.customDomain}
          />
          <InfoRow
            label={t("detail.fields.plan")}
            value={<span className="capitalize">{broker.plan}</span>}
          />
          <InfoRow
            label={t("detail.fields.status")}
            value={<BrokerStatusBadge status={broker.status} />}
          />
          <InfoRow
            label={t("detail.fields.signupDate")}
            value={formatDate(broker.signupDate)}
          />
        </div>
      </div>

      {/* Coming soon — filled in by later prompts */}
      <ComingSoonSection title={t("detail.propertiesHeading")} />
      <ComingSoonSection title={t("detail.paymentHistoryHeading")} />

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {isSuspended
                ? t("detail.confirmReactivateTitle")
                : t("detail.confirmSuspendTitle")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isSuspended
                ? t("detail.confirmReactivateDescription", {
                    name: broker.platformName,
                  })
                : t("detail.confirmSuspendDescription", {
                    name: broker.platformName,
                  })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={isSubmitting}
              >
                {t("detail.cancel")}
              </Button>
              <Button
                variant={isSuspended ? "default" : "destructive"}
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSuspended ? (
                  t("detail.reactivate")
                ) : (
                  t("detail.suspend")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
