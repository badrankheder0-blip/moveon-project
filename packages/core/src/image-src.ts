/**
 * Which image and video references the website will render from editable content.
 *
 * Photos on the public pages are `content_blocks` rows of kind "image" (and the
 * brand logo is a site setting of the same kind), so their value is typed by
 * an editor. The value lands in an `<img src>` on every page view, which makes
 * it a place a `javascript:` or `data:` payload — or an image hot-linked over
 * plain http — could reach visitors. Two shapes are accepted, nothing else:
 *
 *   - a site-relative path under `/images/`, i.e. a file shipped in
 *     `apps/web/public/images` (what every seeded default is);
 *   - an absolute `https:` URL, for an image hosted elsewhere until the
 *     dashboard has its own upload storage.
 *
 * Videos (blocks of kind "video", the homepage's strip clips) land in a
 * `<video src>` and are held to the same two shapes, with `/videos/` as their
 * folder: a clip shipped in `apps/web/public/videos`, or an https URL — which
 * is what a dashboard upload returns.
 *
 * The API enforces this on write and the website re-checks on read, so a row
 * written some other way (a script, a restore) still cannot inject a scheme.
 */

const MAX_LENGTH = 2000;

/** The rule both kinds share; only the folder a site path must sit in differs. */
function isSafeMediaSrc(value: string, folder: "/images/" | "/videos/"): boolean {
  const src = value.trim();

  if (src.length === 0 || src.length > MAX_LENGTH) return false;

  // Whitespace and control characters inside a URL are how scheme filters get
  // slipped ("java\tscript:"); a legitimate media path never needs them.
  if (/[\s\u0000-\u001f\u007f\\]/.test(src)) return false;

  if (src.startsWith("/")) {
    // `//host/x` is protocol-relative — another origin, not a site path.
    if (src.startsWith("//")) return false;
    if (!src.startsWith(folder)) return false;
    // No climbing out of the folder, encoded or not.
    return !/(^|\/)\.\.(\/|$)/.test(src) && !/%2e%2e|%2f/i.test(src);
  }

  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isSafeImageSrc(value: string): boolean {
  return isSafeMediaSrc(value, "/images/");
}

export function isSafeVideoSrc(value: string): boolean {
  return isSafeMediaSrc(value, "/videos/");
}
