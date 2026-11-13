"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { defineText, useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import { contentRef, errorText, isMedia, useContent, useSiteSettingsDrafts, type Content, type Loc } from "../inhalte/_lib/cms";
import { KIT_TEXT, LangSwitch, PAGE_ORDER, UploadIcon, kit, pageName, useMatch, useMediaDialog } from "../inhalte/_lib/ui";

/**
 * Content & images: the background pattern (the logos are in Settings, as in
 * the prototype) and a searchable list of every text on the site with an override
 * beside it, as the admin prototype's "Content & images" screen has them.
 *
 * The pictures are `site_settings` rows, drafted as "settings"; a text
 * override is a "content" draft of that block in the chosen language. An
 * empty override keeps the original, exactly as in the prototype.
 */

const TEXT = defineText({
  title: { de: "Inhalte & Bilder", en: "Content & images", ar: "المحتوى والصور", tr: "İçerik ve görseller" },
  sub: { de: "Ändern Sie jeden Text und jedes Bild der Website.", en: "Change any text or image on the booking site.", ar: "غيّر أي نص أو صورة في موقع الحجز.", tr: "Sitedeki herhangi bir metni veya görseli değiştirin." },
  images: { de: "Bilder", en: "Images", ar: "الصور", tr: "Görseller" },
  bgImage: { de: "Hintergrundmuster", en: "Background pattern", ar: "خلفية الشبكة", tr: "Arka plan deseni" },
  bgSub: { de: "Dezent hinter jeder Seite.", en: "Shown faintly behind every page.", ar: "تظهر بشكل خفيف خلف كل الصفحات.", tr: "Her sayfanın arkasında soluk görünür." },
  imgHint: {
    de: "JPG, PNG, WebP oder AVIF · oder eine Bildadresse",
    en: "JPG, PNG, WebP or AVIF · or an image address",
    ar: "JPG أو PNG أو WebP أو AVIF · أو رابط صورة",
    tr: "JPG, PNG, WebP veya AVIF · ya da bir görsel adresi",
  },
  texts: { de: "Texte", en: "Texts", ar: "النصوص", tr: "Metinler" },
  changed: { de: "Geändert", en: "Changed", ar: "معدّل", tr: "Değişti" },
  textsSub: {
    de: "Schreiben Sie den neuen Wortlaut neben das Original. Leer lassen, um das Original zu behalten.",
    en: "Write the new wording next to the original. Leave it empty to keep the original.",
    ar: "اكتب النص الجديد بجانب الأصلي. اتركه فارغاً للإبقاء على الأصلي.",
    tr: "Yeni ifadeyi orijinalin yanına yazın. Orijinali korumak için boş bırakın.",
  },
  search: { de: "Texte suchen", en: "Search texts", ar: "ابحث في النصوص", tr: "Metinlerde ara" },
  original: { de: "Aktuell auf der Website", en: "On the site now", ar: "النص الحالي في الموقع", tr: "Şu an sitede" },
  replacement: { de: "Neuer Text", en: "New text", ar: "النص الجديد", tr: "Yeni metin" },
  keep: { de: "Original behalten", en: "Keep the original", ar: "إبقاء الأصلي", tr: "Orijinali koru" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  addText: { de: "Weiteren Text hinzufügen", en: "Add another text", ar: "إضافة نص آخر", tr: "Başka bir metin ekle" },
  textPh: { de: "Den genauen Text von der Website einfügen", en: "Paste the exact text from the site", ar: "الصق النص كما هو من الموقع", tr: "Siteden metnin tam halini yapıştırın" },
  notFound: { de: "Dieser Text kommt auf der Website nicht vor.", en: "This text is not on the site.", ar: "هذا النص غير موجود في الموقع.", tr: "Bu metin sitede yok." },
  more: { de: "{n} weitere anzeigen", en: "Show {n} more", ar: "عرض {n} أخرى", tr: "{n} tane daha göster" },
  none: { de: "Keine Texte gefunden.", en: "No texts found.", ar: "لا توجد نصوص.", tr: "Metin bulunamadı." },
});

const PAGE_SIZE = 40;
const CARD: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, padding: "22px 24px", boxShadow: "0 12px 36px #202a2308" };
const H2: CSSProperties = { fontSize: 17, fontWeight: 600, letterSpacing: "var(--a-ls-h2)" };

export default function ContentImagesPage() {
  return (
    <AdminShell view="content">
      <ContentImages />
    </AdminShell>
  );
}

