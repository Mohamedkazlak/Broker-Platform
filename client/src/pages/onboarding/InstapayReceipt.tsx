import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getOnboardingDraft, hasOnboardingDraft } from "@/lib/onboardingDraft";
import {
  fileToReceiptPayload,
  saveInstapayClaimToken,
  validateInstapayReceiptFile,
} from "@/lib/instapay";

export default function InstapayReceipt() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("onboarding");
  const inputRef = useRef<HTMLInputElement>(null);

  const brokerId = profile?.broker_id;
  const isDraftFlow = !brokerId && hasOnboardingDraft();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isDraftFlow) {
      const draft = getOnboardingDraft();
      if (!draft?.package || draft.package === "free" || !draft.domain) {
        navigate("/select-plan", { replace: true });
        return;
      }
      setReady(true);
      return;
    }

    if (!brokerId && !user) {
      navigate("/register", { replace: true });
      return;
    }

    if (brokerId) setReady(true);
  }, [brokerId, isDraftFlow, navigate, user]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChosen = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const errorKey = validateInstapayReceiptFile(next);
    if (errorKey) {
      toast({
        title: t("instapay.receipt.invalidTitle"),
        description: t(`instapay.receipt.errors.${errorKey}`),
        variant: "destructive",
      });
      return;
    }
    setFile(next);
  };

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);

    try {
      const receipt = await fileToReceiptPayload(file);
      const body: Record<string, unknown> = { receipt };

      // Deferred signup: send draft so the server can store it until admin approve.
      // Account is NOT created here.
      if (isDraftFlow) {
        const draft = getOnboardingDraft();
        if (!draft?.package || !draft.domain) {
          navigate("/select-plan", { replace: true });
          return;
        }
        body.formData = draft.formData;
        body.package = draft.package;
        body.domain = draft.domain;
      }

      const { data } = await api.post("/instapay/submit-receipt", body);

      if (data?.claimToken) {
        saveInstapayClaimToken(data.claimToken);
      }
      if (data?.subdomain) {
        sessionStorage.setItem("broker_subdomain", data.subdomain);
      }

      // Keep the local draft until approval so reject → retry still works.
      navigate("/payment/instapay/pending", { replace: true });
    } catch (err: unknown) {
      console.error("Instapay receipt submit failed:", err);
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } };
      };
      toast({
        title: t("payment.toasts.errorTitle"),
        description:
          axiosErr.response?.data?.error || t("instapay.receipt.submitFailed"),
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("instapay.receipt.heading")}
          </h1>
          <p className="text-muted-foreground">
            {t("instapay.receipt.subheading")}
          </p>
        </div>

        <Card>
          <CardContent className="pt-8 pb-6 space-y-6">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
            />

            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt={t("instapay.receipt.previewAlt")}
                  className="mx-auto max-h-72 w-auto rounded-lg border border-border object-contain"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => inputRef.current?.click()}
                >
                  {t("instapay.receipt.change")}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center transition hover:bg-muted/50"
              >
                <ImagePlus className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">{t("instapay.receipt.pick")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("instapay.receipt.hint")}
                  </p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 space-y-3">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={!file || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-2" />
                {t("instapay.receipt.submitting")}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 me-2" />
                {t("instapay.receipt.submit")}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={() => navigate("/payment/instapay")}
          >
            {t("instapay.receipt.back")}
          </Button>
        </div>
      </div>
    </div>
  );
}
