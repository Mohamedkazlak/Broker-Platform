/**
 * Property video link helpers.
 *
 * Supports YouTube, Vimeo, Google Drive *file* shares, and direct video URLs.
 * Drive *folder* links are rejected (same as image links).
 */

import {
  extractGoogleDriveFileId,
  isGoogleDriveFolderLink,
} from "./propertyImageLinks";

export type PropertyVideoKind = "youtube" | "vimeo" | "drive" | "file";

export type PropertyVideoLinkError = "folder" | "empty" | "invalid";

export type ParsedPropertyVideo = {
  url: string;
  kind: PropertyVideoKind;
  embedUrl?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
};

export type PropertyVideoLinkResult =
  | ({ ok: true } & ParsedPropertyVideo)
  | { ok: false; reason: PropertyVideoLinkError };

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

function withProtocol(raw: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  if (
    /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com|youtube-nocookie\.com|vimeo\.com|player\.vimeo\.com|drive\.google\.com|docs\.google\.com)\b/i.test(
      raw,
    )
  ) {
    return `https://${raw}`;
  }
  return raw;
}

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function isYoutubeHost(hostname: string): boolean {
  const host = stripWww(hostname);
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  );
}

function extractYoutubeId(url: URL): string | null {
  if (!isYoutubeHost(url.hostname)) return null;

  const host = stripWww(url.hostname);
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length >= 2 &&
    ["embed", "shorts", "live", "v"].includes(parts[0].toLowerCase()) &&
    YOUTUBE_ID.test(parts[1])
  ) {
    return parts[1];
  }

  return null;
}

function extractVimeoId(url: URL): string | null {
  const host = stripWww(url.hostname);
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "player.vimeo.com") {
    if (parts[0] === "video" && parts[1] && VIMEO_ID.test(parts[1])) {
      return parts[1];
    }
    return null;
  }

  const last = parts[parts.length - 1];
  if (last && VIMEO_ID.test(last)) return last;
  return null;
}

/**
 * Parse a pasted video link for storage / display.
 * - Drive folders → error
 * - YouTube / Vimeo / Drive files → embeddable
 * - blob:/data: and other http(s) URLs → direct file playback
 */
export function parsePropertyVideoLink(raw: string): PropertyVideoLinkResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return {
      ok: true,
      url: trimmed,
      kind: "file",
      playbackUrl: trimmed,
    };
  }

  if (isGoogleDriveFolderLink(trimmed)) {
    return { ok: false, reason: "folder" };
  }

  const candidate = withProtocol(trimmed);

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return { ok: false, reason: "invalid" };
  }

  const youtubeId = extractYoutubeId(url);
  if (youtubeId) {
    return {
      ok: true,
      url: candidate,
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      ok: true,
      url: candidate,
      kind: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  const driveId = extractGoogleDriveFileId(candidate);
  if (driveId) {
    return {
      ok: true,
      url: candidate,
      kind: "drive",
      embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
    };
  }

  return {
    ok: true,
    url: candidate,
    kind: "file",
    playbackUrl: candidate,
  };
}

export function buildVideoEmbedSrc(
  parsed: ParsedPropertyVideo,
  options?: { autoPlay?: boolean; muted?: boolean },
): string | undefined {
  if (!parsed.embedUrl) return undefined;
  if (parsed.kind === "drive") return parsed.embedUrl;

  const params = new URLSearchParams();
  if (parsed.kind === "youtube") {
    params.set("rel", "0");
    params.set("playsinline", "1");
    if (options?.autoPlay) params.set("autoplay", "1");
    if (options?.muted || options?.autoPlay) params.set("mute", "1");
  } else if (parsed.kind === "vimeo") {
    if (options?.autoPlay) params.set("autoplay", "1");
    if (options?.muted || options?.autoPlay) params.set("muted", "1");
  }

  const qs = params.toString();
  return qs ? `${parsed.embedUrl}?${qs}` : parsed.embedUrl;
}
