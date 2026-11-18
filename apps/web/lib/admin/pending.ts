"use client";

/**
 * Draft writes still on their way to the API.
 *
 * A dashboard field stores its draft when it loses focus. Clicking
 * "Save & publish" is what takes the focus away, so that last draft and the
 * publish used to leave together — and the publish could arrive first. The
 * last field edited (a removed "XXX", a third bullet point) then missed the
 * publish and stayed behind as a draft while the site kept the old text.
 *
 * Every draft write is registered here (lib/api.tsx wraps the SDK), and
 * publishing waits for them first.
 */

const pending = new Set<Promise<unknown>>();

export function trackDraftWrite<T>(write: Promise<T>): Promise<T> {
  pending.add(write);
  write.then(
    () => pending.delete(write),
    () => pending.delete(write),
  );
  return write;
}

/** Ends any edit in progress (its blur stores the draft) and waits for every draft write. */
export async function settleDraftWrites(): Promise<void> {
  const active = typeof document !== "undefined" ? document.activeElement : null;
  if (active instanceof HTMLElement && active !== document.body) active.blur();
  // Let the blur handlers run and start their writes.
  await new Promise((resolve) => setTimeout(resolve, 0));
  while (pending.size) await Promise.allSettled([...pending]);
}
