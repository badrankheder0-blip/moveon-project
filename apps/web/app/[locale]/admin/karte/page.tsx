"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import { teamLabel, useFleet } from "@/app/components/admin/orders/fleet";
import { DEPOT, geoOf, simulate, straightRoute, type LatLng, type Phase, type Route } from "@/app/components/admin/orders/geo";
import styles from "@/app/components/admin/orders/orders.module.css";
import type { Vehicle } from "@/app/components/admin/orders/types";
import { SERVICE_TEXT, STATUS_TEXT, cityOf, dateTag, dayKey, type OrderStatus } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Live map: where every vehicle is, what it carries and which order it works
 * on, as the admin prototype shows it. Until the vehicles report GPS the
 * positions are simulated: each vehicle is paired with an open moving order
 * (its own assignment first) and drives depot → pickup → delivery → depot on
 * an eight-minute loop. The cargo is the order's real inventory when the
 * customer listed items.
 */

const TEXT = defineText({
  title: { de: "Live-Karte", en: "Live map", ar: "الخريطة المباشرة", tr: "Canlı harita" },
  sub: {
    de: "Wo jedes Fahrzeug gerade ist, was es geladen hat und an welchem Auftrag es arbeitet.",
    en: "Where every vehicle is right now, what it carries and which order it is working on.",
    ar: "أين كل سيارة الآن، وماذا تحمل، وعلى أي طلب تعمل.",
    tr: "Her aracın şu an nerede olduğu, ne taşıdığı ve hangi sipariş üzerinde çalıştığı.",
  },
  live: { de: "Live", en: "Live", ar: "مباشر", tr: "Canlı" },
  sim: {
    de: "Die Positionen werden aus Ihren anstehenden Aufträgen simuliert. Verbinden Sie GPS-Tracker mit Ihren Fahrzeugen, um ihren echten Standort zu sehen.",
    en: "Positions are simulated from your upcoming orders. Connect GPS trackers to your vehicles to show their real location.",
    ar: "المواقع محاكاة من طلباتك القادمة. اربط أجهزة GPS بسياراتك لتظهر مواقعها الحقيقية.",
    tr: "Konumlar yaklaşan siparişlerinizden simüle edilir. Gerçek konumlarını görmek için araçlarınıza GPS takip cihazı bağlayın.",
  },
  road: { de: "Unterwegs", en: "On the road", ar: "على الطريق", tr: "Yolda" },
  work: { de: "Laden / Entladen", en: "Loading / unloading", ar: "تحميل / تفريغ", tr: "Yükleme / boşaltma" },
  depot: { de: "Im Depot", en: "At depot", ar: "في المستودع", tr: "Depoda" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  eta: { de: "Ankunft", en: "Arrives", ar: "الوصول", tr: "Varış" },
  doneBy: { de: "Fertig um", en: "Done by", ar: "ينتهي", tr: "Bitiş" },
  min: { de: "Min.", en: "min", ar: "د", tr: "dk" },
  noJob: { de: "Kein Auftrag", en: "No order", ar: "بلا طلب", tr: "Sipariş yok" },
  stopDepot: { de: "Depot", en: "Depot", ar: "المستودع", tr: "Depo" },
  pickup: { de: "Abholung", en: "Pickup", ar: "الاستلام", tr: "Alış" },
  delivery: { de: "Lieferung", en: "Delivery", ar: "التسليم", tr: "Teslim" },
  here: { de: "Jetzt hier", en: "Here now", ar: "هنا الآن", tr: "Şu an burada" },
  next: { de: "Nächster Halt", en: "Next stop", ar: "المحطة التالية", tr: "Sonraki durak" },
  order: { de: "AUFTRAG", en: "ORDER", ar: "الطلب", tr: "SİPARİŞ" },
  cargo: { de: "LADUNG", en: "CARGO", ar: "الحمولة", tr: "YÜK" },
  route: { de: "ROUTE", en: "ROUTE", ar: "المسار", tr: "ROTA" },
  services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  calendar: { de: "Termin", en: "Calendar", ar: "التقويم", tr: "Takvim" },
  customers: { de: "Kunde", en: "Customers", ar: "الزبائن", tr: "Müşteri" },
  crew: { de: "Team", en: "Crew", ar: "الفريق", tr: "Ekip" },
  open: { de: "Auftrag öffnen", en: "Open order", ar: "فتح الطلب", tr: "Siparişi aç" },
  call: { de: "Kunden anrufen", en: "Call customer", ar: "اتصال بالزبون", tr: "Müşteriyi ara" },
  none: { de: "Keine Fahrzeuge in dieser Gruppe.", en: "No vehicles in this group right now.", ar: "لا توجد سيارات في هذه المجموعة الآن.", tr: "Bu grupta şu an araç yok." },
  noVeh: {
    de: "Legen Sie Fahrzeuge in den Einstellungen an, um sie hier zu sehen.",
    en: "Add vehicles in Settings to see them here.",
    ar: "أضف السيارات من الإعدادات لتظهر هنا.",
    tr: "Burada görmek için Ayarlar'dan araç ekleyin.",
  },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  ph_toA: { de: "Zur Abholung", en: "To pickup", ar: "إلى الاستلام", tr: "Alışa gidiyor" },
  ph_load: { de: "Lädt", en: "Loading", ar: "تحميل", tr: "Yükleniyor" },
  ph_toB: { de: "Liefert", en: "Delivering", ar: "إلى التسليم", tr: "Teslim ediyor" },
  ph_unload: { de: "Entlädt", en: "Unloading", ar: "تفريغ", tr: "Boşaltılıyor" },
  ph_back: { de: "Rückfahrt", en: "Returning", ar: "عائدة", tr: "Dönüyor" },
  ph_idle: { de: "Im Depot", en: "At depot", ar: "في المستودع", tr: "Depoda" },
  cg_onboard: { de: "An Bord", en: "On board", ar: "على متن السيارة", tr: "Araçta" },
  cg_loading: { de: "Wird geladen", en: "Loading now", ar: "قيد التحميل", tr: "Yükleniyor" },
  cg_planned: { de: "Noch zu laden", en: "To be loaded", ar: "سيتم تحميلها", tr: "Yüklenecek" },
  cg_empty: { de: "Geliefert · Fahrzeug leer", en: "Delivered · vehicle empty", ar: "تم التسليم · السيارة فارغة", tr: "Teslim edildi · araç boş" },
  i_sofa: { de: "Sofa", en: "Sofa", ar: "كنبة", tr: "Kanepe" },
  i_armchair: { de: "Sessel", en: "Armchair", ar: "كرسي بذراعين", tr: "Koltuk" },
  i_bed: { de: "Doppelbett", en: "Double bed", ar: "سرير مزدوج", tr: "Çift kişilik yatak" },
  i_wardrobe: { de: "Kleiderschrank", en: "Wardrobe", ar: "خزانة ملابس", tr: "Gardırop" },
  i_table: { de: "Esstisch", en: "Dining table", ar: "طاولة طعام", tr: "Yemek masası" },
  i_chairs: { de: "Stühle", en: "Chairs", ar: "كراسي", tr: "Sandalyeler" },
  i_washer: { de: "Waschmaschine", en: "Washing machine", ar: "غسالة", tr: "Çamaşır makinesi" },
  i_fridge: { de: "Kühlschrank", en: "Fridge", ar: "براد", tr: "Buzdolabı" },
  i_tv: { de: "Fernseher", en: "TV", ar: "تلفزيون", tr: "Televizyon" },
  i_shelf: { de: "Regal", en: "Shelf", ar: "رف", tr: "Raf" },
  i_mattress: { de: "Matratze", en: "Mattress", ar: "فرشة", tr: "Yatak şiltesi" },
  i_boxes: { de: "Umzugskartons", en: "Moving boxes", ar: "كراتين", tr: "Taşıma kolileri" },
  i_desk: { de: "Schreibtisch", en: "Desk", ar: "مكتب", tr: "Çalışma masası" },
  i_chair: { de: "Bürostuhl", en: "Office chair", ar: "كرسي مكتب", tr: "Ofis sandalyesi" },
  i_cabinet: { de: "Aktenschrank", en: "Filing cabinet", ar: "خزانة ملفات", tr: "Dosya dolabı" },
  i_monitor: { de: "Monitor", en: "Monitor", ar: "شاشة", tr: "Monitör" },
  i_printer: { de: "Drucker", en: "Printer", ar: "طابعة", tr: "Yazıcı" },
});

interface DispatchJob {
  id: string;
  reference: string;
  status: OrderStatus;
  serviceType: string;
  customerType: "private" | "business";
  contactName: string;
  contactPhone: string;
  company: string | null;
  originAddress: string;
  destinationAddress: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  teamId: string | null;
  vehicleId: string | null;
  teamName: string | null;
  teamArea: string | null;
  items: { name: string; count: number; volumeM3: number }[];
  volumeM3: number;
}

interface Zone {
  id: string;
  name: string;
  colour: string;
  polygon: [number, number][];
  isActive: boolean;
}

type Group = "road" | "work" | "depot";
const groupOf = (phase: Phase): Group => (phase === "idle" ? "depot" : phase === "load" || phase === "unload" ? "work" : "road");

/** Phase pill: label key, background, text, progress bar. */
const PHASE: Record<Phase, [string, string, string]> = {
  toA: ["#fff1f3", "#d71635", "#d71635"],
  load: ["#fbf4e4", "#5c4a00", "#ffcb08"],
  toB: ["#fff1f3", "#d71635", "#d71635"],
  unload: ["#fbf4e4", "#5c4a00", "#ffcb08"],
  back: ["#f1f1ea", "#4a514d", "#737870"],
  idle: ["#f1f1ea", "#4a514d", "#bfc4bc"],
};
const PALETTE: [string, string][] = [["#d71635", "#ffffff"], ["#252b28", "#ffffff"], ["#ffcb08", "#17191a"], ["#b7122b", "#ffffff"], ["#737870", "#ffffff"]];
const ORDER_PILL: Record<OrderStatus, [string, string]> = {
  quoted: ["#fbf4e4", "#5c4a00"],
  confirmed: ["#edf5ed", "#3f705a"],
  completed: ["#f5f5f0", "#4a514d"],
  cancelled: ["#fff1f3", "#b7122b"],
};
const TRUCK = "M1 6h13v10H1zM14 9h4l3 3v4h-7M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z";
const PHASE_ORDER: Phase[] = ["toA", "load", "toB", "unload", "back", "idle"];
const DEPOT_NAME = "Köln-Ossendorf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Leaflet = any;

/** Loads the vendored Leaflet once, for every map on the page. */
let leafletPromise: Promise<Leaflet> | null = null;
function loadLeaflet(): Promise<Leaflet> {
  const w = window as unknown as { L?: Leaflet };
  if (w.L) return Promise.resolve(w.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet="1"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/vendor/leaflet/leaflet.css";
        link.dataset.leaflet = "1";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "/vendor/leaflet/leaflet.js";
      script.onload = () => resolve(w.L);
      script.onerror = () => {
        leafletPromise = null;
        reject(new Error("Leaflet failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

/** A stable pseudo-random cargo for an order without a listed inventory, as the prototype makes one. */
function demoCargo(job: DispatchJob): { key: string; count: number }[] {
  let hash = 0;
  for (const ch of job.reference) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 4294967296;
  };
  const business = job.customerType === "business";
  const catalogue: [string, number, number][] = business
    ? [["desk", 0.9, 12], ["chair", 0.35, 14], ["cabinet", 0.8, 6], ["monitor", 0.1, 12], ["shelf", 0.9, 5], ["printer", 0.3, 3]]
    : [["sofa", 1.6, 2], ["armchair", 0.6, 2], ["bed", 1.8, 2], ["wardrobe", 2.1, 3], ["table", 0.9, 1], ["chairs", 0.25, 6], ["washer", 0.5, 1], ["fridge", 0.8, 1], ["tv", 0.2, 2], ["shelf", 0.8, 3], ["mattress", 0.5, 2]];
  const volume = Math.max(4, job.volumeM3 || 12);
  let left = volume * 0.62;
  const items: { key: string; count: number }[] = [];
  for (const [key, m3, max] of catalogue) {
    if (left <= 0) break;
    if (rnd() < 0.3) continue;
    const count = Math.max(1, Math.min(max, Math.round(rnd() * max * 0.7 + (business ? volume / 10 : 0))));
    items.push({ key, count });
    left -= count * m3;
  }
  items.push({ key: "boxes", count: Math.max(6, Math.round(volume * 2.4)) });
  return items;
}

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

export default function LiveMapPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const sx = useText(SERVICE_TEXT);
  const st = useText(STATUS_TEXT);
  const router = useRouter();
  const fleetQuery = useFleet();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);

  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Group | "all">("all");
  const [routeVersion, setRouteVersion] = useState(0);

  const dispatch = useQuery({
    queryKey: ["admin", "orders", "dispatch"],
    queryFn: () => sdk.http.get<{ jobs: DispatchJob[]; vehicles: Vehicle[] }>("/api/orders/dispatch"),
    refetchInterval: 60_000,
  });
  const zones = useQuery({
    queryKey: ["admin", "zones", "map"],
    queryFn: () =>
      sdk.http
        .get<{ zones: Zone[] }>("/api/zones")
        .then((r) => r.zones ?? [])
        .catch(() => [] as Zone[]),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  // Road routes from the public OSRM service, cached per leg; a straight line
  // stands in while it answers, and for good if it does not.
  const routes = useRef(new Map<string, Route | "pending">());
  const routeOf = useCallback((a: LatLng, b: LatLng): Route => {
    const key = `${a.map((x) => x.toFixed(4)).join(",")};${b.map((x) => x.toFixed(4)).join(",")}`;
    const cached = routes.current.get(key);
    if (cached && cached !== "pending") return cached;
    if (!cached) {
      routes.current.set(key, "pending");
      const fallback = () => {
        routes.current.set(key, straightRoute(a, b));
        setRouteVersion((v) => v + 1);
      };
      fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`)
        .then((r) => r.json())
        .then((json: { routes?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[] }) => {
          const route = json.routes?.[0];
          if (!route) return fallback();
          routes.current.set(key, { pts: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng), dist: route.distance, dur: route.duration });
          setRouteVersion((v) => v + 1);
        })
        .catch(fallback);
    }
    return straightRoute(a, b);
  }, []);

  const vehicles = fleetQuery.data?.vehicles ?? [];

  // Each vehicle with the order it works on: its own assignment first, then
  // an unassigned order, then any, so no two vehicles share an order.
  const fleet = useMemo(() => {
    const today = dayKey(new Date());
    const dateOf = (job: DispatchJob) => job.scheduledDate ?? "9999";
    const active = (dispatch.data?.jobs ?? [])
      .filter((job) => job.serviceType === "moving" && job.originAddress && job.destinationAddress)
      .sort((a, b) => Number(dateOf(a) < today) - Number(dateOf(b) < today) || dateOf(a).localeCompare(dateOf(b)));
    const used = new Set<string>();
    return vehicles.map((vehicle, index) => {
      const job =
        active.find((j) => j.vehicleId === vehicle.id && !used.has(j.id)) ?? active.find((j) => !j.vehicleId && !used.has(j.id)) ?? active.find((j) => !used.has(j.id));
      if (job) used.add(job.id);
      const [color, fg] = PALETTE[index % PALETTE.length]!;
      return { vehicle, index, color, fg, job: job ?? null, a: job ? geoOf(job.originAddress) : null, b: job ? geoOf(job.destinationAddress) : null };
    });
  }, [dispatch.data, vehicles]);

  const time = (ms: number) => new Date(ms).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });

  const cards = fleet.map((f) => {
    const sim = simulate(f.index, f.a, f.b, now, routeOf);
    const [phBg, phFg, bar] = PHASE[sim.phase];
    const driving = !!sim.route;
    const minutes = driving ? Math.max(1, Math.round((sim.route!.dur * (1 - sim.within)) / 60)) : sim.phase === "load" || sim.phase === "unload" ? Math.max(1, Math.round(50 * (1 - sim.within))) : 0;
    const capacity = Number(f.vehicle.capacityM3) || 0;
    return {
      ...f,
      sim,
      group: groupOf(sim.phase),
      phBg,
      phFg,
      bar,
      pct: `${Math.round(Math.min(1, sim.loop / 0.92) * 100)}%`,
      eta: minutes ? `${driving ? tx("eta") : tx("doneBy")} ${time(now + minutes * 60_000)} · ${minutes} ${tx("min")}` : "—",
      meta: [f.vehicle.plate, capacity ? `${capacity % 1 ? capacity.toFixed(1) : capacity} m³` : ""].filter(Boolean).join(" · "),
    };
  });

  const counts = { road: 0, work: 0, depot: 0 };
  for (const card of cards) counts[card.group] += 1;
  const visible = cards.filter((card) => filter === "all" || card.group === filter);
  const current = cards.find((card) => card.vehicle.id === selected && card.job);

  // ── The map itself ──────────────────────────────────────────────────────
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: Leaflet; L: Leaflet; zones: Leaflet; routes: Leaflet; pins: Leaflet; markers: Map<string, Leaflet>; key: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = L.map(boxRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true }).setView([51.3, 7.05], 9);
      L.control.zoom({ position: rtl ? "topleft" : "topright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", subdomains: "abc", maxZoom: 19 }).addTo(map);
      mapRef.current = { map, L, zones: L.layerGroup().addTo(map), routes: L.layerGroup().addTo(map), pins: L.layerGroup().addTo(map), markers: new Map(), key: "" };
      setTimeout(() => map.invalidateSize(), 80);
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.map.remove();
      mapRef.current = null;
    };
  }, [rtl]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    m.zones.clearLayers();
    for (const zone of zones.data ?? []) {
      if (!zone.polygon || zone.polygon.length < 3) continue;
      m.L.polygon(zone.polygon, {
        color: zone.colour,
        weight: 1,
        opacity: zone.isActive === false ? 0.45 : 0.9,
        dashArray: zone.isActive === false ? "6 6" : null,
        fillColor: zone.colour,
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(m.zones);
    }
  }, [zones.data, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    const { L, map } = m;
    const icon = (c: (typeof cards)[number], on: boolean) =>
      L.divIcon({
        className: "",
        iconSize: [0, 0],
        html:
          `<div style="position:relative;transform:translate(-50%,-50%);cursor:pointer"><div style="width:${on ? 44 : 34}px;height:${on ? 44 : 34}px;border-radius:50%;background:${c.color};color:${c.fg};display:grid;place-items:center;border:2px solid #ffffff;box-shadow:0 0 0 ${on ? 7 : 3}px ${c.color}38,0 6px 16px #0000003d">` +
          `<svg width="${on ? 21 : 17}" height="${on ? 21 : 17}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${TRUCK}"/></svg></div>` +
          `<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:5px;padding:2px 8px;border-radius:999px;background:#ffffff;box-shadow:0 2px 8px #00000029;font:600 10.5px Geist,sans-serif;color:#252b28;white-space:nowrap">${esc(c.vehicle.name)}</div></div>`,
      });

    const seen = new Set<string>();
    for (const c of cards) {
      const id = c.vehicle.id;
      const on = selected === id;
      seen.add(id);
      let marker = m.markers.get(id);
      if (!marker) {
        marker = L.marker(c.sim.pos, { icon: icon(c, on), zIndexOffset: on ? 1000 : 0 }).addTo(map);
        marker.on("click", () => setSelected((s) => (s === id ? null : id)));
        marker._state = `${on}${c.color}${c.vehicle.name}`;
        m.markers.set(id, marker);
      } else {
        marker.setLatLng(c.sim.pos);
        const state = `${on}${c.color}${c.vehicle.name}`;
        if (marker._state !== state) {
          marker.setIcon(icon(c, on));
          marker.setZIndexOffset(on ? 1000 : 0);
          marker._state = state;
        }
      }
    }
    for (const [id, marker] of m.markers) {
      if (!seen.has(id)) {
        marker.remove();
        m.markers.delete(id);
      }
    }

    // Routes and pins only change with the phase, the selection or a new road route.
    const key = [selected ?? "", routeVersion, ...cards.map((c) => `${c.vehicle.id}${c.sim.phase}${c.job?.id ?? ""}`)].join("|");
    if (key === m.key) return;
    m.key = key;
    m.routes.clearLayers();
    m.pins.clearLayers();
    const pin = (p: LatLng, text: string, bg: string, fg: string) =>
      L.marker(p, {
        interactive: false,
        icon: L.divIcon({
          className: "",
          iconSize: [0, 0],
          html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center"><div style="min-width:26px;height:26px;padding:0 7px;border-radius:13px;background:${bg};color:${fg};display:grid;place-items:center;font:700 11px Geist,sans-serif;border:2px solid #ffffff;box-shadow:0 4px 12px #00000033">${text}</div><i style="display:block;width:2px;height:8px;background:${bg}"></i></div>`,
        }),
      }).addTo(m.pins);
    pin(DEPOT, "m.on", "#252b28", "#ffffff");
    for (const c of cards) {
      if (!c.job || !c.a || !c.b) continue;
      const stroke = c.color === "#ffcb08" ? "#c79a00" : c.color;
      if (selected === c.vehicle.id) {
        const at = PHASE_ORDER.indexOf(c.sim.phase);
        const legs: [LatLng, LatLng, Phase][] = [[DEPOT, c.a, "toA"], [c.a, c.b, "toB"], [c.b, DEPOT, "back"]];
        for (const [from, to, phase] of legs) {
          const index = PHASE_ORDER.indexOf(phase);
          const done = index < at;
          const now2 = index === at;
          L.polyline(routeOf(from, to).pts, { color: done ? "#9aa19a" : stroke, weight: now2 ? 5 : 3, opacity: done ? 0.55 : now2 ? 0.95 : 0.6, dashArray: now2 || done ? null : "7 8" }).addTo(m.routes);
        }
        pin(c.a, "A", "#d71635", "#ffffff");
        pin(c.b, "B", "#ffcb08", "#17191a");
      } else if (c.sim.route) {
        L.polyline(c.sim.route.pts, { color: stroke, weight: 2.5, opacity: 0.45 }).addTo(m.routes);
      }
    }
  });

  const select = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    const card = cards.find((c) => c.vehicle.id === id);
    const m = mapRef.current;
    if (next && m && card?.a && card.b) m.map.flyToBounds(m.L.latLngBounds([DEPOT, card.a, card.b]), { padding: [70, 70], duration: 0.8, maxZoom: 12 });
  };

  // ── The selected vehicle ────────────────────────────────────────────────
  const panel = (() => {
    if (!current || !current.job) return null;
    const job = current.job;
    const phase = current.sim.phase;
    const at = { toA: 1, load: 1, toB: 2, unload: 2, back: 3, idle: 3 }[phase];
    const atStop = phase === "load" || phase === "unload" || phase === "idle";
    const stops = [
      [tx("stopDepot"), DEPOT_NAME],
      [tx("pickup"), job.originAddress],
      [tx("delivery"), job.destinationAddress ?? ""],
      [tx("stopDepot"), DEPOT_NAME],
    ].map(([label, addr], i) => {
      const done = i < at || (i === at && phase === "idle");
      const cur = i === at && phase !== "idle";
      return { label, addr, done, cur, dotBg: done ? "#d71635" : "#ffffff", dotBd: done || cur ? "#d71635" : "#cfd3d7", ring: cur ? "0 0 0 4px #d7163526" : "none", note: cur ? (atStop ? tx("here") : tx("next")) : "", line: i < 3, lineBg: i < at ? "#d71635" : "#e3e5de", op: done && !cur ? 0.72 : 1 };
    });

    const cargoState = phase === "toB" || phase === "unload" ? "onboard" : phase === "load" ? "loading" : phase === "toA" ? "planned" : "empty";
    const cargoPill = { onboard: ["#edf5ed", "#3f705a"], loading: ["#fbf4e4", "#5c4a00"], planned: ["#f1f1ea", "#4a514d"], empty: ["#f1f1ea", "#737870"] }[cargoState]!;
    const items = job.items.length
      ? job.items.map((item) => ({ label: item.name, count: item.count }))
      : demoCargo(job).map((item) => ({ label: tx(`i_${item.key}` as "i_sofa"), count: item.count }));
    const volume = job.volumeM3 || Math.max(4, 12);
    const capacity = Number(current.vehicle.capacityM3) || 1;
    const loaded = cargoState === "loading" ? Math.max(1, Math.round(items.length * current.sim.within)) : 0;
    const [stBg, stFg] = ORDER_PILL[job.status];
    const when = [job.scheduledDate ? new Date(`${job.scheduledDate}T12:00:00`).toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }) : "", job.scheduledTime?.slice(0, 5) ?? ""].filter(Boolean).join(" · ");

    return { job, stops, cargoState, cargoPill, items, volume, capacity, loaded, stBg, stFg, when };
  })();

  const eyebrow = { fontSize: 9.5, fontWeight: 650, letterSpacing: rtl ? 0 : "1.5px", color: "#92958e" } as const;
  const cardBox = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308" } as const;
  const truck = (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRUCK} />
    </svg>
  );

  return (
    <AdminShell view="map">
      <section data-screen-label="Live map" className={styles.mapWrap} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6, maxWidth: 620 }}>{tx("sub")}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([[counts.road, tx("road"), "#d71635"], [counts.work, tx("work"), "#ffcb08"], [counts.depot, tx("depot"), "#bfc4bc"]] as const).map(([n, label, dot]) => (
              <div key={label} style={{ ...cardBox, display: "flex", alignItems: "center", gap: 10, flex: "none", minHeight: 46, padding: "0 16px" }}>
                <i style={{ display: "block", width: 9, height: 9, borderRadius: "50%", background: dot }} />
                <b style={{ fontSize: 19, fontWeight: 650 }}>{n}</b>
                <span style={{ fontSize: 12, color: "#737870", whiteSpace: "nowrap" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapGrid}>
          <div className={styles.mapBox} style={{ position: "relative", minWidth: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #e3e5de", boxShadow: "0 12px 36px #202a2308", background: "#eef0ea" }}>
            <div ref={boxRef} dir="ltr" style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 800, display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 13px", borderRadius: 999, background: "#ffffff", boxShadow: "0 4px 14px #0000001f", fontSize: 12, fontWeight: 650, color: "#252b28", pointerEvents: "none" }}>
              <i className={styles.liveDot} style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "#3f9e63", boxShadow: "0 0 0 3px #3f9e6333" }} />
              {tx("live")}
              <span style={{ color: "#92958e", fontWeight: 500 }}>{time(now)}</span>
            </div>
            <div style={{ position: "absolute", bottom: 26, insetInlineStart: 12, zIndex: 800, maxWidth: "min(400px, calc(100% - 24px))", padding: "8px 12px", borderRadius: 10, background: "#ffffffeb", boxShadow: "0 4px 14px #00000014", fontSize: 11, color: "#4a514d", lineHeight: 1.5, pointerEvents: "none" }}>
              {tx("sim")}
            </div>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([["all", tx("all"), cards.length], ["road", tx("road"), counts.road], ["work", tx("work"), counts.work], ["depot", tx("depot"), counts.depot]] as const).map(([key, label, n]) => {
                const on = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 32, padding: "0 12px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    {label}
                    <span style={{ opacity: 0.7 }}>{n}</span>
                  </button>
                );
              })}
            </div>

            {current && panel ? (
              <div style={{ ...cardBox, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ width: 40, height: 40, borderRadius: "50%", background: current.color, color: current.fg, display: "grid", placeItems: "center", flex: "none", boxShadow: "0 0 0 4px #f1f1ea" }}>{truck(17)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15, fontWeight: 650 }}>{current.vehicle.name}</b>
                    {current.vehicle.plate ? <span style={{ font: "11px ui-monospace,Menlo,monospace", color: "#737870" }}>{current.vehicle.plate}</span> : null}
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: current.phBg, color: current.phFg, fontSize: 11, fontWeight: 650, whiteSpace: "nowrap" }}>{tx(`ph_${current.sim.phase}`)}</span>
                  <button type="button" className={styles.ghostIcon} onClick={() => setSelected(null)} aria-label={tx("close")} title={tx("close")} style={{ width: 30, height: 30, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "transparent", color: "#737870", padding: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ ...eyebrow, marginBottom: 6 }}>
                    {tx("route")} · {current.eta}
                  </span>
                  {panel.stops.map((stop, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr)", gap: 10, opacity: stop.op }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <i style={{ display: "block", width: 12, height: 12, marginTop: 3, borderRadius: "50%", background: stop.dotBg, border: `2px solid ${stop.dotBd}`, boxShadow: stop.ring, flex: "none" }} />
                        {stop.line ? <i style={{ display: "block", width: 2, flex: 1, minHeight: 14, margin: "3px 0", background: stop.lineBg, borderRadius: 2 }} /> : null}
                      </div>
                      <div style={{ paddingBottom: 8, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <b style={{ fontSize: 12.5, fontWeight: 650 }}>{stop.label}</b>
                          {stop.note ? <span style={{ padding: "1px 7px", borderRadius: 999, background: "#fff1f3", color: "#d71635", fontSize: 10, fontWeight: 650 }}>{stop.note}</span> : null}
                        </div>
                        <span style={{ display: "block", fontSize: 12, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stop.addr}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid #eef0ea" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={eyebrow}>{tx("order")}</span>
                    <span style={{ padding: "3px 9px", borderRadius: 999, background: panel.stBg, color: panel.stFg, fontSize: 10.5, fontWeight: 650 }}>{st(panel.job.status)}</span>
                  </div>
                  <b style={{ fontSize: 14, fontWeight: 650 }}>
                    <bdi dir="ltr">{panel.job.reference}</bdi>
                  </b>
                  <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 14px", fontSize: 12.5 }}>
                    <span style={{ color: "#92958e" }}>{tx("services")}</span>
                    <span>{panel.job.serviceType in SERVICE_TEXT ? sx(panel.job.serviceType as keyof typeof SERVICE_TEXT) : panel.job.serviceType}</span>
                    <span style={{ color: "#92958e" }}>{tx("calendar")}</span>
                    <span>{panel.when || "—"}</span>
                    <span style={{ color: "#92958e" }}>{tx("customers")}</span>
                    <span>
                      {panel.job.contactName} {panel.job.company ? <span style={{ color: "#737870" }}>{panel.job.company}</span> : null}
                    </span>
                    <span style={{ color: "#92958e" }}>{tx("crew")}</span>
                    <span>{teamLabel(panel.job.teamName ? { name: panel.job.teamName, area: panel.job.teamArea } : null) || "—"}</span>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid #eef0ea" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={eyebrow}>{tx("cargo")}</span>
                    <span style={{ padding: "3px 9px", borderRadius: 999, background: panel.cargoPill[0], color: panel.cargoPill[1], fontSize: 10.5, fontWeight: 650 }}>{tx(`cg_${panel.cargoState}` as "cg_onboard")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span dir="ltr" style={{ flex: 1, height: 6, borderRadius: 6, background: "#eef0ea", overflow: "hidden" }}>
                      <i style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((panel.volume / panel.capacity) * 100))}%`, background: panel.volume > panel.capacity ? "#d71635" : "#252b28", borderRadius: 6 }} />
                    </span>
                    <b dir="ltr" style={{ fontSize: 12, fontWeight: 650, whiteSpace: "nowrap" }}>
                      {panel.volume} / {panel.capacity} m³
                    </b>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "4px 14px" }}>
                    {panel.items.map((item, i) => {
                      const loaded = panel.cargoState === "onboard" || (panel.cargoState === "loading" && i < panel.loaded);
                      const faded = panel.cargoState === "empty" || (panel.cargoState === "loading" && i >= panel.loaded);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 24, fontSize: 12.5, opacity: faded ? 0.45 : 1 }}>
                          <i style={{ display: "block", width: 7, height: 7, borderRadius: 2, background: loaded ? "#3f705a" : "#cfd3d7", flex: "none" }} />
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                          <b style={{ fontWeight: 650, color: "#4a514d" }}>× {item.count}</b>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className={styles.redBtn} onClick={() => router.push(`/${locale}${ADMIN_PATHS.orders}/${panel.job.id}`)} style={{ flex: "1 1 140px", minHeight: 38, border: 0, borderRadius: 9, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 650 }}>
                    {tx("open")}
                  </button>
                  {panel.job.contactPhone ? (
                    <a href={`tel:${panel.job.contactPhone.replace(/\s/g, "")}`} className={styles.callBtn} style={{ flex: "1 1 120px", display: "grid", placeItems: "center", minHeight: 38, border: "1px solid #e3e5de", borderRadius: 9, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
                      {tx("call")}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {visible.map((c) => {
              const on = selected === c.vehicle.id;
              return (
                <button
                  key={c.vehicle.id}
                  type="button"
                  className={styles.mapCard}
                  onClick={() => select(c.vehicle.id)}
                  style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", padding: 14, border: `1px solid ${on ? c.color : "#e3e5de"}`, borderRadius: 12, background: "#ffffff", boxShadow: on ? "0 10px 26px #202a2314" : "none", textAlign: "start", color: "#1d2220", transition: "border-color .15s,box-shadow .15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", background: c.color, color: c.fg, display: "grid", placeItems: "center", flex: "none" }}>{truck(17)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 13.5, fontWeight: 650 }}>{c.vehicle.name}</b>
                      {c.meta ? <span style={{ font: "11px ui-monospace,Menlo,monospace", color: "#737870" }}>{c.meta}</span> : null}
                    </div>
                    <span style={{ padding: "4px 9px", borderRadius: 999, background: c.phBg, color: c.phFg, fontSize: 10.5, fontWeight: 650, whiteSpace: "nowrap" }}>{tx(`ph_${c.sim.phase}`)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: "#4a514d", width: "100%" }}>
                    <span>
                      <b style={{ fontWeight: 650, color: "#252b28" }}>{c.job ? <bdi dir="ltr">{c.job.reference}</bdi> : tx("noJob")}</b>
                      {c.job ? ` · ${c.job.contactName}` : ""}
                    </span>
                    {c.job ? <span style={{ color: "#737870" }}>{`${cityOf(c.job.originAddress) || c.job.originAddress} → ${cityOf(c.job.destinationAddress) || c.job.destinationAddress}`}</span> : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <span dir="ltr" style={{ flex: 1, height: 5, borderRadius: 5, background: "#eef0ea", overflow: "hidden", transform: rtl ? "scaleX(-1)" : undefined }}>
                      <i style={{ display: "block", height: "100%", width: c.pct, background: c.bar, borderRadius: 5, transition: "width 1.8s linear" }} />
                    </span>
                    <span style={{ fontSize: 11, color: "#737870", whiteSpace: "nowrap" }}>{c.eta}</span>
                  </div>
                </button>
              );
            })}

            {cards.length > 0 && visible.length === 0 ? <p style={{ ...cardBox, padding: 18, fontSize: 12.5, color: "#737870", textAlign: "center" }}>{tx("none")}</p> : null}
            {!fleetQuery.isLoading && cards.length === 0 ? <p style={{ ...cardBox, padding: 18, fontSize: 12.5, color: "#737870", textAlign: "center" }}>{tx("noVeh")}</p> : null}
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}
