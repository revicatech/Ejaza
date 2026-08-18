import type { NavLink, FooterColumn } from "@/lib/types";
import { site } from "./site";

export const navLinks: NavLink[] = [
  { href: "#listings", label: "الفلل" },
  { href: "#intro", label: "كيف تشتغل" },
  { href: "#owners", label: "أصحاب الفلل" },
  { href: "#cta", label: "تواصل معنا" },
];

export const footerColumns: FooterColumn[] = [
  {
    title: "استكشف",
    links: [
      { href: "#listings", label: "الفلل" },
      { href: "#intro", label: "كيف تشتغل" },
      { href: "#owners", label: "أصحاب الفلل" },
    ],
  },
  {
    title: "المناطق",
    links: [
      { href: "#", label: "يعفور" },
      { href: "#", label: "الزبداني" },
      { href: "#", label: "بلودان" },
      { href: "#", label: "مضايا" },
    ],
  },
  {
    title: "تواصل معنا",
    links: [
      { href: site.emailUrl, label: site.email },
      { href: site.whatsappUrl, label: "واتساب" },
      { href: "#cta", label: "تواصل معنا" },
    ],
  },
];
