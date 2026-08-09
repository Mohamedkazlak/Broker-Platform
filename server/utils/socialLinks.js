/**
 * Normalize broker social media inputs into consistent absolute URLs.
 * Empty / whitespace → null. Mirrors client/src/lib/socialLinks.ts.
 */

const SOCIAL_FIELDS = [
  "social_facebook_url",
  "social_instagram_url",
  "social_whatsapp_url",
  "social_tiktok_url",
];

function stripHandle(value) {
  return value.trim().replace(/^@+/, "").replace(/\/+$/, "");
}

function ensureHttps(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function digitsOnly(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function pathSlug(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (["share", "watch", "reel", "reels", "p", "stories"].includes(parts[0])) {
    return parts[1] ? stripHandle(parts[1]) : null;
  }
  return stripHandle(parts[0]);
}

function normalizeFacebook(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/facebook\.com|fb\.com|fb\.me/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (
        !["facebook.com", "fb.com", "fb.me", "m.facebook.com"].includes(host)
      ) {
        return { ok: false };
      }
      const slug = pathSlug(url.pathname);
      if (!slug) return { ok: false };
      return { ok: true, url: `https://www.facebook.com/${slug}` };
    }

    const slug = stripHandle(trimmed).replace(/^facebook\.com\//i, "");
    if (!/^[A-Za-z0-9.\-]+$/.test(slug)) return { ok: false };
    return { ok: true, url: `https://www.facebook.com/${slug}` };
  } catch {
    return { ok: false };
  }
}

function normalizeInstagram(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/instagram\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (host !== "instagram.com") return { ok: false };
      const user = pathSlug(url.pathname);
      if (!user || !/^[A-Za-z0-9._]+$/.test(user)) return { ok: false };
      return { ok: true, url: `https://www.instagram.com/${user}` };
    }

    const user = stripHandle(trimmed).replace(/^instagram\.com\//i, "");
    if (!/^[A-Za-z0-9._]+$/.test(user)) return { ok: false };
    return { ok: true, url: `https://www.instagram.com/${user}` };
  } catch {
    return { ok: false };
  }
}

function normalizeTikTok(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/tiktok\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (!["tiktok.com", "vm.tiktok.com"].includes(host)) return { ok: false };
      const parts = url.pathname.split("/").filter(Boolean);
      const userPart = parts.find((p) => p.startsWith("@")) ?? parts[0];
      const user = stripHandle(userPart || "");
      if (!user || !/^[A-Za-z0-9._]+$/.test(user)) return { ok: false };
      return { ok: true, url: `https://www.tiktok.com/@${user}` };
    }

    const user = stripHandle(trimmed).replace(/^tiktok\.com\/@?/i, "");
    if (!/^[A-Za-z0-9._]+$/.test(user)) return { ok: false };
    return { ok: true, url: `https://www.tiktok.com/@${user}` };
  } catch {
    return { ok: false };
  }
}

function normalizeWhatsApp(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, url: null };

  try {
    if (/wa\.me|api\.whatsapp\.com|whatsapp\.com/i.test(trimmed)) {
      const url = new URL(ensureHttps(trimmed));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      let digits = "";
      if (host === "wa.me") {
        digits = digitsOnly(url.pathname);
      } else if (host === "api.whatsapp.com" || host === "whatsapp.com") {
        digits = digitsOnly(url.searchParams.get("phone") || url.pathname);
      } else {
        return { ok: false };
      }
      if (digits.length < 8) return { ok: false };
      return { ok: true, url: `https://wa.me/${digits}` };
    }

    const digits = digitsOnly(trimmed);
    if (digits.length < 8) return { ok: false };
    return { ok: true, url: `https://wa.me/${digits}` };
  } catch {
    return { ok: false };
  }
}

const NORMALIZERS = {
  social_facebook_url: normalizeFacebook,
  social_instagram_url: normalizeInstagram,
  social_whatsapp_url: normalizeWhatsApp,
  social_tiktok_url: normalizeTikTok,
};

export function hasSocialLinkUpdates(updates) {
  return SOCIAL_FIELDS.some((field) => updates[field] !== undefined);
}

/**
 * Normalize social fields present on `updates` in place.
 * @returns {{ ok: true } | { ok: false, field: string }}
 */
export function normalizeSocialUpdates(updates) {
  for (const field of SOCIAL_FIELDS) {
    if (updates[field] === undefined) continue;
    const result = NORMALIZERS[field](updates[field]);
    if (!result.ok) {
      return { ok: false, field };
    }
    updates[field] = result.url;
  }
  return { ok: true };
}

export { SOCIAL_FIELDS };
