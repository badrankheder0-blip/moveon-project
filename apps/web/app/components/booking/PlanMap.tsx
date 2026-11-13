"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { focusRing } from "./ui";

/**
 * A dependency-free Web Mercator map, ported from the prototype.
 *
 * It places the plan's addresses by their coordinates and joins A and B with
 * a dashed line. The line is straight on purpose: the driving distance is
 * resolved by the server when the move is priced, and drawing a road route
 * here would mean calling a public router from every browser.
 *
 * Tiles are only drawn when `NEXT_PUBLIC_MAP_TILES_URL` names a provider the
 * business has an agreement with (`https://…/{z}/{x}/{y}.png`). Without one the
 * map is schematic — positions are real, the background is a grid — rather
 * than pulling tiles from a free service whose policy forbids this traffic.
 */

const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL ?? "";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION ?? "© OpenStreetMap contributors";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  caption?: string | undefined;
  tone?: "origin" | "destination";
}

const project = (lat: number, lng: number, z: number): [number, number] => {
  const n = 256 * 2 ** z;
  const y = (Math.min(85.0511, Math.max(-85.0511, lat)) * Math.PI) / 180;
  return [((lng + 180) / 360) * n, ((1 - Math.log(Math.tan(y) + 1 / Math.cos(y)) / Math.PI) / 2) * n];
};

const unproject = (x: number, y: number, z: number): [number, number] => {
  const n = 256 * 2 ** z;
  return [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180];
};

/** The middle of North Rhine-Westphalia, at a zoom that shows the state. */
const NRW = { lat: 51.43, lng: 7.66, z: 7 };

