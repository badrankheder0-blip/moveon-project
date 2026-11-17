"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { AdminShell, HOME_SUB, useToast } from "@/app/components/admin/AdminShell";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

import { contentRef, errorText, listEdits, useContent, type Content, type ContentChange, type Loc } from "../_lib/cms";
import { usePageSubnav } from "../_lib/subnav";
import { BackLink, KIT_TEXT, LangSwitch, NumBadge, PlusIcon, UploadIcon, XIcon, kit, pad2, scrollToId, useMatch, useMediaDialog } from "../_lib/ui";

/**
 * The homepage editor: the homepage drawn on its own layout, every text,
 * photo, clip and link editable where it sits, as the admin prototype's
 * Homepage screen does it. The header and the footer are the site chrome
 * (section `chrome`); everything between is section `home`, in the order and
 * with the sections hidden that `layout.order` and `layout.hidden` say.
 *
 * Lists — hero panels, service cards, tabs, numbers, reasons, steps,
 * reviews, questions, guides — gain, lose and reorder items by renumbering
 * their slots in all four languages. All of it is "content" drafts until
 * "Save & publish".
 */

const H = "home";
const C = "chrome";

/** The movable sections, top to bottom, as the site draws them by default. */
const DEFAULT_ORDER = ["hero", "services", "compare", "area", "audiences", "stats", "myths", "marquee", "why", "story", "reviews", "faq", "guides", "cta"] as const;
type SectionId = (typeof DEFAULT_ORDER)[number];

const TEXT = defineText({
  title: { de: "Startseite", en: "Homepage", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
  sub: {
    de: "Bearbeiten Sie Texte, Bilder, Links und Bereiche Ihrer Startseite direkt auf ihrem Layout. Änderungen gehen mit „Speichern & veröffentlichen“ live.",
    en: "Edit the texts, images, links and sections of your homepage directly on its layout. Changes go live with Save & publish.",
    ar: "عدّل نصوص الصفحة الرئيسية وصورها وروابطها وأقسامها مباشرة على شكلها. تظهر التغييرات بعد «حفظ ونشر».",
    tr: "Ana sayfanızın metinlerini, görsellerini, bağlantılarını ve bölümlerini doğrudan düzeni üzerinde düzenleyin. Değişiklikler “Kaydet ve yayınla” ile yayına girer.",
  },
  back: { de: "Alle Seiten", en: "All pages", ar: "كل الصفحات", tr: "Tüm sayfalar" },
  sections: { de: "BEREICHE", en: "SECTIONS", ar: "الأقسام", tr: "BÖLÜMLER" },
  up: { de: "Nach oben", en: "Move up", ar: "نقل للأعلى", tr: "Yukarı taşı" },
  down: { de: "Nach unten", en: "Move down", ar: "نقل للأسفل", tr: "Aşağı taşı" },
  show: { de: "Bereich einblenden", en: "Show section", ar: "إظهار القسم", tr: "Bölümü göster" },
  hide: { de: "Bereich ausblenden", en: "Hide section", ar: "إخفاء القسم", tr: "Bölümü gizle" },
  hidden: { de: "Auf der Startseite ausgeblendet", en: "Hidden on the homepage", ar: "مخفي من الصفحة الرئيسية", tr: "Ana sayfada gizli" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  addLink: { de: "Link", en: "Link", ar: "رابط", tr: "Bağlantı" },
  addPanel: { de: "Feld hinzufügen", en: "Add panel", ar: "إضافة لوحة", tr: "Panel ekle" },
  addCard: { de: "Karte hinzufügen", en: "Add card", ar: "إضافة بطاقة", tr: "Kart ekle" },
  addTab: { de: "Tab hinzufügen", en: "Add tab", ar: "إضافة تبويب", tr: "Sekme ekle" },
  addPoint: { de: "Punkt hinzufügen", en: "Add point", ar: "إضافة نقطة", tr: "Madde ekle" },
  addReview: { de: "Bewertung hinzufügen", en: "Add review", ar: "إضافة تقييم", tr: "Yorum ekle" },
  addQuestion: { de: "Frage hinzufügen", en: "Add question", ar: "إضافة سؤال", tr: "Soru ekle" },
  addStep: { de: "Schritt hinzufügen", en: "Add step", ar: "إضافة خطوة", tr: "Adım ekle" },
  addPhoto: { de: "Foto hinzufügen", en: "Add photo", ar: "إضافة صورة", tr: "Fotoğraf ekle" },
  addGuide: { de: "Ratgeber hinzufügen", en: "Add guide", ar: "إضافة دليل", tr: "Rehber ekle" },
  addCardPair: { de: "Karte hinzufügen", en: "Add card", ar: "إضافة بطاقة", tr: "Kart ekle" },
  earlier: { de: "Nach vorne", en: "Move earlier", ar: "نقل للأمام", tr: "Öne al" },
  change: { de: "Bild ändern", en: "Change image", ar: "تغيير الصورة", tr: "Görseli değiştir" },
  changeVideo: { de: "Video ändern", en: "Change video", ar: "تغيير الفيديو", tr: "Videoyu değiştir" },
  changeGif: { de: "Grafik ändern", en: "Change GIF", ar: "تغيير الـ GIF", tr: "Grafiği değiştir" },
  videoUrl: { de: "Videolink (.mp4)", en: "Video link (.mp4)", ar: "رابط الفيديو (.mp4)", tr: "Video bağlantısı (.mp4)" },
  name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  moreNote: {
    de: "Bei mehr als 3 Bewertungen zeigt diese Schaltfläche den Rest. Sonst öffnet sie den Link.",
    en: "With more than 3 reviews, this button shows the rest. Otherwise it opens the link.",
    ar: "إذا كان هناك أكثر من 3 تقييمات، يعرض هذا الزر الباقي. وإلا يفتح الرابط.",
    tr: "3'ten fazla yorum varsa bu buton gerisini gösterir. Aksi halde bağlantıyı açar.",
  },
  logoNote: {
    de: "Das Logo kommt aus den Einstellungen, die Telefonnummer aus den Firmendaten. Die Menülinks erscheinen auch in der Fußzeile.",
    en: "The logo comes from Settings, the phone number from the company details. The menu links also appear in the footer.",
    ar: "الشعار يأتي من الإعدادات ورقم الهاتف من بيانات الشركة. روابط القائمة تظهر في الفوتر أيضاً.",
    tr: "Logo Ayarlar'dan, telefon numarası şirket bilgilerinden gelir. Menü bağlantıları alt bilgide de görünür.",
  },
  footerNote: {
    de: "Menülinks und die Buchen-Schaltfläche kommen aus dem Bereich „Obere Leiste & Menü“.",
    en: "Menu links and the Book button come from the Top bar & menu section.",
    ar: "روابط القائمة وزر الحجز تأتي من قسم الشريط العلوي والقائمة.",
    tr: "Menü bağlantıları ve Rezervasyon butonu “Üst çubuk ve menü” bölümünden gelir.",
  },
  phoneNote: { de: "Ohne Telefonnummer", en: "Shown without a phone number", ar: "يظهر عند غياب رقم الهاتف", tr: "Telefon numarası yokken" },
  confirmTab: { de: "Diesen Tab löschen?", en: "Delete this tab?", ar: "حذف هذا التبويب؟", tr: "Bu sekme silinsin mi?" },
  before: { de: "Vorher", en: "Before", ar: "قبل", tr: "Önce" },
  after: { de: "Nachher", en: "After", ar: "بعد", tr: "Sonra" },
  front: { de: "Vorderseite", en: "Front", ar: "الوجه", tr: "Ön yüz" },
  backSide: { de: "Rückseite", en: "Back", ar: "الخلف", tr: "Arka yüz" },
  minutes: { de: "Min.", en: "min", ar: "د", tr: "dk" },
  // Section names in the rail.
  s_header: { de: "Obere Leiste & Menü", en: "Top bar & menu", ar: "الشريط العلوي والقائمة", tr: "Üst çubuk ve menü" },
  s_hero: { de: "Hero", en: "Hero", ar: "الواجهة", tr: "Giriş" },
  s_services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  s_compare: { de: "Vorher & nachher", en: "Before & after", ar: "قبل وبعد", tr: "Önce ve sonra" },
  s_area: { de: "Servicegebiet", en: "Service area", ar: "منطقة الخدمة", tr: "Hizmet bölgesi" },
  s_audiences: { de: "Umzugsarten", en: "Moving types", ar: "أنواع النقل", tr: "Taşınma türleri" },
  s_stats: { de: "Zahlen", en: "Numbers", ar: "الأرقام", tr: "Rakamlar" },
  s_myths: { de: "Erwartungen", en: "Expectations", ar: "التوقعات", tr: "Beklentiler" },
  s_marquee: { de: "Galerie", en: "Gallery", ar: "المعرض", tr: "Galeri" },
  s_why: { de: "Warum m.on", en: "Why m.on", ar: "لماذا m.on", tr: "Neden m.on" },
  s_story: { de: "Der Umzugstag", en: "Moving day", ar: "يوم النقل", tr: "Taşınma günü" },
  s_reviews: { de: "Bewertungen", en: "Reviews", ar: "التقييمات", tr: "Yorumlar" },
  s_faq: { de: "FAQ", en: "FAQs", ar: "الأسئلة الشائعة", tr: "SSS" },
  s_guides: { de: "Ratgeber", en: "Guides", ar: "الأدلة", tr: "Rehberler" },
  s_cta: { de: "Fragen & Angebot", en: "Questions & quote", ar: "الأسئلة وطلب العرض", tr: "Sorular ve teklif" },
  s_footer: { de: "Fußzeile", en: "Footer", ar: "الفوتر", tr: "Alt bilgi" },
});

type Tx = TextFn<typeof TEXT>;

interface Editor {
  c: Content;
  lang: Loc;
  tx: Tx;
  run: (changes: ContentChange[]) => void;
  media: ReturnType<typeof useMediaDialog>[0];
}

const EditorContext = createContext<Editor | null>(null);
const useEditor = () => useContext(EditorContext)!;

const EYE_ON = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";
const EYE_OFF = "M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.6-.6 5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2";
const SOCIAL: Record<string, string> = {
  instagram: "M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h0",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.4 4.6 5 5",
  twitter: "M4 4l16 16M20 4L4 20",
  facebook: "M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3.5H8V21h3.5v-7.5H14l.8-3.5h-3.3V7.8c0-.7.5-1.3 1.2-1.3H15z",
};

const OUTFIT = "'Outfit','IBM Plex Sans Arabic',sans-serif";
const URL_STYLE: CSSProperties = { width: "100%", minWidth: 0, height: 22, padding: "0 6px", border: "1px solid #e3e5de", borderRadius: 5, background: "#fafaf7", color: "#737870", font: "10px ui-monospace,Menlo,monospace" };
const ADD_STYLE: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, border: "1px dashed #d71635", background: "#fff6f6", color: "#d71635", fontSize: 12, fontWeight: 600 };
const PILL_BTN: CSSProperties = { minHeight: 24, padding: "0 8px", border: 0, borderRadius: 999, background: "#ffffffeb", color: "#737870", fontSize: 10.5, fontWeight: 600 };
const CHANGE_BTN: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, minHeight: 24, padding: "0 9px", border: 0, borderRadius: 999, background: "#ffffffeb", color: "#252b28", fontSize: 10.5, fontWeight: 600, boxShadow: "0 1px 4px #0000002e", whiteSpace: "nowrap" };

