import { Cairo, Inter } from "next/font/google";

/**
 * Cairo carries the Arabic typography — it's the primary UI voice since the
 * product is Arabic-first. Inter fills in for Latin text and numerals where
 * Cairo's Latin glyphs are weaker. Both expose CSS variables consumed by
 * the `--font-sans` token in app/globals.css.
 */
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
