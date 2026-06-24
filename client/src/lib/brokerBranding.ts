import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=80";

export const BRANDING_PLANS = ["plus", "pro", "ultra"] as const;
export type BrandingPlan = (typeof BRANDING_PLANS)[number];

export const PAID_PLANS = BRANDING_PLANS;

export function hasBrandingAccess(pkg: string | undefined | null): boolean {
  return BRANDING_PLANS.includes(pkg as BrandingPlan);
}

export function isPaidPlan(pkg: string | undefined | null): boolean {
  return PAID_PLANS.includes(pkg as BrandingPlan);
}

const BUCKET = "broker-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export function validateBrandingFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "invalidType";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "tooLarge";
  }
  return null;
}

async function uploadAsset(
  brokerId: string,
  file: File,
  prefix: "hero" | "icon",
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${brokerId}/${prefix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBrokerBranding(
  brokerId: string,
  files: { hero?: File | null; icon?: File | null },
  existing?: {
    heroBackgroundUrl?: string | null;
    platformIconUrl?: string | null;
  },
): Promise<{
  heroBackgroundUrl: string | null;
  platformIconUrl: string | null;
}> {
  const updates: { hero_background_url?: string; platform_icon_url?: string } =
    {};

  if (files.hero) {
    updates.hero_background_url = await uploadAsset(
      brokerId,
      files.hero,
      "hero",
    );
  }
  if (files.icon) {
    updates.platform_icon_url = await uploadAsset(brokerId, files.icon, "icon");
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("brokers")
      .update(updates)
      .eq("id", brokerId);
    if (error) throw error;
  }

  return {
    heroBackgroundUrl:
      updates.hero_background_url ?? existing?.heroBackgroundUrl ?? null,
    platformIconUrl:
      updates.platform_icon_url ?? existing?.platformIconUrl ?? null,
  };
}
