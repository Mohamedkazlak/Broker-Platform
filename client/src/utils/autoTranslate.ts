import api from "@/lib/api";

export type AppLanguage = "en" | "ar";

const clientCache = new Map<string, string>();
const MAX_CACHE = 300;

function cacheKey(text: string, from: AppLanguage, to: AppLanguage) {
  return `${from}|${to}|${text}`;
}

export function detectTextLanguage(text: string): AppLanguage | "mixed" {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (arabic === 0 && latin === 0) return "en";
  if (arabic > latin) return "ar";
  if (latin > arabic) return "en";
  return "mixed";
}

export function needsAutoTranslation(
  text: string | null | undefined,
  target: AppLanguage,
): text is string {
  if (!text?.trim()) return false;
  const detected = detectTextLanguage(text);
  return detected === "mixed" || detected !== target;
}

export async function autoTranslateText(
  text: string,
  target: AppLanguage,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const detected = detectTextLanguage(trimmed);
  if (detected !== "mixed" && detected === target) return trimmed;

  const from: AppLanguage =
    detected === "ar"
      ? "ar"
      : detected === "en"
        ? "en"
        : target === "ar"
          ? "en"
          : "ar";
  const key = cacheKey(trimmed, from, target);

  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  try {
    const { data } = await api.post<{
      status: string;
      data: { translatedText: string };
    }>("/translate", { text: trimmed, from, to: target });

    const translated = data.data.translatedText?.trim() || trimmed;
    clientCache.set(key, translated);
    if (clientCache.size > MAX_CACHE) {
      const first = clientCache.keys().next().value;
      if (first) clientCache.delete(first);
    }
    return translated;
  } catch {
    return trimmed;
  }
}

export async function autoTranslateParts(
  parts: string[],
  target: AppLanguage,
): Promise<string[]> {
  return Promise.all(
    parts.map(async (part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      if (!needsAutoTranslation(trimmed, target)) return trimmed;
      return autoTranslateText(trimmed, target);
    }),
  );
}
