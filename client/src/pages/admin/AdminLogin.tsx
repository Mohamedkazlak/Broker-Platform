import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

/**
 * Admin login. Reuses the shared Supabase email/password auth, then verifies
 * admin status. Non-admins get an access-denied message and never proceed.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation("admin");
  const { isAdmin, isLoading: authLoading, signIn } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || "/admin";

  // Already an admin → skip the login screen.
  useEffect(() => {
    if (!authLoading && isAdmin) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAdmin, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessDenied(false);
    setIsSubmitting(true);

    try {
      const { error, isAdmin: admin } = await signIn(
        email.trim().toLowerCase(),
        password,
      );

      if (error) {
        toast({
          title: t("login.failedTitle"),
          description: t("login.failedDescription"),
          variant: "destructive",
        });
        return;
      }

      if (!admin) {
        setAccessDenied(true);
        return;
      }

      navigate(from, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t("login.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            {t("login.subtitle")}
          </p>
        </div>

        {accessDenied && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">
                {t("login.accessDeniedTitle")}
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                {t("login.accessDeniedDescription")}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("login.submit")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
