import type { FilterOption } from "@/lib/types";

// Static UI config for the listings filter tabs. The property rows themselves
// now come from Supabase (see lib/api/properties.ts); the illustrative villas
// that used to live here have moved to supabase/seed.sql.
export const filterOptions: FilterOption[] = [
  { key: "all", label: "الكل" },
  { key: "yafour", label: "يعفور" },
  { key: "bludan", label: "بلودان" },
  { key: "zabadani", label: "الزبداني" },
];
