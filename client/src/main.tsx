import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./fonts";
import "./index.css";

import i18n, {
  readLanguageFromUrl,
  resolveInitialLanguage,
  applyDocumentLanguageAttributes,
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

// Sets lang/dir (and, alongside them, which font-family applies — see
// applyDocumentLanguageAttributes) for the initial render. The same helper
// is registered against i18next's languageChanged event so this stays in
// sync if the language is ever changed without a full page reload.
applyDocumentLanguageAttributes(activeLang);

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
