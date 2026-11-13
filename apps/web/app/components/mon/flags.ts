import type { Locale } from "@/lib/i18n/config";

/**
 * The language switcher's flags, drawn as the website prototype draws them:
 * small SVGs as data URLs (Germany, the United Kingdom, Türkiye, and the
 * pan-Arab tricolour for Arabic).
 */

const url = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

/** The Turkish flag's five-pointed star, around (17.7, 10). */
const star = Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI + (i * Math.PI) / 5;
  const r = i % 2 ? 1.05 : 2.6;
  return `${(17.7 + r * Math.cos(a)).toFixed(2)},${(10 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

export const FLAGS: Record<Locale, string> = {
  de: url('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="1" fill="#000000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>'),
  en: url(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0,0 60,30M60,0 0,30" stroke="#ffffff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" stroke-width="2"/><path d="M30,0v30M0,15h60" stroke="#ffffff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  ),
  tr: url(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#E30A17"/><circle cx="11.25" cy="10" r="5" fill="#ffffff"/><circle cx="12.5" cy="10" r="4" fill="#E30A17"/><polygon points="${star}" fill="#ffffff"/></svg>`,
  ),
  ar: url('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 6"><rect width="12" height="2" fill="#00732F"/><rect y="2" width="12" height="2" fill="#ffffff"/><rect y="4" width="12" height="2" fill="#000000"/><rect width="3" height="6" fill="#FF0000"/></svg>'),
};
