"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { defineText, useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import { errorText, listEdits, useContent, type Content, type ContentChange, type Loc } from "../inhalte/_lib/cms";

/**
 * The website's FAQ, as the admin prototype's FAQ screen (v11) manages it:
 * every category the FAQ page shows — its own topics and each service's
 * questions — plus categories the office adds; a category can be hidden from
 * the FAQ page, and questions can be added to any of them, in each language.
 *
 * Everything is a "content" draft of the CMS section `page-faq` (see
 * components/mon/blocks/faq.ts for the slots) and reaches the website with
 * the frame's "Save & publish": /faq, /faq/<category> and, for a service's
 * category, the FAQ on that service's page.
 */

const F = "page-faq";
const LANGS: [Loc, string][] = [
  ["de", "Deutsch"],
  ["en", "English"],
  ["tr", "Türkçe"],
  ["ar", "العربية"],
];
const ICS = [
  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  "M1 6h13v10H1zM14 9h4l3 3v4h-7M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  "M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  "M4 5h16v15H4zM4 9.5h16M8.5 3v4M15.5 3v4",
  "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
  "M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6",
  "M4 21l4-1 11-11-3-3L5 17zM14 6l3 3",
  "M3 6h18v12H3zM3 10.5h18M7 15h4",
];

const TEXT = defineText({
  title: { de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS" },
  sub: {
    de: "Legen Sie Kategorien an, fügen Sie Fragen hinzu und wählen Sie, welche Kategorien auf der FAQ-Seite der Website erscheinen.",
    en: "Create categories, add questions and choose which categories appear on the website FAQ page.",
    ar: "أنشئ فئات وأضف إليها أسئلة، واختر الفئات التي تظهر في صفحة الأسئلة على الموقع.",
    tr: "Kategoriler oluşturun, sorular ekleyin ve web sitesindeki SSS sayfasında hangi kategorilerin görüneceğini seçin.",
  },
  newCat: { de: "Neue Kategorie", en: "New category", ar: "فئة جديدة", tr: "Yeni kategori" },
  view: { de: "Auf der Website ansehen", en: "View on website", ar: "عرض على الموقع", tr: "Web sitesinde görüntüle" },
  catName: { de: "Name der Kategorie", en: "Category name", ar: "اسم الفئة", tr: "Kategori adı" },
  catPh: { de: "z. B. Einlagerung", en: "e.g. Storage", ar: "مثلاً: التخزين", tr: "örn. Depolama" },
  icon: { de: "Symbol", en: "Icon", ar: "الأيقونة", tr: "Simge" },
  builtQs: { de: "Aktuelle Fragen", en: "Current questions", ar: "الأسئلة الحالية", tr: "Mevcut sorular" },
  builtNote: {
    de: "Diese Fragen gehören zur Website. Fügen Sie unten weitere hinzu.",
    en: "These questions come with the website. Add more questions below.",
    ar: "هذه الأسئلة موجودة أصلاً في الموقع. أضف أسئلة أخرى في الأسفل.",
    tr: "Bu sorular web sitesiyle birlikte gelir. Aşağıya yenilerini ekleyin.",
  },
  extraQs: { de: "Weitere Fragen", en: "Extra questions", ar: "أسئلة إضافية", tr: "Ek sorular" },
  ownQs: { de: "Fragen", en: "Questions", ar: "الأسئلة", tr: "Sorular" },
  qPh: { de: "Frage", en: "Question", ar: "السؤال", tr: "Soru" },
  aPh: { de: "Antwort", en: "Answer", ar: "الجواب", tr: "Cevap" },
  addQ: { de: "Frage hinzufügen", en: "Add question", ar: "إضافة سؤال", tr: "Soru ekle" },
  langNote: {
    de: "Schreiben Sie in jeder Sprache. Leere Sprachen zeigen die erste Sprache, in der Sie geschrieben haben.",
    en: "Write in each language. Empty languages show the first language you filled in.",
    ar: "اكتب بكل لغة. اللغة الفارغة تعرض أول لغة كتبت فيها.",
    tr: "Her dilde yazın. Boş diller, ilk doldurduğunuz dili gösterir.",
  },
  viewCat: { de: "Diese Kategorie auf der Website öffnen", en: "Open this category on the website", ar: "افتح هذه الفئة على الموقع", tr: "Bu kategoriyi web sitesinde aç" },
  delCat: { de: "Kategorie löschen", en: "Delete category", ar: "حذف الفئة", tr: "Kategoriyi sil" },
  delAsk: { de: "Diese Kategorie und ihre Fragen löschen?", en: "Delete this category and its questions?", ar: "حذف هذه الفئة وأسئلتها؟", tr: "Bu kategori ve soruları silinsin mi?" },
  up: { de: "Nach oben", en: "Move up", ar: "تحريك لأعلى", tr: "Yukarı taşı" },
  down: { de: "Nach unten", en: "Move down", ar: "تحريك لأسفل", tr: "Aşağı taşı" },
  del: { de: "Löschen", en: "Delete", ar: "حذف", tr: "Sil" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  untitled: { de: "Kategorie ohne Namen", en: "Untitled category", ar: "فئة بدون اسم", tr: "Adsız kategori" },
  newName: { de: "Neue Kategorie", en: "New category", ar: "فئة جديدة", tr: "Yeni kategori" },
  question1: { de: "Frage", en: "question", ar: "سؤال", tr: "soru" },
  questionN: { de: "Fragen", en: "questions", ar: "سؤال", tr: "soru" },
  hidden: { de: "ausgeblendet", en: "hidden", ar: "مخفية", tr: "gizli" },
  custom: { de: "Eigene", en: "Custom", ar: "مخصّصة", tr: "Özel" },
  builtIn: { de: "Standard", en: "Built-in", ar: "أساسية", tr: "Hazır" },
  hide: { de: "Ausblenden", en: "Hide", ar: "إخفاء", tr: "Gizle" },
  show: { de: "Einblenden", en: "Show", ar: "إظهار", tr: "Göster" },
  saveFailed: { de: "Das konnte nicht gespeichert werden.", en: "That could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  loadFailed: { de: "Die FAQ konnten nicht geladen werden.", en: "The FAQ could not be loaded.", ar: "تعذّر تحميل الأسئلة.", tr: "SSS yüklenemedi." },
});

interface Category {
  id: string;
  custom: boolean;
  /** Its position among the custom categories (1-based), for renaming and deleting. */
  index: number;
  name: string;
  icon: string;
  /** Where its own questions live: a section and an item prefix (built-in only). */
  source?: { section: string; prefix: string };
}

export default function FaqAdminPage() {
  return (
    <AdminShell view="faq">
      <FaqEditor />
    </AdminShell>
  );
}

/** Whether the window is at least `px` wide (the prototype's two-column switch). */
function useWideWindow(px: number) {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const update = () => setWide(window.innerWidth >= px);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [px]);
  return wide;
}

/** How many numbered items a prefix holds in any language. */
function countIn(c: Content, section: string, prefix: string, fields: string[]): number {
  let longest = 0;
  for (const loc of ["de", "en", "ar", "tr"] as Loc[]) {
    let n = 0;
    while (n < 60 && fields.some((field) => c.value(section, `${prefix}.${n + 1}.${field}`, loc).trim())) n += 1;
    longest = Math.max(longest, n);
  }
  return longest;
}

function FaqEditor() {
  const c = useContent();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const wide = useWideWindow(1100);
  const ui = locale as Loc;
  const [sel, setSel] = useState<string | null>(null);
  const [lang, setLang] = useState<Loc>(locale === "ar" ? "ar" : "de");
  const [blank, setBlank] = useState<Record<string, number>>({});

  const fail = (error: unknown) => toast(errorText(error, tx("saveFailed")));
  const save = (changes: ContentChange[]) => c.save(changes).catch(fail);

  const cats = useMemo<Category[]>(() => {
    const v = (slot: string, loc: Loc = ui) => c.value(F, slot, loc).trim();
    const out: Category[] = [];
    for (let n = 1; n <= 40 && v(`topics.${n}.slug`, "de"); n += 1) {
      out.push({ id: v(`topics.${n}.slug`, "de"), custom: false, index: 0, name: v(`topics.${n}.title`), icon: v(`topics.${n}.icon`, "de"), source: { section: F, prefix: `topic${n}` } });
    }
    const names = new Map<string, string>();
    for (let k = 1; k <= 20 && c.value("chrome", `mega.${k}.id`, "de").trim(); k += 1) {
      names.set(c.value("chrome", `mega.${k}.id`, "de").trim(), c.value("chrome", `mega.${k}.name`, ui).trim());
    }
    for (let n = 1; n <= 40 && v(`svcfaq.${n}.slug`, "de"); n += 1) {
      const section = v(`svcfaq.${n}.section`, "de");
      if (!countIn(c, section, "faq", ["q", "a"])) continue;
      out.push({ id: v(`svcfaq.${n}.slug`, "de"), custom: false, index: 0, name: names.get(v(`svcfaq.${n}.id`, "de")) ?? v(`svcfaq.${n}.id`, "de"), icon: v(`svcfaq.${n}.icon`, "de"), source: { section, prefix: "faq" } });
    }
    const customs = countIn(c, F, "custom", ["id", "icon"]);
    for (let n = 1; n <= customs; n += 1) {
      const id = v(`custom.${n}.id`, "de");
      if (!id) continue;
      // The name in the dashboard's language, else the first one written.
      const name = v(`custom.${n}.title`) || (["de", "en", "tr", "ar"] as Loc[]).map((loc) => v(`custom.${n}.title`, loc)).find(Boolean) || "";
      out.push({ id, custom: true, index: n, name, icon: v(`custom.${n}.icon`, "de") || ICS[0]! });
    }
    return out;
  }, [c, ui]);

  const hidden = useMemo(
    () =>
      c
        .value(F, "layout.hidden", "de")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [c],
  );

  const current = cats.find((cat) => cat.id === sel) ?? null;
  const siteHref = `/${locale}/faq`;
  const pad = (i: number) => String(i + 1).padStart(2, "0");
  const builtCount = (cat: Category) => (cat.source ? countIn(c, cat.source.section, cat.source.prefix, ["q", "a"]) : 0);
  const extraCount = (cat: Category) => countIn(c, F, `extra.${cat.id}`, ["q", "a"]);

  const toggle = (cat: Category) => {
    const on = !hidden.includes(cat.id);
    const next = on ? [...hidden, cat.id] : hidden.filter((id) => id !== cat.id);
    void save([{ section: F, slot: "layout.hidden", locale: "*", value: next.join(",") }]);
  };

  const newCategory = () => {
    const id = `x${Date.now().toString(36)}`;
    const n = countIn(c, F, "custom", ["id", "icon"]) + 1;
    void save([
      { section: F, slot: `custom.${n}.id`, locale: "*", value: id },
      { section: F, slot: `custom.${n}.icon`, locale: "*", value: ICS[0]! },
    ]);
    setBlank((b) => ({ ...b, [id]: 1 }));
    setSel(id);
  };

  if (c.error) return <p className="a-note is-error">{tx("loadFailed")}</p>;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" }}>{tx("sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={siteHref} target="_blank" rel="noreferrer" className="a-faq-ghost">
            <ExtIcon size={14} />
            {tx("view")}
          </a>
          <button type="button" className="a-faq-new" onClick={newCategory}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {tx("newCat")}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: wide && current ? "minmax(0,1fr) minmax(0,1.2fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {c.loading
            ? Array.from({ length: 7 }, (_, i) => <div key={i} className="a-skel" style={{ height: 60, borderRadius: 10 }} />)
            : cats.map((cat) => {
                const on = !hidden.includes(cat.id);
                const n = builtCount(cat) + extraCount(cat);
                const isSel = sel === cat.id;
                return (
                  <div
                    key={cat.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#ffffff", border: `1px solid ${isSel ? "#d71635" : "#e3e5de"}`, borderRadius: 10, opacity: on ? 1 : 0.55, boxShadow: "0 12px 36px #202a2308", transition: "border-color .2s" }}
                  >
                    <button type="button" onClick={() => setSel(isSel ? null : cat.id)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: 0, background: "transparent", padding: "2px 0", textAlign: "start", color: "#1d2220" }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff1f3", color: "#d71635", display: "grid", placeItems: "center", flex: "none" }}>
                        <Path d={cat.icon || ICS[0]!} size={17} />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.name || tx("untitled")}</b>
                        <small style={{ fontSize: 11.5, color: "#737870" }}>
                          {n} {n === 1 ? tx("question1") : tx("questionN")}
                          {on ? "" : ` · ${tx("hidden")}`}
                        </small>
                      </span>
                    </button>
                    <span style={{ fontSize: 10.5, fontWeight: 650, padding: "3px 8px", borderRadius: 999, background: cat.custom ? "#fff6d6" : "#f1f3f5", color: "#4a514d", whiteSpace: "nowrap" }}>
                      {cat.custom ? tx("custom") : tx("builtIn")}
                    </span>
                    <button type="button" className="a-faq-mini" onClick={() => toggle(cat)}>
                      {on ? tx("hide") : tx("show")}
                    </button>
                  </div>
                );
              })}
        </div>

        {current ? (
          <CategoryPanel
            key={current.id}
            c={c}
            cat={current}
            lang={lang}
            setLang={setLang}
            blank={blank[current.id] ?? 0}
            setBlank={(n) => setBlank((b) => ({ ...b, [current.id]: n }))}
            onClose={() => setSel(null)}
            onDeleted={() => setSel(null)}
            save={save}
            catHref={`${siteHref}/${current.id}`}
            pad={pad}
            hidden={hidden}
          />
        ) : null}
      </div>
    </section>
  );
}

