export const site = {
  name: "إجازة",
  tagline: "فلل دمشق وريفها للإيجار",
  description:
    "منصة محلية لتأجير الفلل والشاليهات بدمشق وريفها، مبنية على الثقة والشفافية بين المستأجر وصاحب الفيلا.",
  whatsappNumber: "963000000000",
  email: "hello@ejaza-sy.com",
  location: "دمشق، سوريا",
  get whatsappUrl() {
    return `https://wa.me/${this.whatsappNumber}`;
  },
  get emailUrl() {
    return `mailto:${this.email}`;
  },
} as const;
