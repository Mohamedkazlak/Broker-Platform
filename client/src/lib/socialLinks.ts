import { normalizeWhatsAppNumber } from "@/utils/whatsapp";

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "whatsapp",
  "tiktok",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLinks = Record<SocialPlatform, string | null>;

export interface SocialLinksDb {
  social_facebook_url: string | null;
  social_instagram_url: string | null;
  social_whatsapp_url: string | null;
  social_tiktok_url: string | null;
}

export const SOCIAL_COLUMN: Record<SocialPlatform, keyof SocialLinksDb> = {
  facebook: "social_facebook_url",
  instagram: "social_instagram_url",
  whatsapp: "social_whatsapp_url",
  tiktok: "social_tiktok_url",
};

export const SOCIAL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  facebook: "facebook.com/yourpage",
  instagram: "instagram.com/yourpage",
  whatsapp: "wa.me/2012xxxxxxx",
  tiktok: "tiktok.com/@yourpage",
};

export function emptySocialLinks(): SocialLinks {
  return {
    facebook: null,
    instagram: null,
    whatsapp: null,
    tiktok: null,
  };
}

export function socialLinksFromBroker(
  broker: Partial<SocialLinksDb> | null | undefined,
): SocialLinks {
  return {
    facebook: broker?.social_facebook_url ?? null,
    instagram: broker?.social_instagram_url ?? null,
    whatsapp: broker?.social_whatsapp_url ?? null,
    tiktok: broker?.social_tiktok_url ?? null,
  };
}

export function socialLinksToDb(links: SocialLinks): SocialLinksDb {
  return {
    social_facebook_url: links.facebook,
    social_instagram_url: links.instagram,
    social_whatsapp_url: links.whatsapp,
    social_tiktok_url: links.tiktok,
  };
}

export function hasAnySocialLink(links: SocialLinks): boolean {
  return SOCIAL_PLATFORMS.some((p) => Boolean(links[p]));
}

function stripHandle(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/\/+$/, "");
}

function ensureHttps(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function pathAfterHost(hostname: string, pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  // Ignore common non-profile paths
  if (["share", "watch", "reel", "reels", "p", "stories"].includes(parts[0])) {
    return parts[1] ? stripHandle(parts[1]) : null;
  }
  return stripHandle(parts[0]);
}

export type NormalizeResult =
  | { ok: true; url: string | null }
  | { ok: false; error: "invalid" };

export function normalizeFacebookInput(raw: string): NormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/facebook\.com|fb\.com|fb\.me/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (
        !["facebook.com", "fb.com", "fb.me", "m.facebook.com"].includes(host)
      ) {
        return { ok: false, error: "invalid" };
      }
      const slug = pathAfterHost(host, url.pathname);
      if (!slug) return { ok: false, error: "invalid" };
      return { ok: true, url: `https://www.facebook.com/${slug}` };
    }

    // Bare page name / username
    const slug = stripHandle(trimmed).replace(/^facebook\.com\//i, "");
    if (!/^[A-Za-z0-9.\-]+$/.test(slug)) return { ok: false, error: "invalid" };
    return { ok: true, url: `https://www.facebook.com/${slug}` };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

export function normalizeInstagramInput(raw: string): NormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/instagram\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (host !== "instagram.com") return { ok: false, error: "invalid" };
      const user = pathAfterHost(host, url.pathname);
      if (!user || !/^[A-Za-z0-9._]+$/.test(user)) {
        return { ok: false, error: "invalid" };
      }
      return { ok: true, url: `https://www.instagram.com/${user}` };
    }

    const user = stripHandle(trimmed).replace(/^instagram\.com\//i, "");
    if (!/^[A-Za-z0-9._]+$/.test(user)) return { ok: false, error: "invalid" };
    return { ok: true, url: `https://www.instagram.com/${user}` };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

export function normalizeTikTokInput(raw: string): NormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/tiktok\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (!["tiktok.com", "vm.tiktok.com"].includes(host)) {
        return { ok: false, error: "invalid" };
      }
      const parts = url.pathname.split("/").filter(Boolean);
      const userPart = parts.find((p) => p.startsWith("@")) ?? parts[0];
      const user = stripHandle(userPart || "");
      if (!user || !/^[A-Za-z0-9._]+$/.test(user)) {
        return { ok: false, error: "invalid" };
      }
      return { ok: true, url: `https://www.tiktok.com/@${user}` };
    }

    const user = stripHandle(trimmed).replace(/^tiktok\.com\/@?/i, "");
    if (!/^[A-Za-z0-9._]+$/.test(user)) return { ok: false, error: "invalid" };
    return { ok: true, url: `https://www.tiktok.com/@${user}` };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

export function normalizeWhatsAppSocialInput(raw: string): NormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/wa\.me|api\.whatsapp\.com|whatsapp\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      let digits = "";
      if (host === "wa.me") {
        digits = normalizeWhatsAppNumber(url.pathname);
      } else if (host === "api.whatsapp.com" || host === "whatsapp.com") {
        digits = normalizeWhatsAppNumber(
          url.searchParams.get("phone") || url.pathname,
        );
      } else {
        return { ok: false, error: "invalid" };
      }
      if (digits.length < 8) return { ok: false, error: "invalid" };
      return { ok: true, url: `https://wa.me/${digits}` };
    }

    const digits = normalizeWhatsAppNumber(trimmed);
    if (digits.length < 8) return { ok: false, error: "invalid" };
    return { ok: true, url: `https://wa.me/${digits}` };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

const NORMALIZERS: Record<SocialPlatform, (raw: string) => NormalizeResult> = {
  facebook: normalizeFacebookInput,
  instagram: normalizeInstagramInput,
  whatsapp: normalizeWhatsAppSocialInput,
  tiktok: normalizeTikTokInput,
};

export function normalizeSocialInput(
  platform: SocialPlatform,
  raw: string,
): NormalizeResult {
  return NORMALIZERS[platform](raw);
}

/** Normalize all raw form values. Empty fields become null; invalid ones are listed. */
export function normalizeSocialForm(raw: Record<SocialPlatform, string>): {
  links: SocialLinks;
  errors: Partial<Record<SocialPlatform, "invalid">>;
} {
  const links = emptySocialLinks();
  const errors: Partial<Record<SocialPlatform, "invalid">> = {};

  for (const platform of SOCIAL_PLATFORMS) {
    const result = normalizeSocialInput(platform, raw[platform] ?? "");
    if (!result.ok) {
      errors[platform] = result.error;
    } else {
      links[platform] = result.url;
    }
  }

  return { links, errors };
}
