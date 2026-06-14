/** Egyptian governorate slugs stored on brokers.governorate */
export const EGYPT_GOVERNORATES = [
  "cairo",
  "giza",
  "alexandria",
  "dakahlia",
  "red-sea",
  "beheira",
  "fayoum",
  "gharbia",
  "ismailia",
  "menofia",
  "minya",
  "qalyubia",
  "new-valley",
  "suez",
  "aswan",
  "assiut",
  "beni-suef",
  "port-said",
  "damietta",
  "sharkia",
  "south-sinai",
  "kafr-el-sheikh",
  "matrouh",
  "luxor",
  "qena",
  "north-sinai",
  "sohag",
] as const;

export type GovernorateSlug = (typeof EGYPT_GOVERNORATES)[number];

export function isValidGovernorate(value: string): value is GovernorateSlug {
  return (EGYPT_GOVERNORATES as readonly string[]).includes(value);
}
