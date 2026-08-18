export type Region = "damascus-countryside" | "coast";
export type Category = "villa" | "hotel" | "event";

export interface Listing {
  id: string;
  category: Category;
  region: Region;
  /** Display name of the area, e.g. "يعفور" */
  area: string;
  /** Machine key used by the filter tabs, e.g. "yafour" */
  areaKey: string;
  title: string;
  image: string;
  imageAlt: string;
  pricePerNight: number;
  currency: string;
  rooms: number;
  capacity: number;
  /** Short highlight, e.g. "شرفة كبيرة" */
  highlight: string;
  /** Renders the "مثال توضيحي" placeholder badge */
  isExample?: boolean;
}

export interface Stat {
  value: string;
  label: string;
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface NavLink {
  href: string;
  label: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface SelectField {
  label: string;
  options: string[];
}
