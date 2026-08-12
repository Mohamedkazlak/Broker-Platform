import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  adminService,
  type ContactMessage,
  type Pagination,
} from "@/services/adminService";

const STATUS_OPTIONS = ["all", "unread", "read"] as const;
const PAGE_SIZE = 20;

export default function AdminMessages() {
  const { t, i18n } = useTranslation("admin");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const { messages, pagination: pg } =
        await adminService.listContactMessages({
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          page,
          limit: PAGE_SIZE,
        });
      setRows(messages);
      setPagination(pg);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const applyUpdated = (updated: ContactMessage) => {
    setRows((prev) => {
      if (status === "unread" && updated.read) {
        return prev.filter((r) => r.id !== updated.id);
      }
      if (status === "read" && !updated.read) {
        return prev.filter((r) => r.id !== updated.id);
      }
      return prev.map((r) => (r.id === updated.id ? updated : r));
    });
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  };

  const handleOpen = async (row: ContactMessage) => {
    setSelected(row);
    if (row.read) return;

    try {
      const updated = await adminService.setContactMessageRead(row.id, true);
      applyUpdated(updated);
    } catch {
      // Opening still works even if the read flag fails to persist.
    }
  };

  const handleToggleRead = async (row: ContactMessage) => {
    setActionId(row.id);
    try {
      const updated = await adminService.setContactMessageRead(
        row.id,
        !row.read,
      );
      applyUpdated(updated);
    } catch {
      toast({
        title: t("messages.actionErrorTitle"),
        description: t("messages.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      await adminService.deleteContactMessage(deleteTarget.id);
      toast({ title: t("messages.deletedToast") });
      const isLastOnPage = rows.length === 1 && page > 1;
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      if (isLastOnPage) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch {
      toast({
        title: t("messages.actionErrorTitle"),
        description: t("messages.actionErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const replyHref = (row: ContactMessage) =>
    `mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t("messages.heading")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("messages.subheading")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("messages.loadError")}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 lg:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("messages.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as (typeof STATUS_OPTIONS)[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`messages.statusFilter.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-start font-medium">
                  {t("messages.table.name")}
                </th>
                <th className="px-4 lg:px-6 py-3 text-start font-medium hidden md:table-cell">
                  {t("messages.table.email")}
                </th>
                <th className="px-4 lg:px-6 py-3 text-start font-medium">
                  {t("messages.table.subject")}
                </th>
                <th className="px-4 lg:px-6 py-3 text-start font-medium hidden lg:table-cell">
                  {t("messages.table.received")}
                </th>
                <th className="px-4 lg:px-6 py-3 text-start font-medium">
                  {t("messages.table.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => void handleOpen(row)}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                    !row.read ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 lg:px-6 py-4">
                    <p
                      className={`truncate ${
                        row.read
                          ? "text-foreground"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {row.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate md:hidden">
                      {row.email}
                    </p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-muted-foreground">
                    {row.email}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-muted-foreground max-w-[16rem] truncate">
                    {row.subject}
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <Badge
                      variant="outline"
                      className={
                        row.read
                          ? "border-border text-muted-foreground"
                          : "border-primary text-primary"
                      }
                    >
                      {row.read
                        ? t("messages.status.read")
                        : t("messages.status.unread")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("messages.empty")}</p>
          </div>
        )}

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 lg:p-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("messages.pagination.summary", {
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                {t("messages.pagination.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("messages.pagination.next")}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-card border border-border shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="message-detail-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3
                  id="message-detail-title"
                  className="font-display text-lg font-semibold text-foreground"
                >
                  {selected.subject}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  selected.read
                    ? "border-border text-muted-foreground shrink-0"
                    : "border-primary text-primary shrink-0"
                }
              >
                {selected.read
                  ? t("messages.status.read")
                  : t("messages.status.unread")}
              </Badge>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {t("messages.detail.name")}
                </dt>
                <dd className="font-medium text-foreground">{selected.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("messages.detail.email")}
                </dt>
                <dd>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-primary hover:underline"
                  >
                    {selected.email}
                  </a>
                </dd>
              </div>
              {selected.phone && (
                <div>
                  <dt className="text-muted-foreground">
                    {t("messages.detail.phone")}
                  </dt>
                  <dd>
                    <a
                      href={`tel:${selected.phone}`}
                      className="text-foreground hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">
                  {t("messages.detail.message")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-foreground leading-relaxed">
                  {selected.message}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t("messages.close")}
              </Button>
              <Button
                variant="outline"
                disabled={actionId === selected.id}
                onClick={() => void handleToggleRead(selected)}
              >
                {actionId === selected.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selected.read ? (
                  t("messages.markUnread")
                ) : (
                  t("messages.markRead")
                )}
              </Button>
              <Button variant="outline" asChild>
                <a href={replyHref(selected)}>
                  <Mail className="h-4 w-4 me-1" />
                  {t("messages.reply")}
                </a>
              </Button>
              <Button
                variant="destructive"
                disabled={actionId === selected.id}
                onClick={() => setDeleteTarget(selected)}
              >
                <Trash2 className="h-4 w-4 me-1" />
                {t("messages.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-lg p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {t("messages.deleteTitle")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("messages.deleteDescription", { name: deleteTarget.name })}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={actionId === deleteTarget.id}
              >
                {t("messages.cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={actionId === deleteTarget.id}
                onClick={() => void handleDeleteConfirm()}
              >
                {actionId === deleteTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("messages.confirmDelete")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
