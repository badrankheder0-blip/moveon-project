"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { useDrafts } from "@/lib/admin/drafts";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

import { CITIES, POSTCODE_CITY, areaKm2, cityName, inside, type Point } from "./geo";
import { loadLeaflet, type Leaflet } from "./leaflet";
import styles from "./page.module.css";

/**
 * Service zones, as the admin prototype draws them: a map where each area
 * the company serves is a polygon (click to place corners; drag a corner of
 * the selected zone to move it), and beside it the zones with their name,
 * colour, postcode prefixes, travel surcharge and on/off switch, a checker
 * for a city or postcode, and the coverage of the NRW cities.
 *
 * Zones are configuration: each is one draft (domain "zones", ref = its id,
 * or "new:<uuid>" for one drawn since the last publish) and the website's
 * postcode check and the planner see it after "Save & publish".
 */

const TEXT = defineText({
  znTitle: { de: "Servicegebiete", en: "Service zones", ar: "مناطق الخدمة", tr: "Hizmet bölgeleri" },
  znSub: {
    de: "Zeichne die Gebiete, die du bedienst, auf der Karte ein und lege für jedes Gebiet einen Anfahrtszuschlag und Postleitzahlen fest.",
    en: "Draw the areas you serve on the map and set a travel surcharge and postcodes for each zone.",
    ar: "ارسم المناطق التي تخدمها على الخريطة، وحدّد رسوم التنقل والرموز البريدية لكل منطقة.",
    tr: "Hizmet verdiğiniz bölgeleri haritada çizin ve her bölge için yol ücreti ile posta kodlarını belirleyin.",
  },
  znNew: { de: "Neues Gebiet", en: "New zone", ar: "منطقة جديدة", tr: "Yeni bölge" },
  znDrawHint: {
    de: "Klicke auf die Karte, um die Ecken des Gebiets zu setzen.",
    en: "Click on the map to place the corners of the zone.",
    ar: "اضغط على الخريطة لتحديد زوايا المنطقة.",
    tr: "Bölgenin köşelerini yerleştirmek için haritaya tıklayın.",
  },
  znPoints: { de: "{n} Punkte", en: "{n} points", ar: "{n} نقاط", tr: "{n} nokta" },
  znUndo: { de: "Rückgängig", en: "Undo", ar: "تراجع", tr: "Geri al" },
  znCancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  znFinish: { de: "Gebiet speichern", en: "Save zone", ar: "حفظ المنطقة", tr: "Bölgeyi kaydet" },
  znZones: { de: "GEBIETE", en: "ZONES", ar: "المناطق", tr: "BÖLGELER" },
  znEmpty: {
    de: "Noch keine Gebiete. Klicke auf „Neues Gebiet“ und zeichne es auf der Karte.",
    en: "No zones yet. Click “New zone” and draw it on the map.",
    ar: "لا توجد مناطق بعد. اضغط «منطقة جديدة» وارسمها على الخريطة.",
    tr: "Henüz bölge yok. “Yeni bölge”ye tıklayın ve haritada çizin.",
  },
  znShow: { de: "Auf der Karte zeigen", en: "Show on map", ar: "عرض على الخريطة", tr: "Haritada göster" },
  znRedraw: { de: "Neu zeichnen", en: "Redraw", ar: "إعادة الرسم", tr: "Yeniden çiz" },
  znDelete: { de: "Löschen", en: "Delete", ar: "حذف", tr: "Sil" },
  znDelAsk: { de: "Dieses Gebiet löschen?", en: "Delete this zone?", ar: "حذف هذه المنطقة؟", tr: "Bu bölge silinsin mi?" },
  znFee: { de: "Anfahrtszuschlag (€)", en: "Travel surcharge (€)", ar: "رسوم التنقل (€)", tr: "Yol ücreti (€)" },
  znPlz: { de: "Postleitzahlen (Anfang)", en: "Postcodes (first digits)", ar: "الرموز البريدية (أول الأرقام)", tr: "Posta kodları (ilk haneler)" },
  znOff: { de: "Aus", en: "Off", ar: "متوقفة", tr: "Kapalı" },
  znOnOff: { de: "Gebiet aktiv", en: "Zone active", ar: "المنطقة فعّالة", tr: "Bölge etkin" },
  znName: { de: "Name des Gebiets", en: "Zone name", ar: "اسم المنطقة", tr: "Bölge adı" },
  znMeta: { de: "{n} Städte · {a} km²", en: "{n} cities · {a} km²", ar: "{n} مدن · {a} km²", tr: "{n} şehir · {a} km²" },
  znTest: { de: "STADT ODER PLZ PRÜFEN", en: "CHECK A CITY OR POSTCODE", ar: "افحص مدينة أو رمزاً بريدياً", tr: "ŞEHİR VEYA POSTA KODU KONTROL ET" },
  znTestPh: { de: "z. B. Bochum oder 44787", en: "e.g. Bochum or 44787", ar: "مثلاً Bochum أو 44787", tr: "örn. Bochum veya 44787" },
  znIn: { de: "{place} liegt in {zone}", en: "{place} is in {zone}", ar: "{place} ضمن {zone}", tr: "{place}, {zone} bölgesinde" },
  znFree: { de: "kein Zuschlag", en: "no surcharge", ar: "بدون رسوم", tr: "ek ücret yok" },
  znOutside: { de: "Außerhalb aller Gebiete", en: "Outside all zones", ar: "خارج كل المناطق", tr: "Tüm bölgelerin dışında" },
  znNotFound: {
    de: "Stadt nicht gefunden. Versuche eine größere Stadt oder eine PLZ.",
    en: "City not found. Try a larger city or a postcode.",
    ar: "لم نجد المدينة. جرّب مدينة أكبر أو رمزاً بريدياً.",
    tr: "Şehir bulunamadı. Daha büyük bir şehir veya posta kodu deneyin.",
  },
  znCoverage: { de: "ABDECKUNG", en: "COVERAGE", ar: "التغطية", tr: "KAPSAMA" },
  znNewName: { de: "Gebiet", en: "Zone", ar: "منطقة", tr: "Bölge" },
  edited: { de: "Nicht veröffentlicht", en: "Unpublished", ar: "غير منشور", tr: "Yayınlanmadı" },
  badFee: { de: "Gib einen Betrag wie 25 oder 25,50 ein.", en: "Enter an amount like 25 or 25.50.", ar: "أدخل مبلغاً مثل 25 أو 25.50.", tr: "25 veya 25,50 gibi bir tutar girin." },
  needName: { de: "Ein Gebiet braucht einen Namen.", en: "A zone needs a name.", ar: "المنطقة تحتاج إلى اسم.", tr: "Bölgenin bir adı olmalı." },
  moveCorner: { de: "Ziehen, um die Ecke zu verschieben", en: "Drag to move this corner", ar: "اسحب لتحريك هذه الزاوية", tr: "Köşeyi taşımak için sürükleyin" },
  mapFailed: { de: "Die Karte konnte nicht geladen werden.", en: "The map could not be loaded.", ar: "تعذّر تحميل الخريطة.", tr: "Harita yüklenemedi." },
  saveFailed: { de: "Die Änderung konnte nicht gespeichert werden.", en: "The change could not be saved.", ar: "تعذّر حفظ التغيير.", tr: "Değişiklik kaydedilemedi." },
  loadFailed: { de: "Die Gebiete konnten nicht geladen werden.", en: "The zones could not be loaded.", ar: "تعذّر تحميل المناطق.", tr: "Bölgeler yüklenemedi." },
  retry: { de: "Erneut versuchen", en: "Try again", ar: "حاول مجدداً", tr: "Tekrar dene" },
});

