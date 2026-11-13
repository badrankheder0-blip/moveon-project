"use client";

import { useEffect } from "react";

/**
 * The prototype's motion helpers, for every public page at once:
 *
 *   - `data-rv="n"` fades and slides an element in the first time it scrolls
 *     into view, the n-th of a row 80ms after the one before it;
 *   - `data-count` counts a figure up from zero ("1,000+") when half of it shows;
 *   - `data-tilt` leans a card towards the pointer;
 *   - `data-par` drifts a decoration with the pointer inside its parent.
 *
 * Elements stay visible until this has run, so a page without JavaScript — or
 * read by a crawler — is never blank. Nothing moves under reduced motion.
 */
export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const ease = "cubic-bezier(.2,.7,.2,1)";
    // Hidden and waiting; put back as they were if this effect is torn down
    // first (React runs it twice in development), or they would stay hidden.
    const waiting = new Set<HTMLElement>();

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          reveal.unobserve(el);
          waiting.delete(el);
          setTimeout(() => {
            el.style.transition = el.dataset.rvTransition ?? "";
            el.style.opacity = "";
            el.style.transform = "";
            setTimeout(() => {
              el.style.transition = el.dataset.rvOwn ?? "";
            }, 1900);
          });
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 },
    );

    const counter = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          counter.unobserve(entry.target);
          countUp(entry.target as HTMLElement);
        }
      },
      { threshold: 0.5 },
    );

    const arm = () => {
      document.querySelectorAll<HTMLElement>("[data-rv]:not([data-rvd]),[data-zoom]:not([data-rvd])").forEach((el) => {
        el.setAttribute("data-rvd", "1");
        const zoom = el.hasAttribute("data-zoom");
        const index = Math.max(1, Number(el.getAttribute("data-rv")) || 1);
        const delay = ((index - 1) % 6) * 80;
        el.dataset.rvOwn = el.style.transition;
        el.style.transition = "none";
        if (zoom) el.style.transform = "scale(1.08)";
        else {
          el.style.opacity = "0";
          el.style.transform = "translateY(26px)";
        }
        el.dataset.rvTransition = zoom
          ? `transform 1.8s ${ease}`
          : `opacity .7s ${ease} ${delay}ms, transform .8s ${ease} ${delay}ms`;
        waiting.add(el);
        reveal.observe(el);
      });

      document.querySelectorAll<HTMLElement>("[data-count]:not([data-cnt])").forEach((el) => {
        el.setAttribute("data-cnt", "1");
        counter.observe(el);
      });
    };

    arm();
    const mutations = new MutationObserver(() => arm());
    mutations.observe(document.body, { childList: true, subtree: true });

    let tilted: HTMLElement | null = null;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      document.querySelectorAll<HTMLElement>("[data-par]").forEach((el) => {
        const box = el.parentElement?.getBoundingClientRect();
        if (!box) return;
        const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
        if (!inside) {
          if (el.dataset.parIn) {
            delete el.dataset.parIn;
            el.style.transform = "";
            el.style.opacity = "";
          }
          return;
        }
        el.dataset.parIn = "1";
        const dx = (event.clientX - box.left) / box.width - 0.5;
        const dy = (event.clientY - box.top) / box.height - 0.5;
        el.style.transition = `transform .6s ${ease}, opacity .4s`;
        el.style.transform = `translate(${(dx * 14).toFixed(1)}px,${(dy * 10).toFixed(1)}px) rotate(${(dx * 6).toFixed(1)}deg)`;
      });

      const target = (event.target as Element | null)?.closest?.<HTMLElement>("[data-tilt]") ?? null;
      if (tilted && tilted !== target) tilted.style.transform = "";
      tilted = target;
      if (!target) return;
      const box = target.getBoundingClientRect();
      const dx = (event.clientX - box.left) / box.width - 0.5;
      const dy = (event.clientY - box.top) / box.height - 0.5;
      target.style.transition = "transform .18s ease-out";
      target.style.transform = `perspective(900px) rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 6).toFixed(2)}deg) translateY(-4px)`;
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      reveal.disconnect();
      counter.disconnect();
      mutations.disconnect();
      document.removeEventListener("pointermove", onPointer);
      for (const el of waiting) {
        el.removeAttribute("data-rvd");
        el.style.transition = el.dataset.rvOwn ?? "";
        el.style.opacity = "";
        el.style.transform = "";
      }
      document.querySelectorAll("[data-cnt]").forEach((el) => el.removeAttribute("data-cnt"));
    };
  }, []);

  return null;
}

/** "1,000+" → counts 0…1,000 over 1.7s, keeping what is around the number. */
function countUp(el: HTMLElement) {
  const value = el.getAttribute("data-count") ?? "";
  const match = value.match(/^(\D*)(\d[\d,.]*)([\s\S]*)$/);
  const node = el.firstChild;
  if (!match || !node || node.nodeType !== Node.TEXT_NODE) return;

  const [, before = "", digits = "", after = ""] = match;
  const separator = digits.includes(",") ? "," : digits.includes(".") ? "." : "";
  const target = Number(digits.replace(/[,.]/g, ""));
  const started = Date.now();
  const duration = 1700;

  const format = (n: number) => (separator ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator) : String(n));

  const step = () => {
    if (el.getAttribute("data-count") !== value) return;
    const progress = Math.min(1, (Date.now() - started) / duration);
    node.nodeValue = before + format(Math.round(target * (1 - Math.pow(1 - progress, 3)))) + after;
    if (progress < 1) setTimeout(step, 16);
  };

  node.nodeValue = `${before}0${after}`;
  step();
}
