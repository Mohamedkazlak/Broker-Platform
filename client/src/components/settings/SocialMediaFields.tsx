import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { SocialPlatformIcon } from "@/components/settings/SocialPlatformIcon";
import {
  SOCIAL_PLACEHOLDERS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/lib/socialLinks";

export type SocialFormValues = Record<SocialPlatform, string>;

interface SocialMediaFieldsProps {
  values: SocialFormValues;
  errors?: Partial<Record<SocialPlatform, string>>;
  disabled?: boolean;
  onChange: (platform: SocialPlatform, value: string) => void;
}

export function SocialMediaFields({
  values,
  errors,
  disabled = false,
  onChange,
}: SocialMediaFieldsProps) {
  const { t } = useTranslation("dashboard");

  return (
    <div className="space-y-4">
      {SOCIAL_PLATFORMS.map((platform) => (
        <div key={platform} className="space-y-2">
          <label
            htmlFor={`social-${platform}`}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
              <SocialPlatformIcon platform={platform} className="h-4 w-4" />
            </span>
            <span className="sr-only">
              {t(`settings.socialMedia.platforms.${platform}`)}
            </span>
          </label>
          <Input
            id={`social-${platform}`}
            dir="ltr"
            disabled={disabled}
            value={values[platform]}
            placeholder={SOCIAL_PLACEHOLDERS[platform]}
            onChange={(e) => onChange(platform, e.target.value)}
            className="placeholder:text-muted-foreground/60"
            aria-label={t(`settings.socialMedia.platforms.${platform}`)}
            aria-invalid={Boolean(errors?.[platform])}
          />
          {errors?.[platform] && (
            <p className="text-sm text-destructive">{errors[platform]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
