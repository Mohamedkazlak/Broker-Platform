/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM_BASE_DOMAIN?: string;
  readonly VITE_MAIN_SITE_ORIGIN?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
