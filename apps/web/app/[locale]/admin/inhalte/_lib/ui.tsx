"use client";

import { isSafeImageSrc, isSafeVideoSrc } from "@mon/core";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { useToast } from "@/app/components/admin/AdminShell";
import { defineText, useText, type Words } from "@/lib/admin/text";

import { EDIT_LOCALES, LOCALE_NAMES, errorText, useUploads, type Loc } from "./cms";
import kit from "./kit.module.css";

export { kit };

/** Words the website screens share. */
export const KIT_TEXT = defineText({
  editLang: { de: "Bearbeitungssprache", en: "Editing language", ar: "لغة التعديل", tr: "Düzenleme dili" },
  change: { de: "Bild ändern", en: "Change image", ar: "تغيير الصورة", tr: "Görseli değiştir" },
  changeVideo: { de: "Video ändern", en: "Change video", ar: "تغيير الفيديو", tr: "Videoyu değiştir" },
  reset: { de: "Zurücksetzen", en: "Reset", ar: "استرجاع", tr: "Sıfırla" },
  useOriginal: { de: "Original verwenden", en: "Use original", ar: "استرجاع الأصلية", tr: "Orijinali kullan" },
  upload: { de: "Hochladen", en: "Upload", ar: "رفع صورة", tr: "Yükle" },
  saveFailed: { de: "Konnte nicht gespeichert werden.", en: "Could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  mediaTitle: { de: "Bild ändern", en: "Change image", ar: "تغيير الصورة", tr: "Görseli değiştir" },
  mediaTitleVideo: { de: "Video ändern", en: "Change video", ar: "تغيير الفيديو", tr: "Videoyu değiştir" },
  mediaUrl: { de: "Bildadresse", en: "Image address", ar: "رابط الصورة", tr: "Görsel adresi" },
  mediaUrlVideo: { de: "Videoadresse (.mp4)", en: "Video link (.mp4)", ar: "رابط الفيديو (.mp4)", tr: "Video bağlantısı (.mp4)" },
  mediaHint: {
    de: "Ein Pfad unter /images/ (z. B. /images/mon/home/cta.webp) oder eine https://-Adresse.",
    en: "A path under /images/ (e.g. /images/mon/home/cta.webp) or an https:// address.",
    ar: "مسار داخل ‎/images/‎ (مثلاً ‎/images/mon/home/cta.webp‎) أو عنوان يبدأ بـ https://.",
    tr: "/images/ altında bir yol (ör. /images/mon/home/cta.webp) veya bir https:// adresi.",
  },
  mediaHintVideo: {
    de: "Ein Pfad unter /videos/ oder eine https://-Adresse. Leer zeigt nur das Foto.",
    en: "A path under /videos/ or an https:// address. Empty shows the photo only.",
    ar: "مسار داخل ‎/videos/‎ أو عنوان يبدأ بـ https://. الفراغ يعرض الصورة فقط.",
    tr: "/videos/ altında bir yol veya bir https:// adresi. Boş bırakılırsa yalnızca fotoğraf gösterilir.",
  },
  mediaFile: { de: "Datei hochladen", en: "Upload a file", ar: "رفع ملف", tr: "Dosya yükle" },
  mediaUploading: { de: "Wird hochgeladen …", en: "Uploading…", ar: "جارٍ الرفع…", tr: "Yükleniyor…" },
  mediaNoUploads: {
    de: "Uploads sind auf diesem Server nicht eingerichtet — fügen Sie eine Adresse ein.",
    en: "Uploads are not set up on this server — paste an address instead.",
    ar: "الرفع غير مفعّل على هذا الخادم — الصق رابطاً بدلاً من ذلك.",
    tr: "Bu sunucuda yükleme ayarlı değil — bunun yerine bir adres yapıştırın.",
  },
  mediaBad: {
    de: "Diese Adresse wird nicht angenommen.",
    en: "This address is not accepted.",
    ar: "هذا الرابط غير مقبول.",
    tr: "Bu adres kabul edilmiyor.",
  },
  apply: { de: "Übernehmen", en: "Apply", ar: "تطبيق", tr: "Uygula" },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  loadFailed: { de: "Die Inhalte konnten nicht geladen werden.", en: "The content could not be loaded.", ar: "تعذّر تحميل المحتوى.", tr: "İçerik yüklenemedi." },
});

/** Whether a media query matches, e.g. the editors' rail stacking under 1180px. */
export function useMatch(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatch(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return match;
}

/** Scrolls to a section below the sticky header, as the prototype's rail does. */
export function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (element) window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
}

/** The prototype's "Editing language" segmented control. */
export function LangSwitch({ value, onChange, langs = EDIT_LOCALES, pad = 12 }: { value: Loc; onChange: (loc: Loc) => void; langs?: Loc[]; pad?: number }) {
  const tx = useText(KIT_TEXT);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11.5, color: "#737870" }}>{tx("editLang")}</span>
      <div role="group" aria-label={tx("editLang")} style={{ display: "inline-flex", padding: 3, border: "1px solid #e3e5de", borderRadius: 9, background: "#ffffff" }}>
        {langs.map((loc) => (
          <button
            key={loc}
            type="button"
            lang={loc}
            aria-pressed={value === loc}
            onClick={() => onChange(loc)}
            style={{
              minHeight: 32,
              padding: `0 ${pad}px`,
              border: 0,
              borderRadius: 7,
              background: value === loc ? "#252b28" : "transparent",
              color: value === loc ? "#ffffff" : "#4a514d",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {LOCALE_NAMES[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Number circle with a red ring, as the prototype numbers sections and tiles. */
export function NumBadge({ n, size = 22, font = 9 }: { n: string; size?: number; font?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        border: "1px solid #d71635",
        borderRadius: "50%",
        fontSize: font,
        fontWeight: 650,
        color: "#737870",
        flex: "none",
      }}
    >
      <bdi>{n}</bdi>
    </span>
  );
}

export const pad2 = (i: number) => String(i).padStart(2, "0");

/** The yellow "Edited" chip. */
export function EditedChip({ label, style }: { label: string; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, background: "#fff8d6", color: "#7a5d00", fontSize: 10.5, fontWeight: 650, ...style }}>
      <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: "#ffcb08" }} />
      {label}
    </span>
  );
}

interface MediaRequest {
  kind: "image" | "video";
  current: string;
  onApply: (url: string) => Promise<void> | void;
}

/**
 * "Change image": a dialog that takes a pasted address or, where the API has
 * storage, an uploaded file. The value is checked here with the same rule
 * the API applies, so a bad address is caught before it becomes a draft.
 */
export function useMediaDialog(): [(request: MediaRequest) => void, ReactNode] {
  const [request, setRequest] = useState<MediaRequest | null>(null);
  const open = useCallback((next: MediaRequest) => setRequest(next), []);
  const element = request ? <MediaDialog key={request.current + request.kind} request={request} onClose={() => setRequest(null)} /> : null;
  return [open, element];
}

function MediaDialog({ request, onClose }: { request: MediaRequest; onClose: () => void }) {
  const tx = useText(KIT_TEXT);
  const toast = useToast();
  const uploads = useUploads();
  const [url, setUrl] = useState(request.current);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const video = request.kind === "video";
  const trimmed = url.trim();
  const ok = trimmed === "" ? video : video ? isSafeVideoSrc(trimmed) : isSafeImageSrc(trimmed);

  const apply = async (value: string) => {
    setBusy(true);
    try {
      await request.onApply(value);
      onClose();
    } catch (error) {
      toast(errorText(error, tx("saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    try {
      const uploaded = await uploads.upload(picked, request.kind);
      setUrl(uploaded);
    } catch (error) {
      toast(errorText(error, tx("saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-modal-bg" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="a-modal" role="dialog" aria-modal="true" aria-label={tx(video ? "mediaTitleVideo" : "mediaTitle")}>
        <h2>{tx(video ? "mediaTitleVideo" : "mediaTitle")}</h2>
        <div style={{ aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#f1f1ea", border: "1px solid #e3e5de" }}>
          {ok && trimmed ? (
            video ? (
              <video src={trimmed} muted autoPlay loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <img src={trimmed} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            )
          ) : null}
        </div>
        <label className="a-field">
          <span>{tx(video ? "mediaUrlVideo" : "mediaUrl")}</span>
          <input
            className="a-input a-mono"
            dir="ltr"
            value={url}
            aria-invalid={!ok}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={video ? "https://…/clip.mp4" : "/images/…"}
            style={{ fontSize: 12 }}
          />
          <small>{ok ? tx(video ? "mediaHintVideo" : "mediaHint") : tx("mediaBad")}</small>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {uploads.enabled ? (
            <>
              <input ref={file} type="file" accept={video ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"} hidden onChange={(event) => void pick(event.target.files?.[0])} />
              <button type="button" className="a-btn is-line is-sm" disabled={busy} onClick={() => file.current?.click()}>
                <UploadIcon />
                {busy ? tx("mediaUploading") : tx("mediaFile")}
              </button>
            </>
          ) : (
            <small style={{ fontSize: 11.5, color: "#92958e" }}>{tx("mediaNoUploads")}</small>
          )}
        </div>
        <div className="a-modal-foot">
          <button type="button" className="a-btn is-ghost" onClick={onClose}>
            {tx("cancel")}
          </button>
          <button type="button" className="a-btn" disabled={!ok || busy} onClick={() => void apply(trimmed)}>
            {tx("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UploadIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

export function XIcon({ size = 9, width = 2.8 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon({ size = 11, width = 2.6 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** "All pages" back link. */
export function BackLink({ label, onClick, rtl, style }: { label: string; onClick: () => void; rtl: boolean; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} className={kit.back} style={style}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scaleX(${rtl ? -1 : 1})` }} aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}

// ── Names for the website's sections and their parts ────────────────

export const PAGE_INFO: Record<string, { name: Words; route: string }> = {
  home: { name: { de: "Startseite · alle Texte", en: "Homepage · all texts", ar: "الصفحة الرئيسية · كل النصوص", tr: "Ana sayfa · tüm metinler" }, route: "/" },
  chrome: { name: { de: "Kopfzeile & Fußzeile", en: "Header & footer", ar: "الترويسة والتذييل", tr: "Üst bilgi ve alt bilgi" }, route: "/" },
  planner: { name: { de: "Buchungsplaner", en: "Booking planner", ar: "مخطط الحجز", tr: "Rezervasyon planlayıcı" }, route: "/rechner" },
  "page-services": { name: { de: "Alle Leistungen", en: "All services", ar: "كل الخدمات", tr: "Tüm hizmetler" }, route: "/leistungen" },
  "service-moving": { name: { de: "Umzug", en: "Moving", ar: "نقل الأثاث", tr: "Taşınma" }, route: "/umzug" },
  "service-renovation": { name: { de: "Renovierung", en: "Renovation", ar: "الترميم", tr: "Tadilat" }, route: "/renovierung" },
  "service-cleaning": { name: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" }, route: "/reinigung" },
  "service-disposal": { name: { de: "Entrümpelung", en: "Junk Removal", ar: "إزالة الأغراض القديمة", tr: "Eşya Tahliyesi" }, route: "/entsorgung" },
  "page-about": { name: { de: "Über uns", en: "About us", ar: "من نحن", tr: "Hakkımızda" }, route: "/ueber-uns" },
  "page-why": { name: { de: "Sechs Gründe", en: "Six ways", ar: "ست طرق", tr: "Altı neden" }, route: "/warum-mon" },
  "page-how-it-works": { name: { de: "Umzugsplan", en: "Moving plan", ar: "خطة النقل", tr: "Taşınma planı" }, route: "/so-funktioniert" },
  "page-locations": { name: { de: "Standorte", en: "Locations", ar: "المواقع", tr: "Hizmet bölgeleri" }, route: "/standorte" },
  "page-for-business": { name: { de: "Geschäftskunden", en: "Business accounts", ar: "حسابات الشركات", tr: "Kurumsal müşteriler" }, route: "/fuer-unternehmen" },
  "page-jobs": { name: { de: "Jobs", en: "Jobs", ar: "الوظائف", tr: "Kariyer" }, route: "/jobs" },
  "page-partner": { name: { de: "Partnerschaften", en: "Partnerships", ar: "الشراكات", tr: "İş ortaklıkları" }, route: "/partner" },
  "page-guarantees": { name: { de: "Garantien & Versicherung", en: "Guarantees & insurance", ar: "الضمانات والتأمين", tr: "Garantiler ve sigorta" }, route: "/garantien" },
  "page-reviews": { name: { de: "Bewertungen", en: "Reviews", ar: "التقييمات", tr: "Yorumlar" }, route: "/kundenstimmen" },
  "page-faq": { name: { de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS" }, route: "/faq" },
  "page-blog": { name: { de: "Ratgeber", en: "Guides", ar: "الأدلة", tr: "Rehberler" }, route: "/ratgeber" },
  "page-pricing": { name: { de: "Preise", en: "Prices", ar: "الأسعار", tr: "Fiyatlar" }, route: "/preise" },
  "page-contact": { name: { de: "Kontakt", en: "Contact", ar: "تواصل معنا", tr: "İletişim" }, route: "/kontakt" },
  "page-imprint": { name: { de: "Impressum", en: "Imprint", ar: "بيانات الناشر", tr: "Künye" }, route: "/impressum" },
  "page-privacy": { name: { de: "Datenschutz", en: "Privacy", ar: "الخصوصية", tr: "Gizlilik" }, route: "/datenschutz" },
  "page-terms": { name: { de: "AGB", en: "Terms", ar: "الشروط", tr: "Şartlar" }, route: "/agb" },
  "page-legal-cookie": { name: { de: "Cookies", en: "Cookies", ar: "ملفات تعريف الارتباط", tr: "Çerezler" }, route: "/cookies" },
  auth: { name: { de: "Anmeldung & Konto", en: "Buttons, forms & account", ar: "الأزرار والنماذج والحساب", tr: "Butonlar, formlar ve hesap" }, route: "/login" },
  footer: { name: { de: "Fußzeile des Buchungsplaners", en: "Booking planner footer", ar: "تذييل مخطط الحجز", tr: "Rezervasyon planlayıcı alt bilgisi" }, route: "/rechner" },
};

/** Sections in the order the tiles list them; unknown ones follow alphabetically. */
export const PAGE_ORDER = Object.keys(PAGE_INFO);

export function pageName(section: string, locale: Loc): string {
  return PAGE_INFO[section]?.name[locale] ?? humanize(section);
}

const GROUP_NAMES: Record<string, Words> = {
  hero: { de: "Hero", en: "Hero", ar: "الواجهة", tr: "Giriş" },
  services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  compare: { de: "Vorher & nachher", en: "Before & after", ar: "قبل وبعد", tr: "Önce ve sonra" },
  area: { de: "Servicegebiet", en: "Service area", ar: "منطقة الخدمة", tr: "Hizmet bölgesi" },
  audiences: { de: "Umzugsarten", en: "Moving types", ar: "أنواع النقل", tr: "Taşınma türleri" },
  stats: { de: "Zahlen", en: "Numbers", ar: "الأرقام", tr: "Rakamlar" },
  myths: { de: "Erwartungen", en: "Expectations", ar: "التوقعات", tr: "Beklentiler" },
  marquee: { de: "Galerie", en: "Gallery", ar: "المعرض", tr: "Galeri" },
  why: { de: "Warum m.on", en: "Why m.on", ar: "لماذا m.on", tr: "Neden m.on" },
  story: { de: "Der Umzugstag", en: "Moving day", ar: "يوم النقل", tr: "Taşınma günü" },
  reviews: { de: "Bewertungen", en: "Reviews", ar: "التقييمات", tr: "Yorumlar" },
  faq: { de: "FAQ", en: "FAQs", ar: "الأسئلة الشائعة", tr: "SSS" },
  guides: { de: "Ratgeber", en: "Guides", ar: "الأدلة", tr: "Rehberler" },
  cta: { de: "Fragen & Angebot", en: "Questions & quote", ar: "الأسئلة وطلب العرض", tr: "Sorular ve teklif" },
  topbar: { de: "Obere Leiste", en: "Top bar", ar: "الشريط العلوي", tr: "Üst çubuk" },
  nav: { de: "Menü", en: "Menu", ar: "القائمة", tr: "Menü" },
  mega: { de: "Leistungsmenü", en: "Services menu", ar: "قائمة الخدمات", tr: "Hizmetler menüsü" },
  cart: { de: "Anfragekorb", en: "Request basket", ar: "سلة الطلب", tr: "Talep sepeti" },
  footer: { de: "Fußzeile", en: "Footer", ar: "التذييل", tr: "Alt bilgi" },
  cookie: { de: "Cookie-Hinweis", en: "Cookie notice", ar: "إشعار ملفات الارتباط", tr: "Çerez bildirimi" },
  welcome: { de: "Startschritt", en: "Start step", ar: "خطوة البداية", tr: "Başlangıç adımı" },
  steps: { de: "Schritte", en: "Steps", ar: "الخطوات", tr: "Adımlar" },
  extras: { de: "Extras", en: "Extras", ar: "الإضافات", tr: "Ekstralar" },
  vehicles: { de: "Fahrzeugoptionen", en: "Vehicle options", ar: "خيارات السيارات", tr: "Araç seçenekleri" },
  meta: { de: "Seitentitel", en: "Page title", ar: "عنوان الصفحة", tr: "Sayfa başlığı" },
  panel: { de: "Anmeldebereich", en: "Sign-in panel", ar: "لوحة الدخول", tr: "Giriş paneli" },
  layout: { de: "Aufbau", en: "Layout", ar: "التخطيط", tr: "Düzen" },
  rights: { de: "Rechtehinweis", en: "Copyright", ar: "الحقوق", tr: "Telif hakkı" },
  tagline: { de: "Slogan", en: "Tagline", ar: "الشعار النصي", tr: "Slogan" },
  // The inner pages (pages-content.ts).
  crumb: { de: "Brotkrumen", en: "Breadcrumbs", ar: "مسار التنقل", tr: "Sayfa yolu" },
  included: { de: "Leistungsumfang", en: "What's included", ar: "ما الذي يشمله", tr: "Neler dahil" },
  gallery: { de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar" },
  pb: { de: "Privat & Geschäftlich", en: "Private & business", ar: "أفراد وشركات", tr: "Bireysel ve kurumsal" },
  price: { de: "Preisfaktoren", en: "Pricing", ar: "التسعير", tr: "Fiyatlandırma" },
  together: { de: "Oft zusammen gebucht", en: "Booked together", ar: "تُحجز معاً", tr: "Birlikte alınanlar" },
  panels: { de: "Leistungen", en: "Service panels", ar: "لوحات الخدمات", tr: "Hizmet panelleri" },
  forwho: { de: "Privat oder geschäftlich", en: "Private or business", ar: "أفراد أم شركات", tr: "Bireysel mi kurumsal mı" },
  promises: { de: "Versprechen", en: "Promises", ar: "الوعود", tr: "Sözlerimiz" },
  reasons: { de: "Gründe", en: "Reasons", ar: "الأسباب", tr: "Nedenler" },
  split: { de: "Text mit Bild", en: "Text and photo", ar: "نص وصورة", tr: "Metin ve görsel" },
  check: { de: "Checkliste", en: "Checklist", ar: "قائمة المهام", tr: "Kontrol listesi" },
  plan: { de: "Checkliste: Phasen", en: "Checklist phases", ar: "مراحل القائمة", tr: "Liste aşamaları" },
  plz: { de: "PLZ-Prüfung", en: "Postcode check", ar: "التحقق من الرمز البريدي", tr: "Posta kodu kontrolü" },
  cities: { de: "Städte", en: "Cities", ar: "المدن", tr: "Şehirler" },
  roles: { de: "Offene Stellen", en: "Open roles", ar: "الوظائف المتاحة", tr: "Açık pozisyonlar" },
  form: { de: "Formular", en: "Form", ar: "النموذج", tr: "Form" },
  quick: { de: "Schnelle Hilfe", en: "Quick help", ar: "مساعدة سريعة", tr: "Hızlı yardım" },
  cards: { de: "Karten", en: "Cards", ar: "البطاقات", tr: "Kartlar" },
  topics: { de: "Themen", en: "Topics", ar: "المواضيع", tr: "Konular" },
  cats: { de: "Kategorien", en: "Categories", ar: "الفئات", tr: "Kategoriler" },
  svcfaq: { de: "Kategorien der Leistungen", en: "Service categories", ar: "فئات الخدمات", tr: "Hizmet kategorileri" },
  lang: { de: "Sprachmenü", en: "Language menu", ar: "قائمة اللغات", tr: "Dil menüsü" },
  search: { de: "Suche", en: "Search", ar: "البحث", tr: "Arama" },
  list: { de: "Liste", en: "List", ar: "القائمة", tr: "Liste" },
  article: { de: "Ratgeberseite", en: "Guide page", ar: "صفحة الدليل", tr: "Rehber sayfası" },
  more: { de: "Weiterlesen", en: "Keep reading", ar: "تابع القراءة", tr: "Okumaya devam" },
  svc: { de: "Ratgeber zu Leistungen", en: "Service guides", ar: "أدلة الخدمات", tr: "Hizmet rehberleri" },
};

export function groupName(group: string, locale: Loc): string {
  return GROUP_NAMES[group]?.[locale] ?? humanize(group);
}

/** Names of the named cards inside a section (`welcome.private`, `extras.packing`, …). */
const ITEM_NAMES: Record<string, Words> = {
  private: { de: "Privat", en: "Private", ar: "فرد", tr: "Bireysel" },
  business: { de: "Geschäftlich", en: "Business", ar: "شركة", tr: "Kurumsal" },
  moving: { de: "Umzug", en: "Moving", ar: "نقل الأثاث", tr: "Taşınma" },
  renovation: { de: "Renovierung", en: "Renovation", ar: "الترميم", tr: "Tadilat" },
  cleaning: { de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik" },
  disposal: { de: "Entrümpelung", en: "Junk removal", ar: "إزالة الأغراض", tr: "Eşya tahliyesi" },
  insurance: { de: "Versicherung", en: "Insurance", ar: "التأمين", tr: "Sigorta" },
  packing: { de: "Packservice", en: "Packing", ar: "التغليف", tr: "Paketleme" },
  parkingZone: { de: "Halteverbot", en: "No-parking zone", ar: "منع الوقوف", tr: "Park yasağı" },
  secondVan: { de: "Zweiter Transporter", en: "Second van", ar: "شاحنة ثانية", tr: "İkinci kamyonet" },
  links: { de: "Link", en: "Link", ar: "رابط", tr: "Bağlantı" },
  type: { de: "Kundentyp", en: "Customer type", ar: "نوع الزبون", tr: "Müşteri tipi" },
  services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  account: { de: "Firma", en: "Company", ar: "الشركة", tr: "Şirket" },
  address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  schedule: { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  photos: { de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar" },
  review: { de: "Prüfen & Preis", en: "Review & price", ar: "المراجعة والسعر", tr: "Kontrol ve fiyat" },
  payment: { de: "Kontakt & Zahlung", en: "Contact & payment", ar: "التواصل والدفع", tr: "İletişim ve ödeme" },
};

/** "02" for `services.2`, "Link · 03" for `topbar.links.3`, "Private" for `welcome.private`. */
export function itemName(key: string, locale: Loc): string {
  return key
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? pad2(Number(part)) : (ITEM_NAMES[part]?.[locale] ?? humanize(part))))
    .join(" · ");
}

/** "parkingZone" → "Parking zone", "page-about" → "Page about". */
export function humanize(key: string): string {
  const spaced = key.replace(/[-_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return spaced ? spaced[0]!.toUpperCase() + spaced.slice(1) : key;
}

export type Role = "eyebrow" | "title" | "sub" | "text" | "btn" | "q" | "a" | "link" | "label";

export const ROLE_TEXT = defineText({
  eyebrow: { de: "Kleine Überschrift", en: "Small heading", ar: "عنوان صغير", tr: "Küçük başlık" },
  title: { de: "Titel", en: "Title", ar: "العنوان", tr: "Başlık" },
  sub: { de: "Einleitung", en: "Intro", ar: "المقدمة", tr: "Giriş" },
  text: { de: "Text", en: "Text", ar: "النص", tr: "Metin" },
  btn: { de: "Schaltfläche", en: "Button", ar: "زر", tr: "Buton" },
  q: { de: "Frage", en: "Question", ar: "السؤال", tr: "Soru" },
  a: { de: "Antwort", en: "Answer", ar: "الجواب", tr: "Cevap" },
  link: { de: "Link", en: "Link", ar: "الرابط", tr: "Bağlantı" },
  label: { de: "Beschriftung", en: "Label", ar: "التسمية", tr: "Etiket" },
});

/** The role a slot's last segment plays, which sets its label and type size. */
export function roleOf(slot: string): Role {
  const last = slot.split(".").pop() ?? "";
  if (/href$/i.test(last) || last === "url") return "link";
  if (/^(eyebrow|tag)$/.test(last)) return "eyebrow";
  if (/^(title|title\d|headline|qTitle|tab|name|heading)$/.test(last)) return "title";
  if (/^(sub|lead|intro)$/.test(last)) return "sub";
  if (/^(btn|qBtn|cta|more|link|linkText|login|book|account|all|go|browse|necessary|button)$/.test(last)) return "btn";
  if (last === "q") return "q";
  if (last === "a") return "a";
  if (/label$/i.test(last) || last === "time" || last === "minutes" || last === "value") return "label";
  return "text";
}

/** Type size, weight, tracking and colour per role, as the prototype's page editor sets them. */
export const ROLE_STYLE: Record<Role, [string, number, string, string]> = {
  eyebrow: ["11.5px", 700, ".12em", "#d71635"],
  title: ["19px", 650, "-0.01em", "#1d2220"],
  sub: ["14.5px", 400, "0", "#4a514d"],
  text: ["13.5px", 400, "0", "#4a514d"],
  btn: ["13px", 650, "0", "#1d2220"],
  q: ["14px", 650, "0", "#1d2220"],
  a: ["13.5px", 400, "0", "#4a514d"],
  link: ["12px", 400, "0", "#737870"],
  label: ["13px", 600, "0", "#1d2220"],
};