function ContentImages() {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const { locale } = useI18n();
  const settings = useSiteSettingsDrafts();
  const c = useContent();
  const [lang, setLang] = useState<Loc>(locale);
  const [openMedia, mediaDialog] = useMediaDialog();

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div className="a-page-head" style={{ display: "block" }}>
          <h1 style={{ lineHeight: 1.2 }}>{tx("title")}</h1>
          <p>{tx("sub")}</p>
        </div>
        <LangSwitch value={lang} onChange={setLang} />
      </div>
      {c.error || settings.error ? <p className="a-note is-error">{kx("loadFailed")}</p> : null}

      <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={H2}>{tx("images")}</h2>
        {(
          [
            ["brand.background", "bgImage", "bgSub", "cover"],
          ] as const
        ).map(([key, title, sub, fit]) => (
          <BrandImage key={key} settingKey={key} title={tx(title)} sub={tx(sub)} fit={fit} hint={tx("imgHint")} settings={settings} openMedia={openMedia} />
        ))}
      </div>

      <Texts c={c} lang={lang} />
      {mediaDialog}
    </section>
  );
}

function BrandImage({
  settingKey,
  title,
  sub,
  hint,
  fit,
  settings,
  openMedia,
}: {
  settingKey: string;
  title: string;
  sub: string;
  hint: string;
  fit: "contain" | "cover";
  settings: ReturnType<typeof useSiteSettingsDrafts>;
  openMedia: ReturnType<typeof useMediaDialog>[0];
}) {
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const src = settings.value(settingKey);
  const edited = settings.edited(settingKey);
  const original = settings.original(settingKey);
  const restorable = !edited && original !== undefined && original !== src;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <span style={{ width: 132, height: 84, border: `1px solid ${edited ? "#ffcb08" : "#e3e5de"}`, borderRadius: 8, background: "#ffffff", overflow: "hidden", flex: "none", display: "grid", placeItems: "center" }}>
        {src ? (
          <img
            src={src}
            alt=""
            style={fit === "contain" ? { width: 112, height: 64, objectFit: "contain", display: "block" } : { width: 130, height: 82, objectFit: "cover", display: "block" }}
          />
        ) : null}
      </span>
      <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</b>
        <p style={{ fontSize: 12.5, color: "#737870" }}>{sub}</p>
        <small style={{ fontSize: 11, color: "#92958e" }}>{hint}</small>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => openMedia({ kind: "image", current: src, onApply: (url) => settings.save([{ key: settingKey, value: url }]) })}
          className={kit.soft}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 41, padding: "0 15px", border: "1px solid #d71635", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 550 }}
        >
          <UploadIcon />
          {kx("upload")}
        </button>
        {edited || restorable ? (
          <button
            type="button"
            className={kit.softDark}
            onClick={() => (edited ? settings.revert(settingKey) : settings.save([{ key: settingKey, value: original! }])).catch((error) => toast(errorText(error, kx("saveFailed"))))}
            style={{ minHeight: 41, padding: "0 12px", border: "1px solid transparent", borderRadius: 6, background: "transparent", color: "#737870", fontSize: 12, fontWeight: 550 }}
          >
            {edited ? kx("reset") : kx("useOriginal")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface TextRow {
  section: string;
  slot: string;
  live: string;
}

function Texts({ c, lang }: { c: Content; lang: Loc }) {
  const tx = useText(TEXT);
  const { locale } = useI18n();
  const wide = !useMatch("(max-width: 899px)");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [custom, setCustom] = useState<string[]>([]);

  /** Every text the site shows in this language, the booking planner's first. */
  const rows = useMemo(() => {
    const order = ["planner", ...PAGE_ORDER.filter((section) => section !== "planner")];
    const sections = [...c.sections].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
    });
    const out: TextRow[] = [];
    for (const section of sections) {
      for (const slot of c.slotsOf(section).sort((a, b) => a.sortOrder - b.sortOrder)) {
        if (isMedia(slot.kind) || c.neutral(section, slot.slot)) continue;
        const live = c.live(section, slot.slot, lang);
        if (live.trim()) out.push({ section, slot: slot.slot, live });
      }
    }
    return out;
  }, [c, lang]);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? rows.filter((row) => row.live.toLowerCase().includes(needle) || c.value(row.section, row.slot, lang).toLowerCase().includes(needle) || row.slot.toLowerCase().includes(needle))
    : rows;
  const changed = rows.filter((row) => c.edited(row.section, row.slot, lang)).length;
  const listed = matches;

  return (
    <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <h2 style={H2}>
            {tx("texts")}
            {changed ? (
              <span style={{ marginInlineStart: 8, padding: "3px 7px", borderRadius: 4, background: "#fff6f6", color: "#b7122b", fontSize: 11, fontWeight: 650, verticalAlign: "middle" }}>
                <bdi>{changed}</bdi> · {tx("changed")}
              </span>
            ) : null}
          </h2>
          <p style={{ fontSize: 12.5, color: "#737870" }}>{tx("textsSub")}</p>
        </div>
        <label style={{ flex: "0 1 280px", minWidth: 220, display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder={tx("search")}
              aria-label={tx("search")}
              style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 13, boxShadow: "none" }}
            />
        </label>
      </div>
      {wide ? (
        <div style={{ display: "flex", gap: 12, padding: "0 2px", fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}>
          <span style={{ flex: "1 1 0" }}>{tx("original")}</span>
          <span style={{ flex: "1 1 0" }}>{tx("replacement")}</span>
          <span style={{ width: 32 }} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {c.loading
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="a-skel" style={{ height: 41 }} />)
          : listed.slice(0, limit).map((row) => <TextLine key={`${row.section}|${row.slot}|${lang}`} c={c} row={row} lang={lang} where={`${pageName(row.section, locale)} · ${row.slot}`} />)}
        {!c.loading && !listed.length ? <p className="a-empty">{tx("none")}</p> : null}
        {custom.map((from, i) => (
          <CustomLine
            key={i}
            c={c}
            rows={rows}
            lang={lang}
            from={from}
            onFrom={(next) => setCustom((list) => list.map((item, j) => (j === i ? next : item)))}
            onRemove={() => setCustom((list) => list.filter((_, j) => j !== i))}
          />
        ))}
      </div>
      {listed.length > limit ? (
        <button type="button" className="a-link-btn" style={{ alignSelf: "center" }} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          {tx("more", { n: Math.min(PAGE_SIZE, listed.length - limit) })}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setCustom((list) => [...list, ""])}
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 0", border: 0, background: "transparent", color: "#d71635", fontSize: 12, fontWeight: 600 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {tx("addText")}
      </button>
    </div>
  );
}

/** One original text and its override. */
function TextLine({ c, row, lang, where }: { c: Content; row: TextRow; lang: Loc; where: string }) {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const [typing, setTyping] = useState<string | null>(null);
  const edited = c.edited(row.section, row.slot, lang);
  const override = edited ? c.value(row.section, row.slot, lang) : "";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const commit = async () => {
    if (typing === null) return;
    const next = typing.trim();
    try {
      if (next === override.trim()) return;
      if (next === "" || next === row.live) await c.revert([contentRef(row.section, row.slot, lang)]);
      else await c.save([{ section: row.section, slot: row.slot, locale: lang, value: next }]);
    } catch (error) {
      toast(errorText(error, kx("saveFailed")));
    } finally {
      setTyping(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px 12px", alignItems: "center", flexWrap: "wrap" }}>
      <span dir={dir} title={where} style={{ flex: "1 1 240px", minWidth: 0, minHeight: 41, display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "#f5f5f0", fontSize: 13, color: "#252b28", textAlign: "start", whiteSpace: "pre-line" }}>
        {row.live}
      </span>
      <input
        dir={dir}
        value={typing ?? override}
        placeholder={tx("keep")}
        aria-label={`${tx("replacement")}: ${row.live.slice(0, 60)}`}
        onChange={(event) => setTyping(event.target.value)}
        onBlur={() => void commit()}
        style={{ flex: "1 1 240px", minWidth: 0, height: 41, padding: "0 12px", border: `1px solid ${edited ? "#d71635" : "#cfd3cb"}`, borderRadius: 6, background: "#ffffff", fontSize: 13 }}
      />
      <button
        type="button"
        aria-label={tx("remove")}
        className={kit.rowX}
        disabled={!edited}
        onClick={() => c.revert([contentRef(row.section, row.slot, lang)]).catch((error) => toast(errorText(error, kx("saveFailed"))))}
        style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#92958e", padding: 0, flex: "none" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * "Add another text": paste a text exactly as the site shows it, and the row
 * finds the block that holds it and takes its override.
 */
function CustomLine({ c, rows, lang, from, onFrom, onRemove }: { c: Content; rows: TextRow[]; lang: Loc; from: string; onFrom: (next: string) => void; onRemove: () => void }) {
  const tx = useText(TEXT);
  const { locale } = useI18n();
  const found = from.trim() ? rows.find((row) => row.live.trim() === from.trim()) : undefined;

  if (found) return <TextLine c={c} row={found} lang={lang} where={`${pageName(found.section, locale)} · ${found.slot}`} />;

  return (
    <div style={{ display: "flex", gap: "8px 12px", alignItems: "center", flexWrap: "wrap" }}>
      <input
        dir={lang === "ar" ? "rtl" : "ltr"}
        value={from}
        onChange={(event) => onFrom(event.target.value)}
        placeholder={tx("textPh")}
        style={{ flex: "1 1 240px", minWidth: 0, height: 41, padding: "0 12px", border: "1px dashed #c4c7bf", borderRadius: 6, background: "#fafaf7", fontSize: 13 }}
      />
      <input disabled placeholder={from.trim() ? tx("notFound") : tx("keep")} style={{ flex: "1 1 240px", minWidth: 0, height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13 }} />
      <button type="button" aria-label={tx("remove")} className={kit.rowX} onClick={onRemove} style={{ width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 5, background: "transparent", color: "#92958e", padding: 0, flex: "none" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