export default function HomepageEditorPage() {
  const subnav = usePageSubnav(HOME_SUB);

  return (
    <AdminShell view="home" pages={subnav}>
      <HomepageEditor />
    </AdminShell>
  );
}

function HomepageEditor() {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const c = useContent();
  const stack = useMatch("(max-width: 1179px)");
  const rtl = locale === "ar";
  // The prototype opens the editor in English whatever the admin language.
  const [lang, setLang] = useState<Loc>("en");
  const [openMedia, mediaDialog] = useMediaDialog();

  const run = (changes: ContentChange[]) => {
    c.save(changes).catch((error) => toast(errorText(error, kx("saveFailed"))));
  };

  const order = useMemo(() => {
    const saved = c.value(H, "layout.order", "de").split(",").map((id) => id.trim()).filter((id): id is SectionId => (DEFAULT_ORDER as readonly string[]).includes(id));
    return [...new Set([...saved, ...DEFAULT_ORDER])];
  }, [c]);
  const hidden = useMemo(() => new Set(c.value(H, "layout.hidden", "de").split(",").map((id) => id.trim()).filter(Boolean)), [c]);

  const move = (id: SectionId, dir: -1 | 1) => {
    const next = [...order];
    const i = next.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    next[i] = next[j]!;
    next[j] = id;
    // The default order is stored as nothing, so the site keeps following
    // the design if sections are added to it later.
    run([{ section: H, slot: "layout.order", locale: "*", value: next.join(",") === DEFAULT_ORDER.join(",") ? "" : next.join(",") }]);
  };
  const toggle = (id: SectionId) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    run([{ section: H, slot: "layout.hidden", locale: "*", value: DEFAULT_ORDER.filter((key) => next.has(key)).join(",") }]);
  };

  const rail: { id: string; name: string; movable: boolean }[] = [
    { id: "header", name: tx("s_header"), movable: false },
    ...order.map((id) => ({ id, name: tx(`s_${id}` as keyof typeof TEXT), movable: true })),
    { id: "footer", name: tx("s_footer"), movable: false },
  ];

  const editor: Editor = { c, lang, tx, run, media: openMedia };

  return (
    <EditorContext.Provider value={editor}>
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <BackLink label={tx("back")} rtl={rtl} onClick={() => router.push(`/${locale}${ADMIN_PATHS.pages}`)} style={{ marginBottom: 10 }} />
            <div className="a-page-head" style={{ display: "block" }}>
              <h1 style={{ lineHeight: 1.2 }}>{tx("title")}</h1>
              <p style={{ maxWidth: 620 }}>{tx("sub")}</p>
            </div>
          </div>
          <LangSwitch value={lang} onChange={setLang} pad={14} />
        </div>

        {c.error ? <p className="a-note is-error">{kx("loadFailed")}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: stack ? "minmax(0,1fr)" : "232px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
          <aside style={{ position: stack ? "static" : "sticky", top: 84, display: "flex", flexDirection: "column", gap: 1, padding: 10, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308" }}>
            <span style={{ padding: "4px 8px 8px", fontSize: 9.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#92958e" }}>{tx("sections")}</span>
            {rail.map((row, i) => {
              const isHidden = row.movable && hidden.has(row.id);
              const k = order.indexOf(row.id as SectionId);
              return (
                <div key={row.id} className={kit.railRow} style={{ display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", borderRadius: 8, opacity: isHidden ? 0.55 : 1 }}>
                  <button type="button" onClick={() => scrollToId(`hm-${row.id}`)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, padding: "6px 2px", border: 0, background: "transparent", textAlign: "start", color: "#252b28", fontSize: 12.5, fontWeight: 550 }}>
                    <NumBadge n={pad2(i + 1)} />
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                  </button>
                  {row.movable ? (
                    <>
                      <RailIcon label={tx("up")} d="M6 15l6-6 6 6" disabled={k <= 0} onClick={() => move(row.id as SectionId, -1)} />
                      <RailIcon label={tx("down")} d="M6 9l6 6 6-6" disabled={k === order.length - 1} onClick={() => move(row.id as SectionId, 1)} />
                      <RailIcon label={isHidden ? tx("show") : tx("hide")} d={isHidden ? EYE_OFF : EYE_ON} color={isHidden ? "#b7122b" : "#737870"} size={15} width={1.9} box={26} onClick={() => toggle(row.id as SectionId)} />
                    </>
                  ) : null}
                </div>
              );
            })}
          </aside>

          <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minWidth: 0, background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 12, boxShadow: "0 12px 36px #202a2308", overflow: "hidden", fontFamily: "'DM Sans','IBM Plex Sans Arabic',sans-serif", color: "#1d2220" }}>
            {c.loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="a-skel" style={{ height: 40 }} />
                ))}
              </div>
            ) : (
              rail.map((row, i) => (
                <Frame key={row.id} id={row.id} n={pad2(i + 1)} name={row.name} hidden={row.movable && hidden.has(row.id)}>
                  {SECTIONS[row.id as keyof typeof SECTIONS]()}
                </Frame>
              ))
            )}
          </div>
        </div>
      </section>
      {mediaDialog}
    </EditorContext.Provider>
  );
}

