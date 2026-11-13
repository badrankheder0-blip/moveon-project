/**
 * Leaflet 1.9.4, the prototype's map library, shipped in /public/vendor and
 * loaded on demand — not an npm dependency, and only on the screens that
 * draw a map. Several screens may ask at once; they share one load.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet has no types installed here. */
export type Leaflet = any;

// Read through a local view of `window` rather than a global declaration, so
// another screen's own declaration of `window.L` cannot clash with this one.
const host = () => window as unknown as { L?: Leaflet; __monLeaflet?: Promise<Leaflet> | null };

const CSS = "/vendor/leaflet/leaflet.css";
const JS = "/vendor/leaflet/leaflet.js";

export function loadLeaflet(): Promise<Leaflet> {
  const w = host();
  if (w.L) return Promise.resolve(w.L);
  if (w.__monLeaflet) return w.__monLeaflet;

  const loading = new Promise<Leaflet>((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${JS}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => (host().L ? resolve(host().L) : reject(new Error("Leaflet did not load."))));
    script.addEventListener("error", () => reject(new Error("Leaflet could not be loaded.")));
    if (!existing) {
      script.src = JS;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    host().__monLeaflet = null;
    throw error;
  });

  w.__monLeaflet = loading;
  return loading;
}
