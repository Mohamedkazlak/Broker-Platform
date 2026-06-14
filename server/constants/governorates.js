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
];

export function isValidGovernorate(value) {
  return typeof value === "string" && EGYPT_GOVERNORATES.includes(value);
}
