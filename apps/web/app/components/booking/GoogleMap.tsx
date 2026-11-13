"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useI18n } from "@/lib/i18n/provider";
import {
  NRW_CENTER,
  addressAt,
  findAddress,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  type GoogleMap,
  type GoogleMapsApi,
  type GoogleMarker,
  type LatLngLiteral,
} from "@/lib/booking/googleMaps";
import type { AddressCandidate } from "@/lib/booking/lookups";
import type { PlanAddress } from "@/lib/booking/plan";
import type { MapPoint } from "./PlanMap";
import { Dialog, ErrorText, Icon, inputClass, primaryButton, secondaryButton } from "./ui";

/**
 * The address step's two Google Maps surfaces: the route overview beside the
 * address fields, and the dialog where a customer drops a pin on their door.
 *
 * Both are only rendered when a key is configured (`googleMapsEnabled`); the
 * address step falls back to its schematic map otherwise.
 */

function useGoogleMaps() {
  const { locale } = useI18n();
  const [maps, setMaps] = useState<GoogleMapsApi | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGoogleMaps(locale)
      .then((api) => alive && setMaps(api))
      .catch(() => alive && setFailed(true));
    const stop = onGoogleMapsAuthFailure(() => alive && setFailed(true));
    return () => {
      alive = false;
      stop();
    };
  }, [locale]);

  return { maps, failed };
}

const markerIcon = (maps: GoogleMapsApi, destination: boolean) => ({
  path: maps.SymbolPath.CIRCLE,
  scale: 13,
  fillColor: destination ? "#171717" : "#d71635",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
});

/** A and B on Google's map, joined by the same dashed line the schematic map draws. */
export function GoogleRouteMap({ points, line = false }: { points: MapPoint[]; line?: boolean }) {
  const { t } = useI18n();
  const { maps, failed } = useGoogleMaps();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GoogleMap | null>(null);
  const drawn = useRef<Array<{ setMap(map: GoogleMap | null): void }>>([]);
  // Redrawn when the places change, not on every render of the step around it.
  const signature = points.map((point) => `${point.label}:${point.lat},${point.lng}`).join("|");

  useEffect(() => {
    if (!maps || !host.current) return;

    map.current ??= new maps.Map(host.current, {
      center: NRW_CENTER,
      zoom: 8,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "cooperative",
    });

    for (const shape of drawn.current) shape.setMap(null);
    drawn.current = [];

    const bounds = new maps.LatLngBounds();

    for (const point of points) {
      drawn.current.push(
        new maps.Marker({
          map: map.current,
          position: { lat: point.lat, lng: point.lng },
          label: { text: point.label, color: "#ffffff", fontWeight: "700", fontSize: "12px" },
          icon: markerIcon(maps, point.tone === "destination"),
          title: point.caption,
        }),
      );
      bounds.extend({ lat: point.lat, lng: point.lng });
    }

    if (line && points.length === 2) {
      drawn.current.push(
        new maps.Polyline({
          map: map.current,
          path: points.map((point) => ({ lat: point.lat, lng: point.lng })),
          geodesic: true,
          strokeOpacity: 0,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#d71635", scale: 3 },
              offset: "0",
              repeat: "14px",
            },
          ],
        }),
      );
    }

    if (points.length === 1) {
      map.current.setCenter({ lat: points[0]!.lat, lng: points[0]!.lng });
      map.current.setZoom(15);
    } else if (points.length > 1) {
      map.current.fitBounds(bounds, 64);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, signature, line]);

  if (failed) {
    return (
      <p role="status" className="grid h-[300px] place-items-center px-6 text-center text-body-sm text-text-default md:h-[340px]">
        {t("plan.map.loadFailed")}
      </p>
    );
  }

  return <div ref={host} role="region" aria-label={t("plan.map.label")} className="h-[300px] w-full bg-surface-sunken md:h-[340px]" />;
}

/**
 * Drop a pin on the entrance; the address under it is what gets saved.
 *
 * Search jumps the pin to typed text, a click on the map moves it, and it can
 * be dragged. Every move asks Google which street address is under the pin,
 * and the confirm button stays off until that address is inside NRW.
 */
