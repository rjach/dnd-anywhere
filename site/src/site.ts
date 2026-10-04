/** Single source of truth for links on the landing site. */
export const SITE = {
  name: "DnD Anywhere",
  tagline: "Drag and drop files into any upload button.",
  description:
    "A free, open-source browser extension that lets you drag and drop files onto any file upload field or button, on any website. No data collection, no network requests.",
  repository: "https://github.com/rjach/dnd-anywhere",
  owner: "Rojan Acharya",
  ownerUrl: "https://rojanacharya.com",
  contactEmail: "hello@rojanacharya.com",
  /** Fill these in once each store listing is live; null shows "coming soon". */
  stores: {
    chrome: null as string | null,
    edge: null as string | null,
    firefox: null as string | null,
  },
};

/** Prefixes a site path with the GitHub Pages base path. */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}
