/**
 * Self-hosted webfonts (via @fontsource) for the two locale-driven typefaces:
 * - Inter: main typeface for English/Latin copy (`font-sans`)
 * - IBM Plex Sans Arabic: main typeface for Arabic copy (`font-ar`)
 *
 * Only the weights actually used across the app (400/500/600/700) are
 * loaded, keeping the payload small. See `tailwind.config.ts` for the
 * corresponding font-family stacks and `src/i18n/index.ts` for how the
 * active language toggles which one applies.
 */
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