export function MapPickerDialog({
  title,
  address,
  onConfirm,
  onClose,
}: {
  title: string;
  address: PlanAddress | undefined;
  onConfirm: (address: AddressCandidate) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { maps, failed } = useGoogleMaps();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<GoogleMap | null>(null);
  const marker = useRef<GoogleMarker | null>(null);
  const ticket = useRef(0);

  const [picked, setPicked] = useState<AddressCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const start: LatLngLiteral | null =
    typeof address?.lat === "number" && typeof address.lng === "number" ? { lat: address.lat, lng: address.lng } : null;

  async function resolve(point: LatLngLiteral) {
    if (!maps) return;
    const mine = ++ticket.current;
    setBusy(true);
    setError("");

    try {
      const found = await addressAt(maps, point);
      if (mine !== ticket.current) return;
      setPicked(found);
      if (!found) setError(t("plan.map.notFound"));
      else if (!found.nrw) setError(t("plan.address.outsideNrw"));
    } catch {
      if (mine === ticket.current) setError(t("plan.map.lookupFailed"));
    } finally {
      if (mine === ticket.current) setBusy(false);
    }
  }

  function moveTo(point: LatLngLiteral, zoom?: number) {
    marker.current?.setPosition(point);
    map.current?.setCenter(point);
    if (zoom) map.current?.setZoom(zoom);
    void resolve(point);
  }

  useEffect(() => {
    if (!maps || !host.current || map.current) return;

    map.current = new maps.Map(host.current, {
      center: start ?? NRW_CENTER,
      zoom: start ? 18 : 8,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    marker.current = new maps.Marker({
      map: map.current,
      position: start ?? NRW_CENTER,
      draggable: true,
      icon: markerIcon(maps, false),
    });

    map.current.addListener("click", (event) => {
      if (!event.latLng) return;
      moveTo({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    marker.current.addListener("dragend", () => {
      const position = marker.current?.getPosition();
      if (position) void resolve({ lat: position.lat(), lng: position.lng() });
    });

    if (start) void resolve(start);
    // The map is built once; later answers move the pin instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!maps || query.trim().length < 3) return;

    setBusy(true);
    setError("");

    try {
      const found = await findAddress(maps, query.trim());
      if (!found) {
        setError(t("plan.address.noResults"));
        setBusy(false);
        return;
      }
      moveTo({ lat: found.lat, lng: found.lng }, 18);
    } catch {
      setError(t("plan.map.lookupFailed"));
      setBusy(false);
    }
  }

  const usable = picked && picked.nrw && !busy;

  return (
    <Dialog
      wide
      title={title}
      kicker={t("plan.map.kicker")}
      onClose={onClose}
      closeLabel={t("plan.close")}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className={primaryButton} disabled={!usable} onClick={() => picked && onConfirm(picked)}>
            <Icon name="check" size={16} />
            {t("plan.map.use")}
          </button>
        </>
      }
    >
      <form onSubmit={search} className="flex gap-2">
        <label htmlFor="map-search" className="sr-only">
          {t("plan.map.searchLabel")}
        </label>
        <input
          id="map-search"
          className={inputClass}
          value={query}
          placeholder={t("plan.address.placeholder")}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <button type="submit" className={secondaryButton} disabled={!maps || query.trim().length < 3}>
          <Icon name="search" size={15} />
          {t("plan.map.search")}
        </button>
      </form>

      {failed ? (
        <p role="status" className="rounded-md bg-surface-sunken px-4 py-10 text-center text-body-sm text-text-default">
          {t("plan.map.loadFailed")}
        </p>
      ) : (
        <div ref={host} className="h-[360px] w-full overflow-hidden rounded-lg bg-surface-sunken" aria-label={t("plan.map.pickHint")} role="region" />
      )}

      <div className="flex min-h-12 items-start gap-2.5 rounded-md border border-border-subtle px-3 py-2.5" aria-live="polite">
        <span className="mt-0.5 text-brand-red">
          <Icon name="pin" size={16} />
        </span>
        <span className="flex flex-col gap-0.5 text-body-sm">
          {busy ? (
            <span className="text-text-muted">{t("plan.map.resolving")}</span>
          ) : picked ? (
            <>
              <b className="text-text-heading">{picked.line1}</b>
              <span className="text-caption text-text-default">{picked.line2}</span>
            </>
          ) : (
            <span className="text-text-default">{t("plan.map.pickHint")}</span>
          )}
        </span>
      </div>

      <ErrorText>{error}</ErrorText>
    </Dialog>
  );
}
