import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import i18n, {
  readLanguageFromUrl,
  resolveInitialLanguage,
  isRtl,
} from "./i18n";

// Ensure URL is always prefixed with the active language before React Router mounts,
// so BrowserRouter's `basename` matches from the first render.
const detectedLang = readLanguageFromUrl();
const activeLang = detectedLang ?? resolveInitialLanguage();

if (!detectedLang) {
  const rest = window.location.pathname === "/" ? "" : window.location.pathname;
  const nextUrl = `/${activeLang}${rest}${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

document.documentElement.lang = activeLang;
document.documentElement.dir = isRtl(activeLang) ? "rtl" : "ltr";

const BRAND_NAMES: Record<string, string> = {
  en: "Broker Platform",
  ar: "منصة بروكر",
};

const brandName = BRAND_NAMES[activeLang] ?? BRAND_NAMES.en;
document.title = brandName;

const setMetaContent = (selector: string, value: string) => {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = value;
};

setMetaContent('meta[name="author"]', brandName);
setMetaContent('meta[property="og:title"]', brandName);

if (i18n.language !== activeLang) {
  void i18n.changeLanguage(activeLang);
}

createRoot(document.getElementById("root")!).render(<App lang={activeLang} />);
