import { Oxanium, Outfit } from 'next/font/google';

/* Two families, and each has a reason. Oxanium is angular and hexagonal, so
   it carries the hex motif of the artwork into the type and sets every
   figure on the site — its tabular numerals are why there is no third family
   for numbers. Outfit is geometric and quiet and handles everything a person
   actually reads.

   Declared here rather than in a layout because there are two root layouts —
   the site and the stream overlays — and both are set in the same type. */
export const display = Oxanium({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-oxanium',
  display: 'swap',
});

export const sans = Outfit({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

/** The class list that puts both variables on `<html>`. */
export const FONT_VARIABLES = `${display.variable} ${sans.variable}`;