function RailIcon({ label, d, onClick, disabled, color = "#737870", size = 13, width = 2.2, box = 24 }: { label: string; d: string; onClick: () => void; disabled?: boolean; color?: string; size?: number; width?: number; box?: number }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={kit.eye} style={{ width: box, height: box === 24 ? 26 : box, display: "grid", placeItems: "center", border: 0, borderRadius: 6, background: "transparent", color, padding: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}

function Frame({ id, n, name, hidden, children }: { id: string; n: string; name: string; hidden: boolean; children: ReactNode }) {
  const { tx } = useEditor();
  return (
    <div id={`hm-${id}`} style={{ scrollMarginTop: 84, borderTop: n === "01" ? 0 : "1px solid #eef0ea" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "#fafaf7", borderBottom: "1px solid #eef0ea", fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif" }}>
        <NumBadge n={n} />
        <b style={{ fontSize: 12.5, fontWeight: 650 }}>{name}</b>
        {hidden ? <span style={{ padding: "3px 8px", borderRadius: 999, background: "#f1f1ea", color: "#737870", fontSize: 10.5, fontWeight: 650 }}>{tx("hidden")}</span> : null}
      </div>
      <div style={{ opacity: hidden ? 0.45 : 1 }}>{children}</div>
    </div>
  );
}

// ── Inline fields ─────────────────────────────────────────────────────

/** A text drawn where the site draws it; a dashed outline on hover, yellow once changed. */
function T({ s = H, slot, area, rows = 2, style, light, ph }: { s?: string; slot: string; area?: boolean; rows?: number; style?: CSSProperties; light?: boolean; ph?: string }) {
  const { c, lang, run } = useEditor();
  const [typing, setTyping] = useState<string | null>(null);
  const current = c.value(s, slot, lang);
  const edited = c.edited(s, slot, lang);
  const placeholder = ph ?? (lang === "en" ? "" : c.value(s, slot, "en"));
  const className = `${light ? kit.edLight : kit.ed}${edited ? ` ${kit.is}` : ""}`;
  const base: CSSProperties = { width: "100%", minWidth: 0, padding: "3px 6px", borderRadius: 6, background: "transparent", color: "#1d2220", ...style };
  const commit = () => {
    if (typing !== null && typing !== current) run([{ section: s, slot, locale: lang, value: typing }]);
    setTyping(null);
  };
  return area ? (
    <textarea
      className={`${className} ${kit.areaAuto}`}
      rows={rows}
      value={typing ?? current}
      placeholder={placeholder}
      onChange={(event) => setTyping(event.target.value)}
      onBlur={commit}
      style={{ font: "inherit", lineHeight: 1.55, resize: "none", overflow: "hidden", ...base }}
    />
  ) : (
    <input className={className} value={typing ?? current} placeholder={placeholder} onChange={(event) => setTyping(event.target.value)} onBlur={commit} style={base} />
  );
}

/** A link, a date or another value every language shares: a small grey box. */
function U({ s = H, slot, style, ph = "https://", type }: { s?: string; slot: string; style?: CSSProperties; ph?: string; type?: "date" }) {
  const { c, run } = useEditor();
  const [typing, setTyping] = useState<string | null>(null);
  const current = c.value(s, slot, "de");
  const edited = c.edited(s, slot, "de");
  const commit = () => {
    if (typing !== null && typing.trim() !== current) run([{ section: s, slot, locale: "*", value: typing.trim() }]);
    setTyping(null);
  };
  return (
    <input
      dir="ltr"
      type={type ?? "text"}
      className={`${kit.url}${edited ? ` ${kit.is}` : ""}`}
      value={typing ?? current}
      placeholder={ph}
      onChange={(event) => (type === "date" ? run([{ section: s, slot, locale: "*", value: event.target.value }]) : setTyping(event.target.value))}
      onBlur={commit}
      style={{ ...URL_STYLE, ...style }}
    />
  );
}

/** "Change image" and "Reset" for a photo or clip slot. */
function MediaTools({ s = H, slot, kind = "image", label, style, plain }: { s?: string; slot: string; kind?: "image" | "video"; label?: string; style?: CSSProperties; plain?: boolean }) {
  const { c, tx, run, media } = useEditor();
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const value = c.value(s, slot, "de");
  const edited = c.edited(s, slot, "de");
  const original = c.original(s, slot);
  const restorable = !edited && original !== undefined && original !== value;
  const btn: CSSProperties = plain ? { ...CHANGE_BTN, border: "1px solid #e3e5de", background: "#ffffff", boxShadow: "none" } : CHANGE_BTN;
  return (
    <span style={{ display: "flex", gap: 4, ...style }}>
      {edited || restorable ? (
        <button
          type="button"
          style={PILL_BTN}
          onClick={() =>
            edited ? c.revert([contentRef(s, slot, "*")]).catch((error) => toast(errorText(error, kx("saveFailed")))) : run([{ section: s, slot, locale: "*", value: original! }])
          }
        >
          {edited ? kx("reset") : kx("useOriginal")}
        </button>
      ) : null}
      <button type="button" style={btn} onClick={() => media({ kind, current: value, onApply: (url) => c.save([{ section: s, slot, locale: "*", value: url }]) })}>
        <UploadIcon size={11} />
        {label ?? (kind === "video" ? tx("changeVideo") : tx("change"))}
      </button>
    </span>
  );
}

function RemoveDot({ onClick, size = 18, style }: { onClick: () => void; size?: number; style?: CSSProperties }) {
  const { tx } = useEditor();
  return (
    <button type="button" aria-label={tx("remove")} title={tx("remove")} onClick={onClick} className={kit.dot} style={{ display: "grid", placeItems: "center", width: size, height: size, border: 0, borderRadius: "50%", background: "#ffffff", color: "#737870", boxShadow: "0 1px 4px #0000001f", padding: 0, ...style }}>
      <XIcon size={size > 20 ? 10 : 9} />
    </button>
  );
}

function AddLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 28, padding: "0 10px", border: "1px dashed #d71635", borderRadius: 7, background: "#fff6f6", color: "#d71635", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <PlusIcon />
      {label}
    </button>
  );
}

function AddTile({ onClick, label, style }: { onClick: () => void; label: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={{ ...ADD_STYLE, ...style }}>
      <PlusIcon size={16} width={2.4} />
      {label}
    </button>
  );
}

/** A list of the section, with its add, remove and reorder. */
function useList(s: string, prefix: string, fields: readonly string[]) {
  const { c, run } = useEditor();
  const edits = listEdits(c, s, prefix, fields);
  return {
    items: Array.from({ length: edits.count }, (_, i) => i + 1),
    count: edits.count,
    remove: (i: number) => run(edits.remove(i)),
    earlier: (i: number) => run(edits.swap(i - 1, i)),
    add: () => run(edits.add()),
  };
}

const EYEBROW = (center?: boolean): CSSProperties => ({ color: "#d71635", fontSize: 10, fontWeight: 700, letterSpacing: "var(--a-ls-eye)", textAlign: center ? "center" : "start" });
const TITLE = (size: number, center?: boolean): CSSProperties => ({ fontFamily: OUTFIT, fontSize: size, fontWeight: 700, lineHeight: 1.2, textAlign: center ? "center" : "start" });
const BODY = (center?: boolean): CSSProperties => ({ color: "#5b625e", fontSize: 13, lineHeight: 1.55, textAlign: center ? "center" : "start" });

function Head({ prefix, center = true, sub = true, title = 24, max = 560 }: { prefix: string; center?: boolean; sub?: boolean; title?: number; max?: number }) {
  return (
    <div style={{ padding: "26px 16px 10px", display: "flex", flexDirection: "column", gap: 6, alignItems: center ? "center" : "stretch", textAlign: center ? "center" : "start" }}>
      <T slot={`${prefix}.eyebrow`} style={{ ...EYEBROW(center), maxWidth: 420 }} />
      <T slot={`${prefix}.title`} style={{ ...TITLE(title, center), maxWidth: max }} />
      {sub ? <T slot={`${prefix}.sub`} area style={{ ...BODY(center), maxWidth: 560 }} /> : null}
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────

function HeaderSection() {
  const { tx } = useEditor();
  const site = useSiteSettings();
  const top = useList(C, "topbar.links", ["label", "href"]);
  const nav = useList(C, "nav.links", ["label", "href"]);
  return (
    <>
      <div style={{ background: "#e9ecef", padding: "8px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          {top.items.map((i) => (
            <div key={i} style={{ position: "relative", width: 118, display: "flex", flexDirection: "column", gap: 3 }}>
              <T s={C} slot={`topbar.links.${i}.label`} style={{ color: "#4a514d", fontSize: 11.5 }} />
              <U s={C} slot={`topbar.links.${i}.href`} style={{ border: "1px solid #d3d7db", background: "#f6f7f8" }} />
              <span style={{ position: "absolute", top: -6, insetInlineEnd: -6 }}>
                <RemoveDot onClick={() => top.remove(i)} />
              </span>
            </div>
          ))}
          <AddLink onClick={top.add} label={tx("addLink")} />
        </div>
        <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 3 }}>
          <span dir="ltr" style={{ padding: "3px 6px", color: "#4a514d", fontSize: 11.5, textAlign: "end", fontWeight: 600 }}>
            {site.phone}
          </span>
          <T s={C} slot="topbar.phone" style={{ color: "#737870", fontSize: 10.5, textAlign: "end" }} ph={tx("phoneNote")} />
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <img src={site.logo} alt="m.on" style={{ height: 44, width: "auto", display: "block" }} />
        <div style={{ flex: 1, minWidth: 280, display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderRadius: 22, background: "#f1f3f5" }}>
          <div style={{ width: 96 }}>
            <T s={C} slot="nav.home" style={{ fontSize: 12, fontWeight: 600 }} />
          </div>
          {nav.items.map((i) => (
            <div key={i} style={{ position: "relative", width: 96, display: "flex", flexDirection: "column", gap: 3 }}>
              <T s={C} slot={`nav.links.${i}.label`} style={{ fontSize: 12, fontWeight: 600 }} />
              <U s={C} slot={`nav.links.${i}.href`} ph="#" style={{ background: "#ffffff" }} />
              <span style={{ position: "absolute", top: -6, insetInlineEnd: -6 }}>
                <RemoveDot onClick={() => nav.remove(i)} />
              </span>
            </div>
          ))}
          <AddLink onClick={nav.add} label={tx("addLink")} />
          <span style={{ flex: 1 }} />
          <div style={{ width: 110 }}>
            <T s={C} slot="nav.login" style={{ fontSize: 12, fontWeight: 600 }} />
          </div>
          <div style={{ width: 130, display: "flex", flexDirection: "column", gap: 3 }}>
            <T s={C} slot="nav.book" style={{ height: 32, padding: "0 12px", borderRadius: 999, background: "#d71635", color: "#ffffff", fontSize: 12.5, fontWeight: 600, textAlign: "center" }} />
            <U s={C} slot="nav.bookHref" style={{ background: "#ffffff" }} />
          </div>
        </div>
      </div>
      <p dir="auto" style={{ padding: "0 16px 12px", fontSize: 11, color: "#92958e", fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif" }}>
        {tx("logoNote")}
      </p>
    </>
  );
}

function HeroSection() {
  const { c, tx } = useEditor();
  const panels = useList(H, "hero", ["label", "title", "short", "href", "poster", "video"]);
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 4, borderRadius: 12, overflow: "hidden" }}>
        {panels.items.map((i) => {
          const video = c.value(H, `hero.${i}.video`, "de");
          const poster = c.value(H, `hero.${i}.poster`, "de");
          return (
            <div key={i} style={{ position: "relative", height: 300, background: "#e9ecef" }}>
              {video ? (
                <video key={video} src={video} poster={poster} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : poster ? (
                <img src={poster} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,#00000040 0%,#0000 30%,#0000 45%,#000000b3 100%)" }} />
              <div style={{ position: "absolute", top: 8, insetInline: 8, display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
                <RemoveDot onClick={() => panels.remove(i)} size={24} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <MediaTools slot={`hero.${i}.video`} kind="video" />
                  <MediaTools slot={`hero.${i}.poster`} />
                </span>
              </div>
              <div style={{ position: "absolute", bottom: 10, insetInline: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, paddingInlineEnd: 6, borderRadius: 999, background: "#d71635", maxWidth: "100%" }}>
                  <b style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: "50%", background: "#ffffff", color: "#d71635", fontSize: 9, fontWeight: 700, flex: "none" }}>{pad2(i)}</b>
                  <T slot={`hero.${i}.label`} light style={{ padding: "1px 4px", borderRadius: 999, color: "#ffffff", fontFamily: OUTFIT, fontSize: 12.5, fontWeight: 600 }} />
                </span>
                <T slot={`hero.${i}.title`} light area style={{ color: "#ffffff", fontFamily: OUTFIT, fontSize: 13, fontWeight: 600, lineHeight: 1.25 }} />
                <T slot={`hero.${i}.short`} light area style={{ color: "#ffffffd9", fontSize: 11, lineHeight: 1.4 }} />
                <U slot={`hero.${i}.href`} style={{ border: 0, background: "#ffffffe0" }} />
                <U slot={`hero.${i}.video`} ph={tx("videoUrl")} style={{ border: 0, background: "#ffffffe0" }} />
              </div>
            </div>
          );
        })}
        {panels.count < 4 ? <AddTile onClick={panels.add} label={tx("addPanel")} style={{ height: 300 }} /> : null}
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "22px 0 8px", flexWrap: "wrap" }}>
        {c.value(H, "hero.slogan", "de") ? <img src={c.value(H, "hero.slogan", "de")} alt="" style={{ display: "block", width: "min(320px,70%)", height: "auto" }} /> : null}
        <MediaTools slot="hero.slogan" label={tx("changeGif")} plain />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", paddingBottom: 6 }}>
        <div style={{ width: 200 }}>
          <T slot="hero.sloganAlt" style={{ color: "#737870", fontSize: 11.5, textAlign: "center" }} />
        </div>
        <div style={{ width: 160 }}>
          <T slot="hero.cta" style={{ height: 30, borderRadius: 999, background: "#ffffff", border: "1px solid #e3e5de", fontSize: 12, fontWeight: 600, textAlign: "center" }} />
        </div>
      </div>
    </div>
  );
}

function ServicesSection() {
  const { c, tx, lang } = useEditor();
  const cards = useList(H, "services", ["title", "link", "href", "img"]);
  return (
    <>
      <div style={{ padding: "26px 16px 24px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>
        <T slot="services.title" style={{ ...TITLE(26, true), maxWidth: 520 }} />
        <T slot="services.sub" area style={{ ...BODY(true), maxWidth: 560 }} />
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 16px 20px", scrollbarWidth: "thin" }}>
        {cards.items.map((i) => (
          <div key={i} style={{ flex: "none", width: 200, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ position: "relative", height: 250, borderRadius: 12, overflow: "hidden", background: "#2a2f2c" }}>
              {c.value(H, `services.${i}.img`, "de") ? <img src={c.value(H, `services.${i}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,#000000a6 0%,#0000 36%,#0000 60%,#000000b3 100%)" }} />
              <div style={{ position: "absolute", top: 10, insetInline: 10 }}>
                <T slot={`services.${i}.title`} light area style={{ color: "#ffffff", fontFamily: OUTFIT, fontSize: 16, fontWeight: 600, lineHeight: 1.2 }} />
              </div>
              <div style={{ position: "absolute", bottom: 10, insetInline: 10 }}>
                <T slot={`services.${i}.link`} light style={{ color: "#ffffff", fontSize: 11.5, fontWeight: 600 }} />
              </div>
              <div style={{ position: "absolute", top: 70, insetInline: 10, display: "flex", justifyContent: "space-between", gap: 4 }}>
                <span style={{ display: "flex", gap: 3 }}>
                  <RemoveDot onClick={() => cards.remove(i)} size={22} style={{ boxShadow: "none" }} />
                  <button type="button" aria-label={tx("earlier")} title={tx("earlier")} disabled={i === 1} onClick={() => cards.earlier(i)} style={{ display: "grid", placeItems: "center", width: 22, height: 22, border: 0, borderRadius: "50%", background: "#ffffff", color: "#737870", padding: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scaleX(${lang === "ar" ? -1 : 1})` }} aria-hidden="true">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                </span>
                <MediaTools slot={`services.${i}.img`} style={{ transform: "scale(.92)", transformOrigin: "top right" }} />
              </div>
            </div>
            <U slot={`services.${i}.href`} />
          </div>
        ))}
        <AddTile onClick={cards.add} label={tx("addCard")} style={{ flex: "none", width: 140, height: 250, borderRadius: 12 }} />
      </div>
    </>
  );
}

function CompareSection() {
  const { c, tx } = useEditor();
  return (
    <>
      <Head prefix="compare" />
      <div style={{ padding: "6px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 }}>
        {(["before", "after"] as const).map((side) => (
          <div key={side} style={{ position: "relative", aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", background: "#e9ecef" }}>
            {c.value(H, `compare.${side}`, "de") ? <img src={c.value(H, `compare.${side}`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            <span style={{ position: "absolute", top: 8, insetInlineStart: 8, padding: "2px 8px", borderRadius: 999, background: "#252b28", color: "#fff", fontSize: 10, fontWeight: 700 }}>{tx(side)}</span>
            <MediaTools slot={`compare.${side}`} style={{ position: "absolute", top: 8, insetInlineEnd: 8 }} />
            <div style={{ position: "absolute", bottom: 10, insetInline: 10, padding: 2, borderRadius: 8, background: "#000000a6" }}>
              <T slot={`compare.${side}Label`} light style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AreaSection() {
  const { c } = useEditor();
  return (
    <div style={{ padding: "22px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 20, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        {c.value(H, "area.img", "de") ? <img src={c.value(H, "area.img", "de")} alt="" style={{ display: "block", width: "100%", maxWidth: 380, height: "auto", margin: "0 auto", mixBlendMode: "multiply" }} /> : null}
        <MediaTools slot="area.img" plain style={{ position: "absolute", top: 0, insetInlineEnd: 0 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <T slot="area.eyebrow" style={EYEBROW()} />
        <T slot="area.title" area rows={3} style={TITLE(23)} />
        <T slot="area.body" area rows={6} style={{ ...BODY(), lineHeight: 1.6 }} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 6, alignItems: "center" }}>
          <T slot="area.link" style={{ color: "#d71635", fontSize: 12.5, fontWeight: 700 }} />
          <U slot="area.href" style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

function AudiencesSection() {
  const { c, tx, lang } = useEditor();
  const tabs = useList(H, "audiences", ["tab", "title", "body", "linkText", "linkHref", "after", "btn", "btnHref", "img"]);
  const [picked, setPicked] = useState(1);
  const cur = Math.min(Math.max(1, picked), Math.max(1, tabs.count));
  const p = `audiences.${cur}`;
  return (
    <>
      <div style={{ padding: "26px 16px 24px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>
        <T slot="audiences.eyebrow" style={{ ...EYEBROW(true), maxWidth: 420 }} />
        <T slot="audiences.title" style={{ ...TITLE(24, true), maxWidth: 560 }} />
        <T slot="audiences.sub" area style={{ ...BODY(true), maxWidth: 520 }} />
        <div style={{ width: "100%", maxWidth: 640, marginTop: 10, display: "flex", alignItems: "stretch" }}>
          {tabs.items.map((i) => (
            <div key={i} onClick={() => setPicked(i)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 2, padding: "6px 4px", borderBottom: `2px solid ${i === cur ? "#d71635" : "#e3e5e3"}`, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }} onFocus={() => setPicked(i)}>
                <T slot={`audiences.${i}.tab`} style={{ color: i === cur ? "#d71635" : "#1d2220", fontSize: 12.5, fontWeight: 600, textAlign: "center" }} />
              </div>
              <button
                type="button"
                aria-label={tx("remove")}
                title={tx("remove")}
                className={kit.dot}
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm(tx("confirmTab"))) {
                    tabs.remove(i);
                    setPicked(1);
                  }
                }}
                style={{ display: "grid", placeItems: "center", width: 18, height: 18, border: 0, borderRadius: "50%", background: "transparent", color: "#a0a49c", padding: 0, flex: "none" }}
              >
                <XIcon />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label={tx("addTab")}
            title={tx("addTab")}
            onClick={() => {
              tabs.add();
              setPicked(tabs.count + 1);
            }}
            style={{ flex: "none", display: "grid", placeItems: "center", width: 34, border: 0, borderBottom: "2px dashed #d71635", background: "#fff6f6", color: "#d71635", padding: 0 }}
          >
            <PlusIcon size={12} />
          </button>
        </div>
      </div>
      {tabs.count ? (
        <div key={`${cur}-${lang}`} style={{ padding: "0 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 20, alignItems: "center" }}>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3", background: "#e9ecef" }}>
            {c.value(H, `${p}.img`, "de") ? <img src={c.value(H, `${p}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            <span style={{ position: "absolute", bottom: 0, insetInlineStart: 0, width: 34, height: 34, background: "#d71635", borderStartEndRadius: 10 }} />
            <MediaTools slot={`${p}.img`} style={{ position: "absolute", top: 8, insetInlineEnd: 8 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <T slot={`${p}.title`} area style={TITLE(22)} />
            <T slot={`${p}.body`} area rows={4} style={{ ...BODY(), lineHeight: 1.6 }} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "4px 6px" }}>
              <T slot={`${p}.linkText`} style={{ color: "#d71635", fontSize: 13, textDecoration: "underline" }} />
              <T slot={`${p}.after`} style={{ color: "#5b625e", fontSize: 13 }} />
              <U slot={`${p}.linkHref`} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <div style={{ width: 210, maxWidth: "100%" }}>
                <T slot={`${p}.btn`} style={{ height: 38, padding: "0 14px", border: "1.5px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#d71635", fontSize: 12.5, fontWeight: 700 }} />
              </div>
              <U slot={`${p}.btnHref`} style={{ flex: 1, minWidth: 140, width: "auto", height: 24 }} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StatsSection() {
  const stats = useList(H, "stats", ["value", "label"]);
  return (
    <div style={{ padding: "24px 16px", display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "clamp(18px,5vw,60px)", flexWrap: "wrap" }}>
      {stats.items.map((i) => (
        <div key={i} style={{ position: "relative", width: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ width: 96, height: 96, display: "grid", placeItems: "center", border: "1.5px solid #b9bdbb", borderRadius: "50%" }}>
            <div style={{ width: 84 }}>
              <T slot={`stats.${i}.value`} style={{ padding: "3px 4px", fontFamily: OUTFIT, fontSize: 19, fontWeight: 600, textAlign: "center" }} />
            </div>
          </span>
          <T slot={`stats.${i}.label`} style={{ color: "#8a8f8c", fontFamily: OUTFIT, fontSize: 14, textAlign: "center" }} />
          <span style={{ position: "absolute", top: 0, insetInlineEnd: 2 }}>
            <RemoveDot onClick={() => stats.remove(i)} size={20} />
          </span>
        </div>
      ))}
      {stats.count < 4 ? (
        <button type="button" onClick={stats.add} style={{ width: 96, height: 96, display: "grid", placeItems: "center", border: "1px dashed #d71635", borderRadius: "50%", background: "#fff6f6", color: "#d71635", padding: 0 }}>
          <PlusIcon size={16} width={2.4} />
        </button>
      ) : null}
    </div>
  );
}

function MythsSection() {
  const { tx } = useEditor();
  const cards = useList(H, "myths", ["front", "back"]);
  return (
    <>
      <Head prefix="myths" />
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", padding: "0 16px 8px" }}>
        {(["frontLabel", "backLabel", "hint"] as const).map((slot) => (
          <div key={slot} style={{ width: 170 }}>
            <T slot={`myths.${slot}`} style={{ color: "#737870", fontSize: 10.5, fontWeight: 700, letterSpacing: "var(--a-ls-eye)", textAlign: "center", background: "#f5f5f0" }} />
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 12 }}>
        {cards.items.map((i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: "1px solid #eceeea", boxShadow: "0 10px 28px #1d22200d" }}>
            <div style={{ padding: "14px 12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              <small style={{ fontSize: 9.5, fontWeight: 700, color: "#92958e", letterSpacing: "var(--a-ls-eye)" }}>{tx("front")}</small>
              <T slot={`myths.${i}.front`} area rows={3} style={{ fontFamily: OUTFIT, fontSize: 14, fontWeight: 600, lineHeight: 1.35 }} />
            </div>
            <div style={{ padding: "10px 12px 14px", background: "#d71635", display: "flex", flexDirection: "column", gap: 4 }}>
              <small style={{ fontSize: 9.5, fontWeight: 700, color: "#ffffffcc", letterSpacing: "var(--a-ls-eye)" }}>{tx("backSide")}</small>
              <T slot={`myths.${i}.back`} area rows={3} light style={{ color: "#ffffff", fontSize: 12.5, lineHeight: 1.5 }} />
            </div>
            <span style={{ position: "absolute", top: 8, insetInlineEnd: 8 }}>
              <RemoveDot onClick={() => cards.remove(i)} size={20} />
            </span>
          </div>
        ))}
        <AddTile onClick={cards.add} label={tx("addCardPair")} style={{ minHeight: 160, borderRadius: 12 }} />
      </div>
    </>
  );
}

function GallerySection() {
  const { c, tx } = useEditor();
  const items = useList(H, "marquee", ["img", "label", "href"]);
  return (
    <>
      <Head prefix="marquee" />
      <div style={{ padding: "6px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,150px),1fr))", gap: 10 }}>
        {items.items.map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 10, overflow: "hidden", background: "#e9ecef" }}>
              {c.value(H, `marquee.${i}.img`, "de") ? <img src={c.value(H, `marquee.${i}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,#0000 50%,#000000b3 100%)" }} />
              <span style={{ position: "absolute", top: 6, insetInlineStart: 6 }}>
                <RemoveDot onClick={() => items.remove(i)} size={20} />
              </span>
              <MediaTools slot={`marquee.${i}.img`} style={{ position: "absolute", top: 6, insetInlineEnd: 6, transform: "scale(.9)", transformOrigin: "top right" }} />
              <div style={{ position: "absolute", bottom: 6, insetInline: 6 }}>
                <T slot={`marquee.${i}.label`} light style={{ color: "#ffffff", fontSize: 11.5, fontWeight: 600 }} />
              </div>
            </div>
            <U slot={`marquee.${i}.href`} />
          </div>
        ))}
        <AddTile onClick={items.add} label={tx("addPhoto")} style={{ aspectRatio: "4/5", borderRadius: 10 }} />
      </div>
    </>
  );
}

function WhySection() {
  const { c, tx } = useEditor();
  const items = useList(H, "why", ["title", "text", "img"]);
  return (
    <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <T slot="why.eyebrow" style={{ ...EYEBROW(), maxWidth: 420 }} />
      <T slot="why.title" style={{ ...TITLE(24), maxWidth: 600 }} />
      <T slot="why.sub" area style={{ ...BODY(), maxWidth: 600 }} />
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,210px),1fr))", gap: "18px 20px" }}>
        {items.items.map((i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
            {c.value(H, `why.${i}.img`, "de") ? (
              <div style={{ position: "relative", aspectRatio: "16/10", borderRadius: 10, overflow: "hidden", background: "#e9ecef", marginBottom: 4 }}>
                <img src={c.value(H, `why.${i}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <MediaTools slot={`why.${i}.img`} style={{ position: "absolute", bottom: 6, insetInlineEnd: 6, transform: "scale(.9)", transformOrigin: "bottom right" }} />
              </div>
            ) : null}
            <span dir="ltr" style={{ fontFamily: "'Outfit',sans-serif", fontSize: 44, fontWeight: 500, lineHeight: 1, color: "transparent", WebkitTextStroke: "1.1px #d71635", paddingInline: 6, textAlign: "start" }}>
              {pad2(i)}
            </span>
            <T slot={`why.${i}.title`} style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }} />
            <T slot={`why.${i}.text`} area rows={4} style={{ ...BODY(), fontSize: 12.5 }} />
            <span style={{ position: "absolute", top: 4, insetInlineEnd: 0 }}>
              <RemoveDot onClick={() => items.remove(i)} size={20} />
            </span>
          </div>
        ))}
        <AddTile onClick={items.add} label={tx("addPoint")} style={{ minHeight: 120, borderRadius: 10 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,260px) minmax(0,260px)", gap: 6, alignItems: "center", marginTop: 12 }}>
        <T slot="why.link" style={{ color: "#d71635", fontSize: 12.5, fontWeight: 700 }} />
        <U slot="why.href" style={{ height: 24 }} />
      </div>
    </div>
  );
}

function StorySection() {
  const { c, tx } = useEditor();
  const steps = useList(H, "story", ["time", "title", "text", "img"]);
  return (
    <>
      <Head prefix="story" />
      <div style={{ padding: "6px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,230px),1fr))", gap: 12 }}>
        {steps.items.map((i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, padding: 10, border: "1px solid #eceeea", borderRadius: 12 }}>
            <div style={{ position: "relative", aspectRatio: "16/10", borderRadius: 8, overflow: "hidden", background: "#e9ecef" }}>
              {c.value(H, `story.${i}.img`, "de") ? <img src={c.value(H, `story.${i}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              <MediaTools slot={`story.${i}.img`} style={{ position: "absolute", top: 6, insetInlineEnd: 6, transform: "scale(.9)", transformOrigin: "top right" }} />
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 70 }}>
                <T slot={`story.${i}.time`} style={{ color: "#d71635", fontFamily: OUTFIT, fontSize: 13, fontWeight: 700 }} />
              </div>
              <T slot={`story.${i}.title`} style={{ fontSize: 13.5, fontWeight: 700 }} />
            </div>
            <T slot={`story.${i}.text`} area rows={3} style={{ ...BODY(), fontSize: 12.5 }} />
            <span style={{ position: "absolute", top: -6, insetInlineEnd: -6 }}>
              <RemoveDot onClick={() => steps.remove(i)} size={20} />
            </span>
          </div>
        ))}
        <AddTile onClick={steps.add} label={tx("addStep")} style={{ minHeight: 200, borderRadius: 12 }} />
      </div>
    </>
  );
}

function ReviewsSection() {
  const { c, tx, lang } = useEditor();
  const items = useList(H, "reviews", ["text", "name", "date"]);
  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "·";
  return (
    <>
      <div style={{ padding: "26px 16px 10px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>
        <T slot="reviews.eyebrow" style={{ ...EYEBROW(true), maxWidth: 420 }} />
        <T slot="reviews.title" style={{ ...TITLE(24, true), maxWidth: 600 }} />
        <T slot="reviews.sub" style={{ ...BODY(true), maxWidth: 520 }} />
      </div>
      <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 12 }}>
        {items.items.map((i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, padding: "16px 14px 14px", border: "1px solid #eceeea", borderRadius: 12, background: "#ffffff", boxShadow: "0 10px 28px #1d22200d" }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 0.6, height: 14, color: "#d71635", paddingInline: 6 }}>“</span>
            <T slot={`reviews.${i}.text`} area rows={5} style={{ fontSize: 12.5, lineHeight: 1.6 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#eef0f1", color: "#d71635", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700, flex: "none" }}>{initials(c.value(H, `reviews.${i}.name`, lang))}</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <T slot={`reviews.${i}.name`} ph={tx("name")} style={{ padding: "2px 6px", fontSize: 12.5, fontWeight: 700 }} />
                <U slot={`reviews.${i}.date`} type="date" ph="" style={{ height: 24, fontSize: 10.5, fontFamily: "inherit" }} />
              </div>
            </div>
            <span style={{ position: "absolute", top: 8, insetInlineEnd: 8 }}>
              <RemoveDot onClick={() => items.remove(i)} size={20} />
            </span>
          </div>
        ))}
        <AddTile onClick={items.add} label={tx("addReview")} style={{ minHeight: 180, borderRadius: 12 }} />
      </div>
      <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
        <div style={{ width: 220, maxWidth: "100%" }}>
          <T slot="reviews.more" style={{ height: 38, padding: "0 14px", border: "1.5px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#d71635", fontSize: 12.5, fontWeight: 700, textAlign: "center" }} />
        </div>
        <U slot="reviews.moreHref" style={{ width: 220, maxWidth: "100%" }} />
        <small dir="auto" style={{ fontSize: 10.5, color: "#92958e", fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif", textAlign: "center" }}>
          {tx("moreNote")}
        </small>
      </div>
    </>
  );
}

function FaqSection() {
  const { tx } = useEditor();
  const items = useList(H, "faq", ["q", "a"]);
  return (
    <div style={{ padding: "26px 16px 24px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
      <T slot="faq.eyebrow" style={EYEBROW(true)} />
      <T slot="faq.title" style={TITLE(24, true)} />
      <div style={{ marginTop: 12, borderTop: "1px solid #e3e5e3" }}>
        {items.items.map((i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #e3e5e3" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <T slot={`faq.${i}.q`} style={{ fontFamily: OUTFIT, fontSize: 15, fontWeight: 600 }} />
              <T slot={`faq.${i}.a`} area style={{ ...BODY(), fontSize: 12.5 }} />
            </div>
            <button type="button" aria-label={tx("remove")} title={tx("remove")} onClick={() => items.remove(i)} style={{ display: "grid", placeItems: "center", width: 26, height: 26, marginTop: 2, border: "1.5px solid #d71635", borderRadius: "50%", background: "#ffffff", color: "#d71635", padding: 0, flex: "none" }}>
              <XIcon size={10} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={items.add} style={{ alignSelf: "center", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 34, padding: "0 14px", border: "1px dashed #d71635", borderRadius: 8, background: "#fff6f6", color: "#d71635", fontSize: 12, fontWeight: 600 }}>
        <PlusIcon size={12} />
        {tx("addQuestion")}
      </button>
    </div>
  );
}

function GuidesSection() {
  const { c, tx } = useEditor();
  const items = useList(H, "guides", ["title", "excerpt", "minutes", "img", "icon", "href"]);
  return (
    <>
      <div style={{ padding: "26px 16px 10px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 6 }}>
          <T slot="guides.eyebrow" style={{ ...EYEBROW(), maxWidth: 420 }} />
          <T slot="guides.title" style={{ ...TITLE(24), maxWidth: 600 }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 150 }}>
            <T slot="guides.more" style={{ color: "#d71635", fontSize: 12.5, fontWeight: 700 }} />
          </div>
          <div style={{ width: 110 }}>
            <T slot="guides.readMin" style={{ color: "#737870", fontSize: 12 }} />
          </div>
        </div>
      </div>
      <div style={{ padding: "6px 16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 12 }}>
        {items.items.map((i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, border: "1px solid #eceeea", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "16/10", background: "#e9ecef" }}>
              {c.value(H, `guides.${i}.img`, "de") ? <img src={c.value(H, `guides.${i}.img`, "de")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              <span style={{ position: "absolute", top: 6, insetInlineStart: 6 }}>
                <RemoveDot onClick={() => items.remove(i)} size={20} />
              </span>
              <MediaTools slot={`guides.${i}.img`} style={{ position: "absolute", top: 6, insetInlineEnd: 6, transform: "scale(.9)", transformOrigin: "top right" }} />
            </div>
            <div style={{ padding: "0 8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              <T slot={`guides.${i}.title`} style={{ fontSize: 13.5, fontWeight: 700 }} />
              <T slot={`guides.${i}.excerpt`} area style={{ ...BODY(), fontSize: 12 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 54 }}>
                  <T slot={`guides.${i}.minutes`} style={{ fontSize: 12, textAlign: "center", background: "#f5f5f0" }} />
                </div>
                <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("minutes")}</small>
              </div>
              <U slot={`guides.${i}.href`} />
            </div>
          </div>
        ))}
        <AddTile onClick={items.add} label={tx("addGuide")} style={{ minHeight: 200, borderRadius: 12 }} />
      </div>
    </>
  );
}

function CtaSection() {
  const { c } = useEditor();
  return (
    <div style={{ padding: "20px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 18, border: "1px solid #9ea3a0", borderRadius: 12 }}>
        <svg width="34" height="31" viewBox="0 0 44 40" fill="none" stroke="#d71635" strokeWidth="1.6" strokeLinejoin="round" style={{ marginInlineStart: 6 }} aria-hidden="true">
          <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h20A2.5 2.5 0 0 1 28 4.5v13a2.5 2.5 0 0 1-2.5 2.5H12l-6 5v-5h-.5A2.5 2.5 0 0 1 3 17.5z" />
          <path d="M32 12h6.5a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H38v5l-6-5H19.5a2.5 2.5 0 0 1-2.5-2.5V24" />
        </svg>
        <T slot="cta.qTitle" area style={TITLE(19)} />
        <T slot="cta.qText" area rows={3} style={{ ...BODY(), fontSize: 12.5 }} />
        <div style={{ width: 200, maxWidth: "100%", marginTop: 4 }}>
          <T slot="cta.qBtn" style={{ height: 36, padding: "0 12px", border: "1.5px solid #d71635", borderRadius: 8, background: "#ffffff", color: "#d71635", fontSize: 12, fontWeight: 700 }} />
        </div>
        <U slot="cta.qHref" ph="#faq" style={{ width: 200, maxWidth: "100%" }} />
      </div>
      <div style={{ gridColumn: "span 2", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 14, alignItems: "center", padding: 18, borderRadius: 12, background: "#d71635", color: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <T slot="cta.eyebrow" light style={{ ...EYEBROW(), color: "#ffffff" }} />
          <T slot="cta.title" light area style={{ ...TITLE(22), color: "#ffffff" }} />
          <T slot="cta.sub" light style={{ color: "#ffffff", fontSize: 12.5 }} />
          <div style={{ width: 200, maxWidth: "100%", marginTop: 4 }}>
            <T slot="cta.btn" style={{ height: 36, padding: "0 12px", border: 0, borderRadius: 8, background: "#ffffff", color: "#1d2220", fontSize: 12, fontWeight: 700 }} />
          </div>
          <U slot="cta.href" style={{ width: 200, maxWidth: "100%", border: 0, background: "#ffffff33", color: "#ffffff" }} />
        </div>
        <div style={{ position: "relative", justifySelf: "end", width: "100%", maxWidth: 150 }}>
          {c.value(H, "cta.img", "de") ? <img src={c.value(H, "cta.img", "de")} alt="" style={{ display: "block", width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10 }} /> : null}
          <MediaTools slot="cta.img" style={{ position: "absolute", top: 6, insetInlineEnd: 6, transform: "scale(.88)", transformOrigin: "top right", flexDirection: "column", alignItems: "flex-end" }} />
        </div>
      </div>
    </div>
  );
}

function FooterSection() {
  const { c, tx, lang } = useEditor();
  const site = useSiteSettings();
  const legal = useList(C, "footer.links", ["label", "href"]);
  const nav = listEdits(c, C, "nav.links", ["label", "href"]);
  return (
    <div style={{ background: "#e9ecef", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid #d3d7db" }}>
        <img src={site.mark} alt="m.on" style={{ width: 46, height: "auto", display: "block" }} />
        <div style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#1d2220" }}>
          <span>{c.value(C, "footer.home", lang)}</span>
          {Array.from({ length: nav.count }, (_, i) => (
            <span key={i}>{c.value(C, `nav.links.${i + 1}.label`, lang)}</span>
          ))}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", minHeight: 30, padding: "0 14px", borderRadius: 999, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{c.value(C, "nav.book", lang)}</span>
      </div>
      <p dir="auto" style={{ paddingTop: 8, fontSize: 10.5, color: "#737870", fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif" }}>
        {tx("footerNote")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14, paddingTop: 12, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <T s={C} slot="footer.copyright" style={{ color: "#4a514d", fontSize: 11.5 }} />
          <T s={C} slot="footer.home" style={{ color: "#4a514d", fontSize: 11.5 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(SOCIAL).map(([key, d]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: "#252b28", color: "#ffffff", flex: "none" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={d} />
                </svg>
              </span>
              <U s={C} slot={`footer.${key}`} ph={key} style={{ flex: 1, height: 24, border: "1px solid #d3d7db", background: "#f6f7f8" }} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "flex-end" }}>
          {legal.items.map((i) => (
            <div key={i} style={{ position: "relative", width: 96, display: "flex", flexDirection: "column", gap: 3 }}>
              <T s={C} slot={`footer.links.${i}.label`} style={{ color: "#4a514d", fontSize: 11.5 }} />
              <U s={C} slot={`footer.links.${i}.href`} style={{ border: "1px solid #d3d7db", background: "#f6f7f8" }} />
              <span style={{ position: "absolute", top: -6, insetInlineEnd: -6 }}>
                <RemoveDot onClick={() => legal.remove(i)} />
              </span>
            </div>
          ))}
          <AddLink onClick={legal.add} label={tx("addLink")} />
        </div>
      </div>
    </div>
  );
}

const SECTIONS: Record<"header" | "footer" | SectionId, () => ReactNode> = {
  header: () => <HeaderSection />,
  hero: () => <HeroSection />,
  services: () => <ServicesSection />,
  compare: () => <CompareSection />,
  area: () => <AreaSection />,
  audiences: () => <AudiencesSection />,
  stats: () => <StatsSection />,
  myths: () => <MythsSection />,
  marquee: () => <GallerySection />,
  why: () => <WhySection />,
  story: () => <StorySection />,
  reviews: () => <ReviewsSection />,
  faq: () => <FaqSection />,
  guides: () => <GuidesSection />,
  cta: () => <CtaSection />,
  footer: () => <FooterSection />,
};
