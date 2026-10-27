import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw, CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adminService, type DomainIssue } from "@/services/adminService";

export default function AdminDomains() {
  const { t, i18n } = useTranslation("admin");
  const { toast } = useToast();

  const [rows, setRows] = useState<DomainIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<DomainIssue | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const load = useCallback(async () => {
    try {
      setError(false);
      const { issues } = await adminService.listDomainIssues();
      setRows(issues);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount == null) return "—";
    const cur = currency || "EGP";
    return `${amount.toLocaleString(i18n.language)} ${cur}`;
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const rowKey = (row: DomainIssue) =>
    row.brokerId || row.sessionId || `${row.customDomain}-${row.startedAt}`;

  const replaceRow = (updated: DomainIssue) => {
    setRows((prev) => {
      const key = rowKey(updated);
      const next = prev.map((r) =>
        rowKey(r) === key ? { ...r, ...updated } : r,
      );
      // Mark-resolved / refund may clear the issue — drop inactive rows.
      return next.filter((r) => {
        const status = r.domainStatus;
        const refund = r.refundStatus;
        if (
          status === "active" &&
          (!refund || refund === "none" || refund === "refunded")
        ) {
          return false;
        }
        return true;
      });
    });
  };

  const runAction = async (
    row: DomainIssue,
    action: "retry-dns" | "retry-render" | "mark-resolved",
  ) => {
    if (!row.brokerId) return;
    const key = `${rowKey(row)}:${action}`;
    setActionKey(key);
    try {
      let updated: DomainIssue;
      if (action === "retry-dns") {
        updated = await adminService.retryDomainDns(row.brokerId);
        toast({ title: t("domains.retryDnsToast") });
      } else if (action === "retry-render") {
        updated = await adminService.retryDomainRender(row.brokerId);
        toast({ title: t("domains.retryRenderToast") });
      } else {
        updated = await adminService.markDomainResolved(row.brokerId);
        toast({ title: t("domains.markResolvedToast") });
      }
      replaceRow({ ...row, ...updated });
      await load();
    } catch {
      toast({
        title: t("domains.actionErrorTitle"),
        description: t("domains.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionKey(null);
    }
  };

  const handleRefundConfirm = async () => {
    if (!refundTarget?.brokerId) return;
    const reason = refundReason.trim();
    if (!reason) return;

    const key = `${rowKey(refundTarget)}:refund`;
    setActionKey(key);
    try {
      await adminService.refundAndRevertDomain(refundTarget.brokerId, reason);
      toast({ title: t("domains.refundToast") });
      setRefundTarget(null);
      setRefundReason("");
      await load();
    } catch {
      toast({
        title: t("domains.actionErrorTitle"),
        description: t("domains.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionKey(null);
    }
  };

  const statusLabel = (row: DomainIssue) => {
    const status = row.domainStatus;
    if (status) {
      return t(`domains.status.${status}`, { defaultValue: status });
    }
    if (row.refundStatus && row.refundStatus !== "none") {
      return t(`domains.refundStatus.${row.refundStatus}`, {
        defaultValue: row.refundStatus,
      });
    }
    return "—";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t("domains.heading")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("domains.subheading")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("domains.loadError")}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">{t("domains.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("domains.table.broker")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("domains.table.domain")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("domains.table.status")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium hidden lg:table-cell">
                    {t("domains.table.lastError")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium hidden md:table-cell">
                    {t("domains.table.attempts")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium hidden lg:table-cell">
                    {t("domains.table.started")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium hidden md:table-cell">
                    {t("domains.table.amount")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium hidden md:table-cell">
                    {t("domains.table.refund")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("domains.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = rowKey(row);
                  const busy = actionKey?.startsWith(`${key}:`);
                  const canAct = !!row.brokerId && !!row.customDomain;
                  return (
                    <tr
                      key={key}
                      className="border-b border-border last:border-0 align-top"
                    >
                      <td className="px-4 py-3">
                        {row.brokerId ? (
                          <Link
                            to={`/admin/brokers/${row.brokerId}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {row.platformName || row.email || row.brokerId}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">
                            {row.platformName || "—"}
                          </span>
                        )}
                        {row.email && (
                          <div className="text-muted-foreground text-xs">
                            {row.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr">{row.customDomain || "—"}</span>
                        {row.subdomain && (
                          <div
                            className="text-muted-foreground text-xs"
                            dir="ltr"
                          >
                            {row.subdomain}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {statusLabel(row)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                        <span className="text-xs text-muted-foreground break-words">
                          {row.lastError || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell tabular-nums whitespace-nowrap">
                        {row.attempts}
                        <span className="text-muted-foreground text-xs ms-1">
                          (DNS {row.dnsAttempts} · V {row.verifyAttempts})
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                        {formatDate(row.startedAt)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap tabular-nums">
                        {formatAmount(row.sessionAmount, row.sessionCurrency)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
                        {row.refundStatus
                          ? t(`domains.refundStatus.${row.refundStatus}`, {
                              defaultValue: row.refundStatus,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct || !!busy}
                            onClick={() => runAction(row, "retry-dns")}
                          >
                            {actionKey === `${key}:retry-dns` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5 me-1" />
                                {t("domains.actions.retryDns")}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAct || !!busy}
                            onClick={() => runAction(row, "retry-render")}
                          >
                            {actionKey === `${key}:retry-render` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5 me-1" />
                                {t("domains.actions.retryRender")}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={!canAct || !!busy}
                            onClick={() => runAction(row, "mark-resolved")}
                          >
                            {actionKey === `${key}:mark-resolved` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                                {t("domains.actions.markResolved")}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!row.brokerId || !!busy}
                            onClick={() => {
                              setRefundTarget(row);
                              setRefundReason("");
                            }}
                          >
                            <Undo2 className="h-3.5 w-3.5 me-1" />
                            {t("domains.actions.refundRevert")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t("domains.refundTitle")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("domains.refundDescription", {
                name:
                  refundTarget.platformName || refundTarget.customDomain || "",
              })}
            </p>
            <Textarea
              className="mt-4"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder={t("domains.refundPlaceholder")}
              rows={4}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRefundTarget(null);
                  setRefundReason("");
                }}
                disabled={!!actionKey}
              >
                {t("domains.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={!refundReason.trim() || !!actionKey}
                onClick={handleRefundConfirm}
              >
                {actionKey?.endsWith(":refund") ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("domains.confirmRefund")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