export function PlanMap({ points, line = false }: { points: MapPoint[]; line?: boolean }) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; center: [number, number]; moved: boolean } | null>(null);
  const [size, setSize] = useState<[number, number]>([600, 340]);
  const [view, setView] = useState(NRW);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize([box.width, box.height]);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const signature = points.map((point) => `${point.lat},${point.lng}`).join("|");

  // Fits every point with some room for the labels, or shows NRW when empty.
  const fit = () => {
    if (points.length === 0) return setView(NRW);
    if (points.length === 1) return setView({ lat: points[0]!.lat, lng: points[0]!.lng, z: 14 });

    for (let z = 16; z >= 5; z -= 1) {
      const projected = points.map((point) => project(point.lat, point.lng, z));
      const xs = projected.map(([x]) => x);
      const ys = projected.map(([, y]) => y);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

      if (maxX - minX < size[0] - 120 && maxY - minY < size[1] - 110) {
        const [lat, lng] = unproject((minX + maxX) / 2, (minY + maxY) / 2, z);
        return setView({ lat, lng, z });
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [signature, size[0], size[1]]);

  const [width, height] = size;
  const center = project(view.lat, view.lng, view.z);
  const left = center[0] - width / 2;
  const top = center[1] - height / 2;
  const at = (lat: number, lng: number): [number, number] => {
    const [x, y] = project(lat, lng, view.z);
    return [x - left, y - top];
  };

  const tiles: Array<{ x: number; y: number; tileX: number }> = [];
  if (TILES) {
    const count = 2 ** view.z;
    for (let y = Math.floor(top / 256); y <= Math.floor((top + height) / 256); y += 1) {
      for (let x = Math.floor(left / 256); x <= Math.floor((left + width) / 256); x += 1) {
        if (y >= 0 && y < count) tiles.push({ x, y, tileX: ((x % count) + count) % count });
      }
    }
  }

  const zoom = (by: number) => setView((current) => ({ ...current, z: Math.max(5, Math.min(18, current.z + by)) }));

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, center: [...center] as [number, number], moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;

    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;

    if (current.moved) {
      const [lat, lng] = unproject(current.center[0] - dx, current.center[1] - dy, view.z);
      setView((previous) => ({ ...previous, lat, lng }));
    }
  }

  const origin = points.find((point) => point.tone !== "destination");
  const destination = points.find((point) => point.tone === "destination");
  const path =
    line && origin && destination
      ? (() => {
          const [x1, y1] = at(origin.lat, origin.lng);
          const [x2, y2] = at(destination.lat, destination.lng);
          return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
        })()
      : "";

  const control =
    `grid size-8 place-items-center bg-surface-card text-body font-bold text-text-heading hover:bg-surface-sunken ${focusRing}`;

  return (
    <div className="relative h-[300px] overflow-hidden md:h-[340px]" dir="ltr">
      <div
        ref={host}
        role="img"
        aria-label={t("plan.map.label")}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(event) => {
          const step: Record<string, [number, number]> = {
            ArrowLeft: [-75, 0],
            ArrowRight: [75, 0],
            ArrowUp: [0, -75],
            ArrowDown: [0, 75],
          };
          const move = step[event.key];
          if (move) {
            event.preventDefault();
            const [lat, lng] = unproject(center[0] + move[0], center[1] + move[1], view.z);
            setView((current) => ({ ...current, lat, lng }));
          }
          if (event.key === "+" || event.key === "=") zoom(1);
          if (event.key === "-") zoom(-1);
        }}
        className={`absolute inset-0 cursor-grab touch-none bg-surface-page bg-[linear-gradient(var(--color-border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--color-border-subtle)_1px,transparent_1px)] bg-[size:48px_48px] active:cursor-grabbing ${focusRing}`}
      >
        {tiles.map((tile) => (
          <img
            key={`${view.z}/${tile.x}/${tile.y}`}
            src={TILES.replace("{z}", String(view.z)).replace("{x}", String(tile.tileX)).replace("{y}", String(tile.y))}
            alt=""
            width={256}
            height={256}
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: tile.x * 256 - left, top: tile.y * 256 - top }}
          />
        ))}

        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
          {path ? (
            <>
              <path d={path} stroke="var(--color-neutral-0)" strokeWidth={8} fill="none" strokeLinecap="round" />
              <path d={path} stroke="var(--color-brand-red)" strokeWidth={3.5} fill="none" strokeDasharray="7 6" strokeLinecap="round" />
            </>
          ) : null}

          {points.map((point) => {
            const [x, y] = at(point.lat, point.lng);
            return (
              <g key={`${point.label}-${point.lat}`} transform={`translate(${x},${y})`}>
                <circle
                  r={16}
                  fill={point.tone === "destination" ? "var(--color-neutral-900)" : "var(--color-brand-red)"}
                  stroke="var(--color-neutral-0)"
                  strokeWidth={3}
                />
                <text textAnchor="middle" dominantBaseline="central" fill="var(--color-neutral-0)" fontSize={12} fontWeight={700}>
                  {point.label}
                </text>
                {point.caption ? (
                  <g transform="translate(0,30)">
                    <rect x={-56} y={-10} width={112} height={20} rx={4} fill="var(--color-neutral-0)" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={11} fill="var(--color-neutral-900)">
                      {point.caption.length > 18 ? `${point.caption.slice(0, 17)}…` : point.caption}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <span className="pointer-events-none absolute start-3 top-3 rounded-sm border border-border-default bg-surface-card px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-text-default">
        NRW · GERMANY
      </span>

      <div className="absolute end-3 top-3 flex flex-col divide-y divide-border-subtle overflow-hidden rounded-md border border-border-default shadow-sm">
        <button type="button" className={control} onClick={() => zoom(1)} aria-label={t("plan.map.zoomIn")}>
          +
        </button>
        <button type="button" className={control} onClick={() => zoom(-1)} aria-label={t("plan.map.zoomOut")}>
          −
        </button>
        <button type="button" className={control} onClick={fit} aria-label={t("plan.map.fit")}>
          ⌖
        </button>
      </div>

      <span className="pointer-events-none absolute start-3 bottom-2 max-w-[70%] rounded-sm bg-surface-card/90 px-2 py-1 text-[10px] text-text-default">
        {TILES ? TILE_ATTRIBUTION : t("plan.map.schematic")}
      </span>
    </div>
  );
}
