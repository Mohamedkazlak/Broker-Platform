import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodeToFlag, getCountryByIso } from "@/constants/countries";
import {
  formatPhoneNumber,
  parsePhoneNumber,
  sortCountriesForDisplay,
} from "@/utils/phoneNumber";
import { cn } from "@/lib/utils";

interface PhoneNumberInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function PhoneNumberInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  error,
}: PhoneNumberInputProps) {
  const { i18n, t } = useTranslation("common");
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  const regionNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: "region" }),
    [locale],
  );

  const sortedCountries = useMemo(
    () => sortCountriesForDisplay(locale, regionNames),
    [locale, regionNames],
  );

  const parsed = useMemo(() => parsePhoneNumber(value), [value]);
  const [countryIso, setCountryIso] = useState(parsed.countryIso);
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber);

  useEffect(() => {
    setCountryIso(parsed.countryIso);
    setNationalNumber(parsed.nationalNumber);
  }, [parsed.countryIso, parsed.nationalNumber]);

  const emitChange = (iso: string, national: string) => {
    onChange(formatPhoneNumber(iso, national));
  };

  const countryLabel = (iso: string) => regionNames.of(iso) ?? iso;
  const selectedCountry = getCountryByIso(countryIso);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={countryIso}
        onValueChange={(iso) => {
          setCountryIso(iso);
          emitChange(iso, nationalNumber);
        }}
      >
        <SelectTrigger
          className={cn("w-[130px] shrink-0", error && "border-destructive")}
          aria-label={t("phone.countryLabel")}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-1.5 truncate">
              <span aria-hidden="true">
                {countryCodeToFlag(selectedCountry.iso2)}
              </span>
              <span dir="ltr">+{selectedCountry.dialCode}</span>
            </span>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {sortedCountries.map((country) => (
            <SelectItem key={country.iso2} value={country.iso2}>
              <span className="flex items-center gap-2">
                <span aria-hidden="true">
                  {countryCodeToFlag(country.iso2)}
                </span>
                <span dir="ltr">+{country.dialCode}</span>
                <span className="text-muted-foreground truncate">
                  {countryLabel(country.iso2)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        dir="ltr"
        value={nationalNumber}
        onChange={(e) => {
          const next = digitsOnlyInput(e.target.value);
          setNationalNumber(next);
          emitChange(countryIso, next);
        }}
        placeholder={placeholder ?? t("phone.numberPlaceholder")}
        className={cn("flex-1", error && "border-destructive")}
      />
    </div>
  );
}

function digitsOnlyInput(value: string): string {
  return value.replace(/\D/g, "");
}
