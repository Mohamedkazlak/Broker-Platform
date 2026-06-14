import { useEffect, useMemo, useState } from "react";
import type { Property } from "@/components/properties/PropertyCard";
import {
  autoTranslateText,
  needsAutoTranslation,
  type AppLanguage,
} from "@/utils/autoTranslate";

interface PropertyDisplayText {
  title: string;
  description: string;
  location: string;
  loading: boolean;
}

interface UsePropertyDisplayTextOptions {
  includeDescription?: boolean;
}

function buildRawPropertyLocation(
  property: Pick<Property, "location" | "city" | "country">,
): string {
  return [property.location, property.city, property.country]
    .filter(Boolean)
    .join(", ");
}

async function translateField(
  text: string,
  target: AppLanguage,
): Promise<string> {
  if (!needsAutoTranslation(text, target)) return text;
  return autoTranslateText(text, target);
}

export function usePropertyDisplayText(
  property: Property | null,
  language: string,
  options: UsePropertyDisplayTextOptions = {},
): PropertyDisplayText {
  const { includeDescription = true } = options;
  const target: AppLanguage = language.startsWith("ar") ? "ar" : "en";

  const rawTitle = property?.title?.trim() ?? "";
  const rawDescription = property?.description?.trim() ?? "";
  const rawLocation = useMemo(
    () => (property ? buildRawPropertyLocation(property) : ""),
    [property],
  );

  const [title, setTitle] = useState(rawTitle);
  const [description, setDescription] = useState(rawDescription);
  const [location, setLocation] = useState(rawLocation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!property) {
      setTitle("");
      setDescription("");
      setLocation("");
      setLoading(false);
      return undefined;
    }

    setTitle(rawTitle);
    setDescription(rawDescription);
    setLocation(rawLocation);

    const tasks: Promise<void>[] = [];
    const needsTitle = needsAutoTranslation(rawTitle, target);
    const needsDescription =
      includeDescription && needsAutoTranslation(rawDescription, target);
    const needsLocation = needsAutoTranslation(rawLocation, target);

    if (needsTitle || needsDescription || needsLocation) {
      setLoading(true);
    }

    if (needsTitle) {
      tasks.push(
        translateField(rawTitle, target).then((value) => setTitle(value)),
      );
    }

    if (needsDescription) {
      tasks.push(
        translateField(rawDescription, target).then((value) =>
          setDescription(value),
        ),
      );
    }

    if (needsLocation) {
      tasks.push(
        translateField(rawLocation, target).then((value) => setLocation(value)),
      );
    }

    if (tasks.length === 0) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    void Promise.all(tasks).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    property,
    rawTitle,
    rawDescription,
    rawLocation,
    target,
    includeDescription,
  ]);

  return { title, description, location, loading };
}
