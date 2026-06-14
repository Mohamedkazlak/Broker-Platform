const CACHE = new Map();
const MAX_CACHE_SIZE = 500;

function cacheKey(text, from, to) {
  return `${from}|${to}|${text}`;
}

function trimCache() {
  if (CACHE.size <= MAX_CACHE_SIZE) return;
  const firstKey = CACHE.keys().next().value;
  CACHE.delete(firstKey);
}

export async function translateText(req, res, next) {
  try {
    const { text, from, to } = req.body ?? {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        status: "error",
        error: "text is required",
      });
    }

    if (!["en", "ar"].includes(from) || !["en", "ar"].includes(to)) {
      return res.status(400).json({
        status: "error",
        error: "from and to must be 'en' or 'ar'",
      });
    }

    if (from === to) {
      return res.json({ status: "success", data: { translatedText: text } });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return res.json({ status: "success", data: { translatedText: text } });
    }

    const key = cacheKey(trimmed, from, to);
    if (CACHE.has(key)) {
      return res.json({
        status: "success",
        data: { translatedText: CACHE.get(key) },
        cached: true,
      });
    }

    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", trimmed.slice(0, 500));
    url.searchParams.set("langpair", `${from}|${to}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation provider returned ${response.status}`);
    }

    const payload = await response.json();
    const translatedText =
      payload?.responseData?.translatedText?.trim() || trimmed;

    CACHE.set(key, translatedText);
    trimCache();

    return res.json({
      status: "success",
      data: { translatedText },
    });
  } catch (error) {
    return next(error);
  }
}
