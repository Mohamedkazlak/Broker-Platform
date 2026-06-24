import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBroker } from "@/contexts/BrokerContext";
import { supabase } from "@/integrations/supabase/client";
import api from "@/lib/api";
import { buildSubdomainRedirect } from "@/lib/sessionRelay";
import { useSubdomainAvailability } from "@/hooks/useSubdomainAvailability";
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  Lock,
  Palette,
  Check,
  Loader2,
} from "lucide-react";
import {
  BrandingFields,
  type BrandingFiles,
} from "@/components/settings/BrandingFields";
import { AccountDetails } from "@/components/settings/AccountDetails";
import { hasBrandingAccess, uploadBrokerBranding } from "@/lib/brokerBranding";
import { GovernorateSelect } from "@/components/forms/GovernorateSelect";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { isValidGovernorate } from "@/constants/governorates";
import { isValidPhoneNumber } from "@/utils/phoneNumber";

const DashboardSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const { broker } = useBroker();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  const fullNameParts = (profile?.full_name || "").split(" ");

  const [personalForm, setPersonalForm] = useState({
    first_name: fullNameParts[0] || "",
    last_name: fullNameParts.slice(1).join(" ") || "",
    email: profile?.email || user?.email || "",
    phone: broker?.phone_number || "",
    whatsapp: broker?.whatsapp_number || "",
    governorate: broker?.governorate || "",
  });

  const [platformForm, setPlatformForm] = useState({
    platform_name: broker?.platform_name || "",
    domain: broker?.subdomain || "",
  });
  const [currentSubdomain, setCurrentSubdomain] = useState(
    broker?.subdomain || "",
  );

  useEffect(() => {
    if (!broker?.subdomain) return;
    setCurrentSubdomain(broker.subdomain);
    setPlatformForm((prev) => ({
      ...prev,
      domain: broker.subdomain,
    }));
  }, [broker?.subdomain]);

  const normalizedDomain = platformForm.domain.trim().toLowerCase();
  const isOwnSubdomain =
    normalizedDomain.length > 0 && normalizedDomain === currentSubdomain;
  const { status: liveSubdomainStatus } = useSubdomainAvailability(
    !isOwnSubdomain ? platformForm.domain : "",
  );
  const subdomainStatus = isOwnSubdomain ? "current" : liveSubdomainStatus;
  const subdomainChanged = normalizedDomain !== currentSubdomain;
  const canSavePlatform = !subdomainChanged || subdomainStatus === "available";

  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [brandingFiles, setBrandingFiles] = useState<BrandingFiles>({
    hero: null,
    icon: null,
  });
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState(
    broker?.hero_background_url ?? null,
  );
  const [platformIconUrl, setPlatformIconUrl] = useState(
    broker?.platform_icon_url ?? null,
  );

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  const canCustomizeBranding = hasBrandingAccess(broker?.package);

  const handleSavePersonal = async () => {
    if (
      !personalForm.governorate ||
      !isValidGovernorate(personalForm.governorate)
    ) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: t("settings.toasts.governorateRequired"),
        variant: "destructive",
      });
      return;
    }

    if (
      !isValidPhoneNumber(personalForm.phone) ||
      !isValidPhoneNumber(personalForm.whatsapp)
    ) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: t("settings.toasts.phoneInvalid"),
        variant: "destructive",
      });
      return;
    }

    setSavingPersonal(true);
    try {
      const fullName =
        `${personalForm.first_name} ${personalForm.last_name}`.trim();

      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: fullName, email: personalForm.email })
          .eq("id", user.id);

        if (error) throw error;
      }

      if (broker && broker.id !== "demo-broker-id") {
        const { error } = await supabase
          .from("brokers")
          .update({
            phone_number: personalForm.phone,
            whatsapp_number: personalForm.whatsapp,
            governorate: personalForm.governorate,
            email: personalForm.email,
          })
          .eq("id", broker.id);

        if (error) throw error;
      }

      toast({ title: t("settings.toasts.personalUpdated") });
    } catch (err: any) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSavePlatform = async () => {
    if (!normalizedDomain) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: t("settings.subdomain.required"),
        variant: "destructive",
      });
      return;
    }

    if (subdomainChanged && subdomainStatus !== "available") {
      const messageKey =
        subdomainStatus === "taken" ||
        subdomainStatus === "reserved" ||
        subdomainStatus === "invalid"
          ? (`settings.subdomain.${subdomainStatus}` as const)
          : "settings.subdomain.unavailable";
      toast({
        title: t("settings.toasts.errorSaving"),
        description: t(messageKey),
        variant: "destructive",
      });
      return;
    }

    setSavingPlatform(true);
    try {
      if (subdomainChanged) {
        const { data } = await api.get("/brokers/check-subdomain", {
          params: { subdomain: normalizedDomain },
        });
        if (!data?.available) {
          const reason = data?.reason;
          const messageKey =
            reason === "taken" || reason === "reserved" || reason === "invalid"
              ? (`settings.subdomain.${reason}` as const)
              : "settings.subdomain.unavailable";
          toast({
            title: t("settings.toasts.errorSaving"),
            description: t(messageKey),
            variant: "destructive",
          });
          return;
        }
      }

      if (broker && broker.id !== "demo-broker-id") {
        await api.patch(`/brokers/${broker.id}`, {
          platform_name: platformForm.platform_name,
          subdomain: normalizedDomain,
        });
      }

      if (subdomainChanged) {
        toast({ title: t("settings.toasts.platformUpdated") });
        const url = await buildSubdomainRedirect(
          normalizedDomain,
          "/dashboard/settings",
          i18n.language,
        );
        window.location.href = url;
        return;
      }

      setCurrentSubdomain(normalizedDomain);
      toast({ title: t("settings.toasts.platformUpdated") });
    } catch (err: any) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!broker || broker.id === "demo-broker-id") return;
    if (!canCustomizeBranding) return;
    if (!brandingFiles.hero && !brandingFiles.icon) {
      toast({
        title: t("settings.branding.noChanges"),
        variant: "destructive",
      });
      return;
    }

    setSavingBranding(true);
    try {
      const urls = await uploadBrokerBranding(broker.id, brandingFiles, {
        heroBackgroundUrl,
        platformIconUrl,
      });
      setHeroBackgroundUrl(urls.heroBackgroundUrl);
      setPlatformIconUrl(urls.platformIconUrl);
      setBrandingFiles({ hero: null, icon: null });
      toast({ title: t("settings.toasts.brandingUpdated") });
    } catch (err: any) {
      toast({
        title: t("settings.toasts.errorSaving"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingBranding(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password.length < 6) {
      toast({
        title: t("settings.toasts.passwordTooShort"),
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: t("settings.toasts.passwordsDontMatch"),
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });
      if (error) throw error;

      setPasswordForm({ new_password: "", confirm_password: "" });
      toast({ title: t("settings.toasts.passwordUpdated") });
    } catch (err: any) {
      toast({
        title: t("settings.toasts.errorPassword"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            aria-label={tCommon("actions.cancel")}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {t("settings.heading")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("settings.subheading")}
            </p>
          </div>
        </div>

        <AccountDetails />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {t("settings.personalHeading")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("settings.personalDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("settings.firstName")}</Label>
                <Input
                  id="first_name"
                  value={personalForm.first_name}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("settings.lastName")}</Label>
                <Input
                  id="last_name"
                  value={personalForm.last_name}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={personalForm.email}
                onChange={(e) =>
                  setPersonalForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings.phone")}</Label>
                <PhoneNumberInput
                  id="phone"
                  value={personalForm.phone}
                  onChange={(value) =>
                    setPersonalForm((p) => ({ ...p, phone: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">{t("settings.whatsapp")}</Label>
                <PhoneNumberInput
                  id="whatsapp"
                  value={personalForm.whatsapp}
                  onChange={(value) =>
                    setPersonalForm((p) => ({ ...p, whatsapp: value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="governorate">{t("settings.governorate")}</Label>
              <GovernorateSelect
                id="governorate"
                value={personalForm.governorate}
                onChange={(value) =>
                  setPersonalForm((p) => ({ ...p, governorate: value }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSavePersonal} disabled={savingPersonal}>
                <Save className="h-4 w-4 me-2" />
                {savingPersonal
                  ? tCommon("actions.saving")
                  : tCommon("actions.saveChanges")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {t("settings.platformHeading")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("settings.platformDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">
                {t("settings.platformName")}
              </Label>
              <Input
                id="platform_name"
                value={platformForm.platform_name}
                onChange={(e) =>
                  setPlatformForm((p) => ({
                    ...p,
                    platform_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">{t("settings.domain")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="domain"
                  dir="ltr"
                  value={platformForm.domain}
                  onChange={(e) =>
                    setPlatformForm((p) => ({
                      ...p,
                      domain: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                  {t("settings.subdomain.suffix")}
                </span>
              </div>
              <SubdomainStatusLine status={subdomainStatus} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSavePlatform}
                disabled={savingPlatform || !canSavePlatform}
              >
                <Save className="h-4 w-4 me-2" />
                {savingPlatform
                  ? tCommon("actions.saving")
                  : tCommon("actions.saveChanges")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {t("settings.branding.heading")}
              </CardTitle>
            </div>
            <CardDescription>
              {canCustomizeBranding
                ? t("settings.branding.description")
                : t("settings.branding.upgradeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BrandingFields
              heroPreviewUrl={heroBackgroundUrl}
              iconPreviewUrl={platformIconUrl}
              disabled={!canCustomizeBranding}
              onChange={setBrandingFiles}
            />
            {!canCustomizeBranding && (
              <Button variant="outline" asChild>
                <Link to="/dashboard/subscription">
                  {t("settings.branding.upgradeCta")}
                </Link>
              </Button>
            )}
            {canCustomizeBranding && (
              <div className="flex justify-end">
                <Button onClick={handleSaveBranding} disabled={savingBranding}>
                  <Save className="h-4 w-4 me-2" />
                  {savingBranding
                    ? tCommon("actions.saving")
                    : tCommon("actions.saveChanges")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {t("settings.passwordHeading")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("settings.passwordDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">{t("settings.newPassword")}</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    new_password: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                {t("settings.confirmPassword")}
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    confirm_password: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={savingPassword}>
                <Lock className="h-4 w-4 me-2" />
                {savingPassword
                  ? t("settings.updating")
                  : t("settings.changePassword")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function SubdomainStatusLine({ status }: { status: string }) {
  const { t } = useTranslation("dashboard");

  if (status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("settings.subdomain.checking")}
      </p>
    );
  }
  if (status === "current") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="w-3.5 h-3.5" />
        {t("settings.subdomain.current")}
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-green-600">
        <Check className="w-3.5 h-3.5" />
        {t("settings.subdomain.available")}
      </p>
    );
  }
  if (status === "taken" || status === "reserved" || status === "invalid") {
    return (
      <p className="text-sm text-destructive">
        {t(`settings.subdomain.${status}`)}
      </p>
    );
  }
  return null;
}

export default DashboardSettings;
