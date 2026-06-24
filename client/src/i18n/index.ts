import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enPlatform from "./locales/en/platform.json";
import enAbout from "./locales/en/about.json";
import enContact from "./locales/en/contact.json";
import enPricing from "./locales/en/pricing.json";
import enAuth from "./locales/en/auth.json";
import enProperty from "./locales/en/property.json";
import enDashboard from "./locales/en/dashboard.json";
import enValidation from "./locales/en/validation.json";
import enGovernorates from "./locales/en/governorates.json";
import enOnboarding from "./locales/en/onboarding.json";

import arCommon from "./locales/ar/common.json";
import arHome from "./locales/ar/home.json";
import arPlatform from "./locales/ar/platform.json";
import arAbout from "./locales/ar/about.json";
import arContact from "./locales/ar/contact.json";
import arPricing from "./locales/ar/pricing.json";
import arAuth from "./locales/ar/auth.json";
import arProperty from "./locales/ar/property.json";
import arDashboard from "./locales/ar/dashboard.json";
import arValidation from "./locales/ar/validation.json";
import arGovernorates from "./locales/ar/governorates.json";
import arOnboarding from "./locales/ar/onboarding.json";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    platform: enPlatform,
    about: enAbout,
    contact: enContact,
    pricing: enPricing,
    auth: enAuth,
    property: enProperty,
    dashboard: enDashboard,
    validation: enValidation,
    governorates: enGovernorates,
    onboarding: enOnboarding,
  },
  ar: {
    common: arCommon,
    home: arHome,
    platform: arPlatform,
    about: arAbout,
    contact: arContact,
    pricing: arPricing,
    auth: arAuth,
    property: arProperty,
    dashboard: arDashboard,
    validation: arValidation,
    governorates: arGovernorates,
    onboarding: arOnboarding,
  },
} as const;

/**
 * Reads the language prefix ("en" or "ar") from the current URL.
 * Returns null when the URL has no prefix yet (first visit).
 */
export function readLanguageFromUrl(): SupportedLanguage | null {
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(seg)
    ? (seg as SupportedLanguage)
    : null;
}

/**
 * Decide which language the app should start in:
 * 1. explicit URL prefix, 2. localStorage, 3. browser preference, 4. default.
 */
export function resolveInitialLanguage(): SupportedLanguage {
  const fromUrl = readLanguageFromUrl();
  if (fromUrl) return fromUrl;

  try {
    const stored = window.localStorage.getItem("i18nextLng");
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch {
    /* localStorage unavailable (private mode) — ignore */
  }

  const navLang = (window.navigator.language || "").toLowerCase();
  if (navLang.startsWith("ar")) return "ar";
  return DEFAULT_LANGUAGE;
}

export function isRtl(lang: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(lang);
}

const initialLng = resolveInitialLanguage();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLng,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    ns: [
      "common",
      "home",
      "platform",
      "about",
      "contact",
      "pricing",
      "auth",
      "property",
      "dashboard",
      "validation",
      "governorates",
      "onboarding",
    ],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["path", "localStorage", "navigator"],
      lookupFromPathIndex: 0,
      caches: ["localStorage"],
    },
    returnEmptyString: false,
  });

export default i18n;
