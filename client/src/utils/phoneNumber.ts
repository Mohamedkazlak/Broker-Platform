import {
  COUNTRIES,
  COUNTRIES_BY_DIAL_DESC,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
} from "@/constants/countries";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function parsePhoneNumber(full: string): {
  countryIso: string;
  nationalNumber: string;
} {
  const digits = digitsOnly(full);
  if (!digits) {
    return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: "" };
  }

  for (const country of COUNTRIES_BY_DIAL_DESC) {
    if (digits.startsWith(country.dialCode)) {
      return {
        countryIso: country.iso2,
        nationalNumber: digits.slice(country.dialCode.length),
      };
    }
  }

  return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: digits };
}

export function formatPhoneNumber(
  countryIso: string,
  nationalNumber: string,
): string {
  const country =
    getCountryByIso(countryIso) ?? getCountryByIso(DEFAULT_COUNTRY_ISO)!;
  const national = digitsOnly(nationalNumber);
  if (!national) return "";
  return `+${country.dialCode}${national}`;
}

export function isValidPhoneNumber(full: string): boolean {
  const digits = digitsOnly(full);
  if (digits.length < 10 || digits.length > 15) return false;

  const { nationalNumber } = parsePhoneNumber(full);
  return nationalNumber.length >= 6 && nationalNumber.length <= 12;
}

/** Countries sorted alphabetically by localized display name, default country first. */
export function sortCountriesForDisplay(
  locale: string,
  regionNames: Intl.DisplayNames,
): typeof COUNTRIES {
  const defaultCountry = getCountryByIso(DEFAULT_COUNTRY_ISO)!;
  const others = COUNTRIES.filter((c) => c.iso2 !== DEFAULT_COUNTRY_ISO).sort(
    (a, b) => {
      const nameA = regionNames.of(a.iso2) ?? a.iso2;
      const nameB = regionNames.of(b.iso2) ?? b.iso2;
      return nameA.localeCompare(nameB, locale);
    },
  );
  return [defaultCountry, ...others];
}