type Tx = ReturnType<typeof useText<typeof TEXT>>;

/** The prototype's six zone colours. */
const SWATCHES = ["#d71635", "#ffcb08", "#252b28", "#8a8f87", "#e06a2c", "#2f7d6d"];
const PLUS = "M12 5v14M5 12h14";

interface ZoneValue {
  name: string;
  colour: string;
  polygon: Point[];
  postcodePrefixes: string[];
  surcharge: string;
  isActive: boolean;
  sortOrder: number;
}

interface Zone extends ZoneValue {
  /** The draft ref: the zone's id, or "new:<uuid>". */
  ref: string;
}

type DraftValue = ZoneValue | { deleted: true };
const isDeleted = (value: unknown): value is { deleted: true } => Boolean(value && typeof value === "object" && "deleted" in value);

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));

const feeNumber = (fee: string) => Number.parseFloat(fee) || 0;
/** Yellow lines vanish on the map's pale tiles; the prototype darkens them. */
const ink = (colour: string) => (colour.toLowerCase() === "#ffcb08" ? "#c79a00" : colour);

/** The active zone a postcode belongs to, by longest prefix (as the API matches). */
function zoneByPostcode(zones: Zone[], postcode: string): Zone | undefined {
  let best: { zone: Zone; length: number } | undefined;
  for (const zone of zones) {
    if (!zone.isActive) continue;
    for (const prefix of zone.postcodePrefixes) {
      if (postcode.startsWith(prefix) && (!best || prefix.length > best.length)) best = { zone, length: prefix.length };
    }
  }
  return best?.zone;
}

