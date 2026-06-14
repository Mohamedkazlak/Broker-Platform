import { useEffect, useState } from "react";
import {
  autoTranslateText,
  needsAutoTranslation,
  type AppLanguage,
} from "@/utils/autoTranslate";

export function useAutoTranslate(
  text: string | null | undefined,
  target: AppLanguage,
): { value: string; loading: boolean } {
  const [value, setValue] = useState(text?.trim() ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = text?.trim() ?? "";
    setValue(trimmed);

    if (!needsAutoTranslation(trimmed, target)) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    void autoTranslateText(trimmed, target).then((translated) => {
      if (!cancelled) {
        setValue(translated);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text, target]);

  return { value, loading };
}