function CategoryPanel({
  c,
  cat,
  lang,
  setLang,
  blank,
  setBlank,
  onClose,
  onDeleted,
  save,
  catHref,
  pad,
  hidden,
}: {
  c: Content;
  cat: Category;
  lang: Loc;
  setLang: (loc: Loc) => void;
  blank: number;
  setBlank: (n: number) => void;
  onClose: () => void;
  onDeleted: () => void;
  save: (changes: ContentChange[]) => Promise<void>;
  catHref: string;
  pad: (i: number) => string;
  hidden: string[];
}) {
  const tx = useText(TEXT);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const prefix = `extra.${cat.id}`;
  const edits = listEdits(c, F, prefix, ["q", "a"]);
  const stored = edits.count;
  const total = stored + blank;
  const firstFilled = (slot: string) => (["de", "en", "tr", "ar"] as Loc[]).map((loc) => c.value(cat.source?.section ?? F, slot, loc).trim()).find(Boolean) ?? "";

  const builtItems = cat.source
    ? Array.from({ length: countIn(c, cat.source.section, cat.source.prefix, ["q", "a"]) }, (_, i) => ({
        q: c.value(cat.source!.section, `${cat.source!.prefix}.${i + 1}.q`, lang).trim() || firstFilled(`${cat.source!.prefix}.${i + 1}.q`),
        a: c.value(cat.source!.section, `${cat.source!.prefix}.${i + 1}.a`, lang).trim() || firstFilled(`${cat.source!.prefix}.${i + 1}.a`),
      }))
    : [];

  const set = (slot: string, value: string) => save([{ section: F, slot, locale: lang, value }]);

  const write = (i: number, field: "q" | "a", value: string) => {
    void set(`${prefix}.${i + 1}.${field}`, value).then(() => {
      if (i >= stored && value.trim()) setBlank(Math.max(0, blank - 1));
    });
  };

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= total) return;
    if (i >= stored || j >= stored) return;
    void save(edits.swap(i + 1, j + 1));
  };

  const remove = (i: number) => {
    if (i >= stored) {
      setBlank(Math.max(0, blank - 1));
      return;
    }
    void save(edits.remove(i + 1));
  };

  const deleteCategory = () => {
    if (!window.confirm(tx("delAsk"))) return;
    const custom = listEdits(c, F, "custom", ["id", "title", "icon"]);
    const clear: ContentChange[] = [];
    for (let n = 1; n <= stored; n += 1) {
      for (const field of ["q", "a"]) {
        for (const loc of ["de", "en", "ar", "tr"] as Loc[]) clear.push({ section: F, slot: `${prefix}.${n}.${field}`, locale: loc, value: "" });
      }
    }
    const rest = hidden.filter((id) => id !== cat.id);
    void save([...custom.remove(cat.index), ...clear, ...(rest.length !== hidden.length ? [{ section: F, slot: "layout.hidden", locale: "*" as const, value: rest.join(",") }] : [])]);
    onDeleted();
  };

  const iconNow = c.value(F, `custom.${cat.index}.icon`, "de") || ICS[0]!;

  return (
    <div style={{ position: "sticky", top: 16, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 36px #202a2308" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <b style={{ fontSize: 16, fontWeight: 650, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name || tx("newName")}</b>
        <button type="button" aria-label={tx("close")} onClick={onClose} style={iconBtn("#4a514d", 32)}>
          <Path d="M6 6l12 12M18 6 6 18" size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "#f1f3f5", alignSelf: "flex-start", flexWrap: "wrap" }}>
        {LANGS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setLang(k)}
            style={{ minHeight: 30, padding: "0 12px", border: 0, borderRadius: 999, background: lang === k ? "#252b28" : "transparent", color: lang === k ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
          >
            {label}
          </button>
        ))}
      </div>

      {cat.custom ? (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={labelStyle}>{tx("catName")}</small>
            <DraftInput
              key={`name-${lang}`}
              value={c.value(F, `custom.${cat.index}.title`, lang)}
              onCommit={(value) => void set(`custom.${cat.index}.title`, value)}
              dir={dir}
              placeholder={tx("catPh")}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={labelStyle}>{tx("icon")}</small>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ICS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => void save([{ section: F, slot: `custom.${cat.index}.icon`, locale: "*", value: d }])}
                  style={{ width: 38, height: 38, border: `1.5px solid ${iconNow === d ? "#d71635" : "#e3e5de"}`, borderRadius: 10, background: iconNow === d ? "#fff1f3" : "#ffffff", color: "#d71635", display: "grid", placeItems: "center" }}
                >
                  <Path d={d} size={17} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <small style={labelStyle}>{tx("builtQs")}</small>
          {builtItems.map((item, i) => (
            <div key={i} dir={dir} style={{ padding: "10px 12px", borderRadius: 8, background: "#f7f8f5", display: "flex", flexDirection: "column", gap: 4 }}>
              <b style={{ fontSize: 12.5, fontWeight: 650 }}>{item.q}</b>
              <span style={{ fontSize: 12, color: "#5b625e", textWrap: "pretty" }}>{item.a}</span>
            </div>
          ))}
          <small style={{ fontSize: 11.5, color: "#737870", textWrap: "pretty" }}>{tx("builtNote")}</small>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <small style={labelStyle}>{cat.custom ? tx("ownQs") : tx("extraQs")}</small>
        {Array.from({ length: total }, (_, i) => (
          <div key={`${i}-${lang}`} style={{ border: "1px solid #e3e5de", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: "#d71635", fontVariantNumeric: "tabular-nums" }}>{pad(i)}</b>
              <button type="button" title={tx("up")} aria-label={tx("up")} onClick={() => move(i, -1)} style={{ ...iconBtn("#4a514d", 30), opacity: i > 0 ? 1 : 0.35 }}>
                <Path d="M12 19V5M6 11l6-6 6 6" size={13} />
              </button>
              <button type="button" title={tx("down")} aria-label={tx("down")} onClick={() => move(i, 1)} style={{ ...iconBtn("#4a514d", 30), opacity: i < total - 1 ? 1 : 0.35 }}>
                <Path d="M12 5v14M6 13l6 6 6-6" size={13} />
              </button>
              <button type="button" title={tx("del")} aria-label={tx("del")} onClick={() => remove(i)} className="a-faq-del" style={iconBtn("#d71635", 30)}>
                <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" size={13} />
              </button>
            </div>
            <DraftInput value={c.value(F, `${prefix}.${i + 1}.q`, lang)} onCommit={(value) => write(i, "q", value)} dir={dir} placeholder={tx("qPh")} style={{ ...inputStyle, fontWeight: 600 }} />
            <DraftInput
              multiline
              value={c.value(F, `${prefix}.${i + 1}.a`, lang)}
              onCommit={(value) => write(i, "a", value)}
              dir={dir}
              placeholder={tx("aPh")}
              style={{ padding: "10px 12px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#1d2220", fontSize: 13, width: "100%", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
          </div>
        ))}
        <button type="button" className="a-faq-add" onClick={() => setBlank(blank + 1)}>
          <Path d="M12 5v14M5 12h14" size={14} />
          {tx("addQ")}
        </button>
        <small style={{ fontSize: 11.5, color: "#737870", textWrap: "pretty" }}>{tx("langNote")}</small>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid #eef0ea", paddingTop: 14 }}>
        <a href={catHref} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#d71635" }}>
          <ExtIcon size={13} />
          {tx("viewCat")}
        </a>
        {cat.custom ? (
          <button type="button" className="a-faq-delcat" onClick={deleteCategory}>
            {tx("delCat")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A field that keeps its own text while typing and saves the draft when left. */
function DraftInput({
  value,
  onCommit,
  multiline = false,
  ...rest
}: {
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  dir: string;
  placeholder: string;
  style: CSSProperties;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text !== value) onCommit(text);
  };
  return multiline ? (
    <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} {...rest} />
  ) : (
    <input value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} {...rest} />
  );
}

const labelStyle: CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "#4a514d" };
const inputStyle: CSSProperties = { minHeight: 40, padding: "0 12px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#1d2220", fontSize: 13, width: "100%" };

function iconBtn(color: string, size: number): CSSProperties {
  return { width: size, height: size, border: "1px solid #e3e5de", borderRadius: 7, background: "#ffffff", color, display: "grid", placeItems: "center", flex: "none" };
}

function Path({ d, size }: { d: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ExtIcon({ size }: { size: number }) {
  return <Path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" size={size} />;
}