const zoneAt = (zones: Zone[], point: Point) => zones.find((zone) => zone.isActive && inside(point, zone.polygon));

export default function ZonesPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const drafts = useDrafts("zones");
  const rtl = LOCALE_META[locale].dir === "rtl";

  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<{ ref: string | null; pts: Point[] } | null>(null);
  const [focus, setFocus] = useState<{ ref: string; n: number } | null>(null);
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState<Record<string, DraftValue>>({});

  const live = useQuery({
    queryKey: ["admin", "zones"],
    queryFn: () => sdk.http.get<{ zones: (ZoneValue & { id: string })[] }>("/api/zones"),
  });

  const zones = useMemo(() => {
    const rows = live.data?.zones ?? [];
    const refs = [...new Set([...rows.map((row) => row.id), ...[...drafts.drafts.keys()].filter((ref) => ref.startsWith("new:")), ...Object.keys(local)])];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const out: Zone[] = [];
    for (const ref of refs) {
      const draft = (local[ref] ?? drafts.drafts.get(ref)) as DraftValue | undefined;
      if (isDeleted(draft)) continue;
      const base = byId.get(ref);
      if (draft) out.push({ ...draft, ref });
      else if (base) {
        const { id, ...value } = base;
        out.push({ ...value, ref: id });
      }
    }
    return out.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [live.data, drafts.drafts, local]);

  async function write(ref: string, value: DraftValue) {
    setLocal((current) => ({ ...current, [ref]: value }));
    try {
      await drafts.set(ref, value);
    } catch (error) {
      toast(error instanceof ApiError && error.message ? error.message : tx("saveFailed"));
    } finally {
      setLocal((current) => {
        if (current[ref] !== value) return current;
        const next = { ...current };
        delete next[ref];
        return next;
      });
    }
  }

  const update = (ref: string, patch: Partial<ZoneValue>) => {
    const zone = zones.find((entry) => entry.ref === ref);
    if (!zone) return;
    const { ref: _ref, ...value } = { ...zone, ...patch };
    void _ref;
    void write(ref, value);
  };

  function remove(zone: Zone) {
    if (!window.confirm(tx("znDelAsk"))) return;
    setSelected(null);
    if (zone.ref.startsWith("new:")) void drafts.revert(zone.ref).catch(() => toast(tx("saveFailed")));
    else void write(zone.ref, { deleted: true });
  }

  function finish() {
    if (!drawing || drawing.pts.length < 3) return;
    if (drawing.ref) {
      update(drawing.ref, { polygon: drawing.pts });
      setSelected(drawing.ref);
    } else {
      const ref = `new:${uuid()}`;
      const n = zones.length;
      void write(ref, {
        name: `${tx("znNewName")} ${n + 1}`,
        colour: SWATCHES[n % SWATCHES.length]!,
        polygon: drawing.pts,
        postcodePrefixes: [],
        surcharge: "0",
        isActive: true,
        sortOrder: Math.max(0, ...zones.map((zone) => zone.sortOrder)) + 1,
      });
      setSelected(ref);
    }
    setDrawing(null);
  }

  const showOnMap = (ref: string) => {
    setSelected(ref);
    setFocus((current) => ({ ref, n: (current?.n ?? 0) + 1 }));
  };

  // The checker: a postcode by prefix first (then its city's point), a name
  // by the reference cities — the prototype's rules, over the drafted zones.
  const result = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    let city: string | null = null;
    let zone: Zone | undefined;
    if (/^\d{2,5}$/.test(q)) {
      zone = zoneByPostcode(zones, q);
      city = POSTCODE_CITY[q.slice(0, 2)] ?? null;
      if (!zone && city) zone = zoneAt(zones, CITIES[city]!);
    } else {
      const lower = q.toLowerCase();
      city = Object.keys(CITIES).find((key) => key.startsWith(lower)) ?? Object.keys(CITIES).find((key) => key.includes(lower)) ?? null;
      if (city) zone = zoneAt(zones, CITIES[city]!);
    }
    const place = city ? cityName(city) : q;
    if (!city && !zone) return { ok: false, text: tx("znNotFound") };
    if (zone) {
      const fee = feeNumber(zone.surcharge);
      return { ok: true, text: `${tx("znIn", { place, zone: zone.name })} · ${fee ? `+ €${fee.toFixed(2)}` : tx("znFree")}` };
    }
    return { ok: false, text: `${place}: ${tx("znOutside")}` };
  }, [query, zones, tx]);

  const coverage = useMemo(
    () =>
      Object.keys(CITIES)
        .map((key) => ({ key, name: cityName(key), zone: zoneAt(zones, CITIES[key]!) }))
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [zones],
  );

  return (
    <AdminShell view="zones">
      <section data-screen-label="Service zones" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("znTitle")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6, maxWidth: 620 }}>{tx("znSub")}</p>
          </div>
          {!drawing ? (
            <button
              type="button"
              className={styles.redBtn}
              onClick={() => {
                setDrawing({ ref: null, pts: [] });
                setSelected(null);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 16px", border: 0, borderRadius: 10, background: "#d71635", color: "#ffffff", fontSize: 13, fontWeight: 650, boxShadow: "0 8px 20px #d7163533" }}
            >
              <Svg d={PLUS} size={14} width={2.6} />
              {tx("znNew")}
            </button>
          ) : null}
        </div>

        {live.isError ? (
          <div className="a-note is-error" role="alert">
            <span style={{ flex: 1 }}>{tx("loadFailed")}</span>
            <button type="button" className="a-btn is-sm is-ghost" onClick={() => void live.refetch()}>
              {tx("retry")}
            </button>
          </div>
        ) : null}

        <div className={styles.grid}>
          <div className={`${styles.map} ${drawing ? styles.drawing : ""}`}>
            <ZoneMap
              zones={zones}
              selected={selected}
              drawing={drawing}
              focus={focus}
              rtl={rtl}
              tx={tx}
              onMapClick={(point) => {
                if (drawing) setDrawing({ ...drawing, pts: [...drawing.pts, point] });
                else setSelected(zones.find((zone) => inside(point, zone.polygon))?.ref ?? null);
              }}
              onCornerMoved={(ref, polygon) => update(ref, { polygon })}
              onDrawPointMoved={(pts) => setDrawing((current) => (current ? { ...current, pts } : current))}
            />
            {drawing ? (
              <div
                style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 800, width: "max-content", maxWidth: "calc(100% - 100px)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", paddingBlock: 8, paddingInlineStart: 14, paddingInlineEnd: 8, borderRadius: 12, background: "#ffffff", boxShadow: "0 8px 24px #00000026" }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#252b28" }}>{tx("znDrawHint")}</span>
                <span style={{ padding: "3px 9px", borderRadius: 999, background: "#fff1f3", color: "#d71635", fontSize: 11, fontWeight: 650 }}>{tx("znPoints", { n: drawing.pts.length })}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" disabled={!drawing.pts.length} onClick={() => setDrawing({ ...drawing, pts: drawing.pts.slice(0, -1) })} style={toolBtn}>
                    {tx("znUndo")}
                  </button>
                  <button type="button" onClick={() => setDrawing(null)} style={toolBtn}>
                    {tx("znCancel")}
                  </button>
                  <button type="button" disabled={drawing.pts.length < 3} onClick={finish} style={{ minHeight: 32, padding: "0 13px", border: 0, borderRadius: 8, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 650 }}>
                    {tx("znFinish")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <span style={eyebrow}>{tx("znZones")}</span>
            {live.isLoading ? (
              <div style={{ ...panel, gap: 10 }}>
                <div className="a-skel" style={{ width: "60%" }} />
                <div className="a-skel" />
              </div>
            ) : zones.length === 0 ? (
              <p style={{ ...panel, padding: 18, fontSize: 12.5, color: "#737870", textAlign: "center" }}>{tx("znEmpty")}</p>
            ) : null}
            {zones.map((zone) => (
              <ZoneCard
                key={zone.ref}
                zone={zone}
                tx={tx}
                selected={selected === zone.ref}
                edited={drafts.edited(zone.ref)}
                onUpdate={(patch) => update(zone.ref, patch)}
                onShow={() => showOnMap(zone.ref)}
                onRedraw={() => {
                  setSelected(zone.ref);
                  setDrawing({ ref: zone.ref, pts: [] });
                }}
                onDelete={() => remove(zone)}
                toast={toast}
              />
            ))}

            <div style={{ ...panel, gap: 10 }}>
              <span style={eyebrow}>{tx("znTest")}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tx("znTestPh")}
                aria-label={tx("znTest")}
                style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #e3e5de", borderRadius: 9, background: "#ffffff", fontSize: 13 }}
              />
              {result ? (
                <p role="status" style={{ padding: "9px 12px", borderRadius: 9, background: result.ok ? "#edf5ed" : "#f5f5f0", color: result.ok ? "#3f705a" : "#4a514d", fontSize: 12.5, fontWeight: 600 }}>
                  {result.text}
                </p>
              ) : null}
            </div>

            <div style={{ ...panel, gap: 8 }}>
              <span style={eyebrow}>{tx("znCoverage")}</span>
              <div style={{ display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto" }}>
                {coverage.map((city) => (
                  <div key={city.key} style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 30, borderBottom: "1px solid #f1f1ea", fontSize: 12.5 }}>
                    <i style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: city.zone ? city.zone.colour : "#cfd3d7", flex: "none" }} />
                    <bdi style={{ flex: 1, minWidth: 0 }}>{city.name}</bdi>
                    <span style={{ color: city.zone ? "#252b28" : "#92958e", fontSize: 12 }}>
                      <bdi>{city.zone ? city.zone.name : tx("znOutside")}</bdi>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}

// ── Zone card ─────────────────────────────────────────────────────────────

function ZoneCard({
  zone,
  tx,
  selected,
  edited,
  onUpdate,
  onShow,
  onRedraw,
  onDelete,
  toast,
}: {
  zone: Zone;
  tx: Tx;
  selected: boolean;
  edited: boolean;
  onUpdate: (patch: Partial<ZoneValue>) => void;
  onShow: () => void;
  onRedraw: () => void;
  onDelete: () => void;
  toast: (message: string) => void;
}) {
  const on = zone.isActive;
  const [feeError, setFeeError] = useState(false);
  const cities = Object.values(CITIES).filter((point) => inside(point, zone.polygon)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, border: `1px solid ${selected ? zone.colour : "#e3e5de"}`, borderRadius: 12, background: "#ffffff", boxShadow: selected ? "0 10px 26px #202a2314" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={onShow} aria-label={tx("znShow")} title={tx("znShow")} style={{ width: 22, height: 22, border: 0, borderRadius: 6, background: zone.colour, flex: "none", padding: 0, boxShadow: "inset 0 0 0 1px #00000014" }} />
        <CommitText
          className={styles.name}
          value={zone.name}
          aria-label={tx("znName")}
          onCommit={(text) => {
            if (!text.trim()) {
              toast(tx("needName"));
              return false;
            }
            onUpdate({ name: text.trim() });
            return true;
          }}
          style={{ flex: 1, minWidth: 0, padding: "5px 7px", border: "1px solid transparent", borderRadius: 7, background: "transparent", fontSize: 14, fontWeight: 650, color: "#1d2220" }}
        />
        {edited ? <i title={tx("edited")} style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#ffcb08", flex: "none" }} /> : null}
        {!on ? <span style={{ fontSize: 10.5, fontWeight: 650, color: "#92958e" }}>{tx("znOff")}</span> : null}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={tx("znOnOff")}
          onClick={() => onUpdate({ isActive: !on })}
          style={{ position: "relative", width: 38, height: 22, flex: "none", border: 0, borderRadius: 999, background: on ? "#d71635" : "#cfd3d7", padding: 0, transition: "background .15s" }}
        >
          <i style={{ position: "absolute", top: 2, insetInlineStart: on ? 18 : 2, display: "block", width: 18, height: 18, borderRadius: "50%", background: "#ffffff", boxShadow: "0 1px 3px #00000033", transition: "inset-inline-start .15s" }} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#737870" }}>{tx("znFee")}</span>
          <CommitText
            value={feeNumber(zone.surcharge) ? String(feeNumber(zone.surcharge)) : zone.surcharge === "0" || zone.surcharge === "0.00" ? "0" : zone.surcharge}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={feeError || undefined}
            onCommit={(text) => {
              const clean = text.replace(/[^\d.,]/g, "").replace(",", ".") || "0";
              if (!/^\d{1,6}(\.\d{1,2})?$/.test(clean)) {
                setFeeError(true);
                toast(tx("badFee"));
                return false;
              }
              setFeeError(false);
              onUpdate({ surcharge: clean });
              return true;
            }}
            style={{ ...field, ...(feeError ? { border: "1px solid #d71635", background: "#fff6f6" } : null) }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#737870" }}>{tx("znPlz")}</span>
          <CommitText
            dir="ltr"
            value={zone.postcodePrefixes.join(", ")}
            placeholder="50, 51"
            onCommit={(text) => {
              const prefixes = [...new Set(text.split(/[\s,;]+/).filter((part) => /^\d{1,5}$/.test(part)))];
              onUpdate({ postcodePrefixes: prefixes });
              return true;
            }}
            style={{ ...field, font: "12.5px ui-monospace, Menlo, monospace" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {SWATCHES.map((colour) => (
            <button
              key={colour}
              type="button"
              aria-label={colour}
              aria-pressed={colour === zone.colour.toLowerCase()}
              onClick={() => onUpdate({ colour })}
              style={{ width: 20, height: 20, borderRadius: "50%", background: colour, border: `2px solid ${colour === zone.colour.toLowerCase() ? "#1d2220" : "#ffffff"}`, padding: 0, boxShadow: "0 0 0 1px #e3e5de" }}
            />
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: "#737870" }}>{tx("znMeta", { n: cities, a: areaKm2(zone.polygon).toLocaleString("en-US") })}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" className={styles.plainBtn} onClick={onShow} style={cardBtn}>
          {tx("znShow")}
        </button>
        <button type="button" className={styles.plainBtn} onClick={onRedraw} style={cardBtn}>
          {tx("znRedraw")}
        </button>
        <button type="button" className={styles.deleteBtn} onClick={onDelete} style={{ ...cardBtn, border: "1px solid #f3c9d0", background: "#fff6f6", color: "#b7122b" }}>
          {tx("znDelete")}
        </button>
      </div>
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────

function ZoneMap({
  zones,
  selected,
  drawing,
  focus,
  rtl,
  tx,
  onMapClick,
  onCornerMoved,
  onDrawPointMoved,
}: {
  zones: Zone[];
  selected: string | null;
  drawing: { ref: string | null; pts: Point[] } | null;
  focus: { ref: string; n: number } | null;
  rtl: boolean;
  tx: Tx;
  onMapClick: (point: Point) => void;
  onCornerMoved: (ref: string, polygon: Point[]) => void;
  onDrawPointMoved: (pts: Point[]) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet>(null);
  const layer = useRef<Leaflet>(null);
  const [lib, setLib] = useState<Leaflet>(null);
  const [failed, setFailed] = useState(false);
  // The map's own listeners outlive renders; they read the latest handlers here.
  const handlers = useRef({ onMapClick, onCornerMoved, onDrawPointMoved });
  handlers.current = { onMapClick, onCornerMoved, onDrawPointMoved };

  useEffect(() => {
    let alive = true;
    loadLeaflet()
      .then((L) => alive && setLib(() => L))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!lib || !el.current) return;
    const L = lib;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true }).setView([51.3, 7.05], 9);
    L.control.zoom({ position: rtl ? "topleft" : "topright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      subdomains: "abc",
      maxZoom: 19,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (event: { latlng: { lat: number; lng: number } }) =>
      handlers.current.onMapClick([Number(event.latlng.lat.toFixed(5)), Number(event.latlng.lng.toFixed(5))]),
    );
    map.current = m;
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(el.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
      layer.current = null;
    };
    // The zoom control's side follows the language the map was opened in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib]);

  useEffect(() => {
    const L = lib;
    const group = layer.current;
    if (!L || !group) return;
    group.clearLayers();

    const cornerIcon = (colour: string, first = false) =>
      L.divIcon({
        className: "",
        html: `<span class="${styles.corner}" style="color:${ink(colour)};${first ? "width:14px;height:14px" : ""}"></span>`,
        iconSize: first ? [14, 14] : [12, 12],
        iconAnchor: first ? [7, 7] : [6, 6],
      });

    for (const zone of zones) {
      if (zone.polygon.length < 3 || (drawing && drawing.ref === zone.ref)) continue;
      const on = selected === zone.ref;
      const faint = Boolean(drawing);
      const polygon = L.polygon(zone.polygon, {
        color: zone.colour,
        weight: on ? 3 : faint ? 1 : 1.6,
        opacity: zone.isActive ? 0.9 : 0.45,
        dashArray: zone.isActive ? null : "6 6",
        fillColor: zone.colour,
        fillOpacity: faint ? 0.05 : on ? 0.26 : 0.13,
      }).addTo(group);
      polygon.bindTooltip(zone.name, { sticky: true });

      // The selected zone's corners can be dragged to reshape it.
      if (on && !drawing) {
        const pts = zone.polygon.map((p) => [...p] as Point);
        pts.forEach((point, index) => {
          const marker = L.marker(point, { draggable: true, icon: cornerIcon(zone.colour), title: tx("moveCorner"), keyboard: false, zIndexOffset: 500 }).addTo(group);
          marker.on("drag", () => {
            const at = marker.getLatLng();
            pts[index] = [at.lat, at.lng];
            polygon.setLatLngs(pts);
          });
          marker.on("dragend", () => {
            const at = marker.getLatLng();
            pts[index] = [Number(at.lat.toFixed(5)), Number(at.lng.toFixed(5))];
            handlers.current.onCornerMoved(zone.ref, pts.slice());
          });
        });
      }
    }

    for (const [key, point] of Object.entries(CITIES)) {
      const zone = zoneAt(zones, point);
      L.circleMarker(point, { radius: 4, color: "#ffffff", weight: 1.5, fillColor: zone ? ink(zone.colour) : "#92958e", fillOpacity: 1, interactive: true, bubblingMouseEvents: true })
        .bindTooltip(cityName(key))
        .addTo(group);
    }

    if (drawing && drawing.pts.length) {
      const pts = drawing.pts.map((p) => [...p] as Point);
      const line = L.polyline(pts.length > 2 ? [...pts, pts[0]] : pts, { color: "#d71635", weight: 2.5, dashArray: "6 6", interactive: false }).addTo(group);
      const fill = pts.length > 2 ? L.polygon(pts, { stroke: false, fillColor: "#d71635", fillOpacity: 0.12, interactive: false }).addTo(group) : null;
      pts.forEach((point, index) => {
        const marker = L.marker(point, { draggable: true, icon: cornerIcon("#d71635", index === 0), title: tx("moveCorner"), keyboard: false, zIndexOffset: 600 }).addTo(group);
        marker.on("drag", () => {
          const at = marker.getLatLng();
          pts[index] = [at.lat, at.lng];
          line.setLatLngs(pts.length > 2 ? [...pts, pts[0]] : pts);
          fill?.setLatLngs(pts);
        });
        marker.on("dragend", () => {
          const at = marker.getLatLng();
          pts[index] = [Number(at.lat.toFixed(5)), Number(at.lng.toFixed(5))];
          handlers.current.onDrawPointMoved(pts.slice());
        });
      });
    }
  }, [lib, zones, selected, drawing, tx]);

  useEffect(() => {
    const L = lib;
    if (!L || !map.current || !focus) return;
    const zone = zones.find((entry) => entry.ref === focus.ref);
    if (zone && zone.polygon.length > 2) map.current.flyToBounds(L.latLngBounds(zone.polygon), { padding: [50, 50], duration: 0.7 });
    // Only a new request moves the map, not an edit of the zone it shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, focus]);

  return (
    <>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {failed ? (
        <p className="a-note is-error" style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 900 }}>
          {tx("mapFailed")}
        </p>
      ) : null}
    </>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

/**
 * Saves when you leave the field (or press Enter). `onCommit` returns false
 * to refuse the value, which puts the field back to what is saved.
 */
function CommitText({
  value,
  onCommit,
  ...rest
}: {
  value: string;
  onCommit: (value: string) => boolean | void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  inputMode?: "decimal" | "text";
  className?: string | undefined;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-invalid"?: boolean | undefined;
}) {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <input
      {...rest}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        focused.current = false;
        if (text !== value && onCommit(text) === false) setText(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

function Svg({ d, size = 18, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const panel: CSSProperties = { display: "flex", flexDirection: "column", padding: 14, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308" };
const eyebrow: CSSProperties = { fontSize: 9.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#92958e" };
const field: CSSProperties = { width: "100%", minWidth: 0, height: 34, padding: "0 10px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", fontSize: 13 };
const toolBtn: CSSProperties = { minHeight: 32, padding: "0 11px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", fontSize: 12, fontWeight: 600 };
const cardBtn: CSSProperties = { minHeight: 30, padding: "0 11px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", fontSize: 12, fontWeight: 600 };
