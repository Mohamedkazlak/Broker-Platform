/**
 * Property image link helpers.
 *
 * Supports pasting Google Drive *file* share links and converting them to a
 * direct image URL suitable for <img src>. Drive *folder* links are rejected.
 */

export type PropertyImageLinkError = "folder" | "empty" | "invalid";

export type PropertyImageLinkResult =
  | { ok: true; url: string; converted: boolean }
  | { ok: false; reason: PropertyImageLinkError };

const DRIVE_HOST = /(?:^|\.)(?:drive|docs)\.google\.com$/i;

function isDriveHost(hostname: string): boolean {
  return DRIVE_HOST.test(hostname);
}

/** True for Google Drive folder URLs (not single-file shares). */
export function isGoogleDriveFolderLink(raw: string): boolean {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (!isDriveHost(url.hostname)) return false;
    return /\/folders\//i.test(url.pathname);
  } catch {
    return /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?)?folders\//i.test(
      trimmed,
    );
  }
}

/** Extract a Drive file id from common share / open / uc URL shapes. */
export function extractGoogleDriveFileId(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (!isDriveHost(url.hostname)) return null;

    if (isGoogleDriveFolderLink(trimmed)) return null;

    const filePath = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePath?.[1]) return filePath[1];

    const openPath = url.pathname.match(/\/open\/?$/);
    const idParam = url.searchParams.get("id");
    if (openPath && idParam) return idParam;

    if (url.pathname.includes("/uc") && idParam) return idParam;

    const dPath = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dPath?.[1] && !/\/folders\//i.test(url.pathname)) return dPath[1];

    if (idParam && !/\/folders\//i.test(url.pathname)) return idParam;

    return null;
  } catch {
    const loose = trimmed.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    );
    return loose?.[1] ?? null;
  }
}

/**
 * Direct-view URL that works in <img> for publicly shared Drive files.
 * Prefer googleusercontent over /uc redirects when embedding.
 */
export function googleDriveDirectImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`;
}

/**
 * Normalize a pasted image link for storage / display.
 * - Drive folders → error
 * - Drive files → convertible direct URL
 * - Other http(s) URLs → pass through
 */
export function normalizePropertyImageLink(
  raw: string,
): PropertyImageLinkResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  if (isGoogleDriveFolderLink(trimmed)) {
    return { ok: false, reason: "folder" };
  }

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return {
      ok: true,
      url: googleDriveDirectImageUrl(driveId),
      converted: true,
    };
  }

  // Already a googleusercontent / uc link — keep as-is if it has an id.
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/i.test(url.protocol)) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, url: trimmed, converted: false };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Resolve a stored URL for display (re-converts legacy raw Drive file links). */
export function toDisplayImageUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const result = normalizePropertyImageLink(raw);
  if (!result.ok) return null;
  return result.url;
}

/**
 * Build an ordered gallery from cover + urls.
 * First entry is always the cover.
 */
export function normalizePropertyGallery(
  cover: string | null | undefined,
  urls: string[] | null | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (value: string | null | undefined) => {
    if (!value?.trim()) return;
    const normalized = normalizePropertyImageLink(value);
    if (!normalized.ok) return;
    if (seen.has(normalized.url)) return;
    seen.add(normalized.url);
    out.push(normalized.url);
  };

  push(cover);
  for (const u of urls ?? []) push(u);

  return out;
}

export function coverFromGallery(urls: string[]): string | null {
  return urls[0] ?? null;
}
