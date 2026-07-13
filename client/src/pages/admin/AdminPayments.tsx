import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminService, type InstapaySubmission } from "@/services/adminService";

export default function AdminPayments() {
  const { t, i18n } = useTranslation("admin");
  const { toast } = useToast();

  const [rows, setRows] = useState<InstapaySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<InstapaySubmission | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<InstapaySubmission | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const { submissions } = await adminService.listInstapay({
        status: "pending_review",
      });
      setRows(submissions);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatAmount = (amount: number, currency: string) =>
    `${amount.toLocaleString(i18n.language)} ${currency}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const handleApprove = async (row: InstapaySubmission) => {
    setActionId(row.id);
    try {
      await adminService.reviewInstapay(row.id, { action: "approve" });
      toast({ title: t("payments.approvedToast") });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setPreview(null);
    } catch {
      toast({
        title: t("payments.actionErrorTitle"),
        description: t("payments.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) return;

    setActionId(rejectTarget.id);
    try {
      await adminService.reviewInstapay(rejectTarget.id, {
        action: "reject",
        rejectionReason: reason,
      });
      toast({ title: t("payments.rejectedToast") });
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason("");
      setPreview(null);
    } catch {
      toast({
        title: t("payments.actionErrorTitle"),
        description: t("payments.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t("payments.heading")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("payments.subheading")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("payments.loadError")}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">{t("payments.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("payments.table.broker")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("payments.table.amount")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("payments.table.submitted")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("payments.table.receipt")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("payments.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {row.broker?.platformName ?? "—"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {row.broker?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatAmount(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {row.receiptUrl ? (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => setPreview(row)}
                        >
                          {t("payments.viewReceipt")}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={actionId === row.id}
                          onClick={() => handleApprove(row)}
                        >
                          {actionId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 me-1" />
                              {t("payments.approve")}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === row.id}
                          onClick={() => {
                            setRejectTarget(row);
                            setRejectReason("");
                          }}
                        >
                          <X className="h-4 w-4 me-1" />
                          {t("payments.reject")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-lg p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {t("payments.receiptPreview")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {preview.broker?.platformName} ·{" "}
                {formatAmount(preview.amount, preview.currency)}
              </p>
            </div>
            {preview.receiptUrl && (
              <img
                src={preview.receiptUrl}
                alt={t("payments.receiptPreview")}
                className="max-h-[60vh] w-full object-contain rounded-md border border-border"
              />
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreview(null)}>
                {t("payments.cancel")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(preview);
                  setRejectReason("");
                }}
              >
                {t("payments.reject")}
              </Button>
              <Button
                disabled={actionId === preview.id}
                onClick={() => handleApprove(preview)}
              >
                {actionId === preview.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("payments.approve")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t("payments.rejectTitle")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("payments.rejectDescription", {
                name: rejectTarget.broker?.platformName ?? "",
              })}
            </p>
            <Textarea
              className="mt-4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("payments.rejectPlaceholder")}
              rows={4}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                disabled={actionId === rejectTarget.id}
              >
                {t("payments.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || actionId === rejectTarget.id}
                onClick={handleRejectConfirm}
              >
                {actionId === rejectTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("payments.confirmReject")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
