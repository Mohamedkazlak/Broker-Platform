import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateBrandingFile } from "@/lib/brokerBranding";

export interface BrandingFiles {
  hero: File | null;
  icon: File | null;
}

interface BrandingFieldsProps {
  heroPreviewUrl?: string | null;
  iconPreviewUrl?: string | null;
  disabled?: boolean;
  onChange: (files: BrandingFiles) => void;
}

export function BrandingFields({
  heroPreviewUrl,
  iconPreviewUrl,
  disabled = false,
  onChange,
}: BrandingFieldsProps) {
  const { t } = useTranslation("dashboard");
  const heroInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    heroPreviewUrl ?? null,
  );
  const [iconPreview, setIconPreview] = useState<string | null>(
    iconPreviewUrl ?? null,
  );
  const [errors, setErrors] = useState<{ hero?: string; icon?: string }>({});

  const notifyChange = (nextHero: File | null, nextIcon: File | null) => {
    onChange({ hero: nextHero, icon: nextIcon });
  };

  const handleFileSelect = (type: "hero" | "icon", file: File | null) => {
    if (!file) return;

    const validationError = validateBrandingFile(file);
    if (validationError) {
      setErrors((prev) => ({ ...prev, [type]: validationError }));
      return;
    }

    setErrors((prev) => ({ ...prev, [type]: undefined }));
    const preview = URL.createObjectURL(file);

    if (type === "hero") {
      setHeroFile(file);
      setHeroPreview(preview);
      notifyChange(file, iconFile);
    } else {
      setIconFile(file);
      setIconPreview(preview);
      notifyChange(heroFile, file);
    }
  };

  const clearFile = (type: "hero" | "icon") => {
    if (type === "hero") {
      setHeroFile(null);
      setHeroPreview(heroPreviewUrl ?? null);
      notifyChange(null, iconFile);
      if (heroInputRef.current) heroInputRef.current.value = "";
    } else {
      setIconFile(null);
      setIconPreview(iconPreviewUrl ?? null);
      notifyChange(heroFile, null);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, [type]: undefined }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t("settings.branding.backgroundLabel")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("settings.branding.backgroundHint")}
        </p>
        <div className="relative rounded-xl overflow-hidden border border-border h-40 bg-muted">
          {heroPreview ? (
            <img
              src={heroPreview}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">
                {t("settings.branding.noBackground")}
              </span>
            </div>
          )}
          {heroPreview && !disabled && (
            <button
              type="button"
              onClick={() => clearFile("hero")}
              className="absolute top-2 end-2 p-1 rounded-full bg-background/80 hover:bg-background"
              aria-label={t("settings.branding.remove")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <input
          ref={heroInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled}
          onChange={(e) =>
            handleFileSelect("hero", e.target.files?.[0] ?? null)
          }
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => heroInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 me-2" />
          {t("settings.branding.uploadBackground")}
        </Button>
        {errors.hero && (
          <p className="text-sm text-destructive">
            {t(`settings.branding.errors.${errors.hero}`)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("settings.branding.iconLabel")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("settings.branding.iconHint")}
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center">
            {iconPreview ? (
              <img
                src={iconPreview}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={iconInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              disabled={disabled}
              onChange={(e) =>
                handleFileSelect("icon", e.target.files?.[0] ?? null)
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => iconInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 me-2" />
              {t("settings.branding.uploadIcon")}
            </Button>
            {iconPreview && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => clearFile("icon")}
              >
                {t("settings.branding.remove")}
              </Button>
            )}
          </div>
        </div>
        {errors.icon && (
          <p className="text-sm text-destructive">
            {t(`settings.branding.errors.${errors.icon}`)}
          </p>
        )}
      </div>
    </div>
  );
}
