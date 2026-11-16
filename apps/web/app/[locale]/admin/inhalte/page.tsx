"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import { contentRef, errorText, isMedia, useContent, type Content, type Loc, type SlotMeta } from "./_lib/cms";
import { usePageSubnav } from "./_lib/subnav";
import {
  BackLink,
  EditedChip,
  KIT_TEXT,
  LangSwitch,
  NumBadge,
  PAGE_INFO,
  PAGE_ORDER,
  ROLE_STYLE,
  ROLE_TEXT,
  UploadIcon,
  groupName,
  itemName,
  kit,
  pad2,
  pageName,
  roleOf,
  scrollToId,
  useMatch,
  useMediaDialog,
} from "./_lib/ui";

/**
 * Content editing: every page of the website whose words and photos live in
 * `content_blocks`, as the admin prototype lists and edits them — a tile per
 * page, then per page its numbered sections, a field per text in the chosen
 * language and the section's pictures. Every edit is a "content" draft; the
 * frame's bar publishes them.
 */

const TEXT = defineText({
  title: { de: "Inhalte bearbeiten", en: "Content editing", ar: "تعديل المحتوى", tr: "İçerik düzenleme" },
  statsNote: {
    de: "Die Zahlen auf dieser Seite (z. B. 1,000+ Umzüge) gelten für Startseite und Über uns. Sie werden dort bearbeitet, hinzugefügt oder entfernt:",
    en: "The figures on this page (e.g. 1,000+ moves) are shared with the homepage. Edit, add or remove them there:",
    ar: "الأرقام في هذه الصفحة (مثل 1,000+ عملية نقل) مشتركة مع الصفحة الرئيسية. عدّلها أو أضف إليها أو احذف منها هناك:",
    tr: "Bu sayfadaki rakamlar (ör. 1,000+ taşınma) ana sayfayla ortaktır. Onları orada düzenleyin, ekleyin veya kaldırın:",
  },
  statsLink: { de: "Startseite → Zahlen", en: "Homepage → Numbers", ar: "الصفحة الرئيسية ← الأرقام", tr: "Ana sayfa → Rakamlar" },
  sub: {
    de: "Wählen Sie eine Seite, um ihre Texte und Bilder zu bearbeiten. Änderungen gehen mit „Speichern & veröffentlichen“ auf der Website live.",
    en: "Choose a page to edit its texts and images. Changes go live on the website with Save & publish.",
    ar: "اختر صفحة لتعديل نصوصها وصورها. تظهر التغييرات على الموقع بعد «حفظ ونشر».",
    tr: "Metinlerini ve görsellerini düzenlemek için bir sayfa seçin. Değişiklikler “Kaydet ve yayınla” ile sitede yayına girer.",
  },
  homeName: { de: "Startseite", en: "Homepage", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
  homeMeta: {
    de: "Layout-Editor: Bereiche, Reihenfolge, Links und Bilder",
    en: "Layout editor: sections, order, links and images",
    ar: "محرّر الواجهة: الأقسام وترتيبها والروابط والصور",
    tr: "Düzen editörü: bölümler, sıra, bağlantılar ve görseller",
  },
  secW: { de: "Bereiche", en: "sections", ar: "أقسام", tr: "bölüm" },
  textW: { de: "Texte", en: "texts", ar: "نصوص", tr: "metin" },
  imgW: { de: "Bilder", en: "images", ar: "صور", tr: "görsel" },
  change1: { de: "Änderung", en: "change", ar: "تعديل", tr: "değişiklik" },
  changeN: { de: "Änderungen", en: "changes", ar: "تعديلات", tr: "değişiklik" },
  edited: { de: "Geändert", en: "Edited", ar: "معدّل", tr: "Düzenlendi" },
  back: { de: "Alle Seiten", en: "All pages", ar: "كل الصفحات", tr: "Tüm sayfalar" },
  shared: {
    de: "Bearbeiten Sie den Text direkt in seinem Feld. Links und Bilder gelten für alle Sprachen.",
    en: "Edit the text right in its field. Links and images are shared by every language.",
    ar: "عدّل النص مباشرة في خانته. الروابط والصور مشتركة بين كل اللغات.",
    tr: "Metni doğrudan kendi alanında düzenleyin. Bağlantılar ve görseller tüm dillerde ortaktır.",
  },
  open: { de: "Seite öffnen", en: "Open page", ar: "فتح الصفحة", tr: "Sayfayı aç" },
  resetPage: { de: "Seite zurücksetzen", en: "Reset page", ar: "استرجاع الصفحة", tr: "Sayfayı sıfırla" },
  resetAsk: {
    de: "Alle Änderungen an dieser Seite verwerfen und die veröffentlichten Texte und Bilder behalten?",
    en: "Restore all original texts and images on this page?",
    ar: "استرجاع كل النصوص والصور الأصلية في هذه الصفحة؟",
    tr: "Bu sayfadaki tüm orijinal metinler ve görseller geri yüklensin mi?",
  },
  sections: { de: "BEREICHE", en: "SECTIONS", ar: "الأقسام", tr: "BÖLÜMLER" },
  newImg: { de: "Neues Bild", en: "New image", ar: "صورة جديدة", tr: "Yeni görsel" },
  noImage: { de: "Kein Bild", en: "No image", ar: "لا توجد صورة", tr: "Görsel yok" },
  empty: { de: "Noch keine Inhalte.", en: "No content yet.", ar: "لا يوجد محتوى بعد.", tr: "Henüz içerik yok." },
});

export default function ContentEditingPage() {
  return (
    <Suspense fallback={null}>
      <ContentEditing />
    </Suspense>
  );
}

function ContentEditing() {
  const params = useSearchParams();
  const { locale } = useI18n();
  const c = useContent();
  const page = params.get("page");
  const editing = page && c.sections.includes(page) ? page : null;
  const subnav = usePageSubnav(editing);

  return (
    <AdminShell view="pages" pages={subnav} {...(editing ? { crumb: pageName(editing, locale) } : {})}>
      {editing ? <PageEditor key={editing} c={c} section={editing} /> : <PageIndex c={c} />}
    </AdminShell>
  );
}

/** "3 sections · 31 texts · 8 images", from the German rows. */
function countsOf(c: Content, section: string) {
  const slots = c.slotsOf(section);
  const groups = new Set(slots.map((slot) => slot.slot.split(".")[0]));
  const images = slots.filter((slot) => isMedia(slot.kind)).length;
  return { sections: groups.size, texts: slots.length - images, images };
}

function PageIndex({ c }: { c: Content }) {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const { locale } = useI18n();
  const router = useRouter();

  const sections = useMemo(
    () =>
      [...c.sections].sort((a, b) => {
        const ia = PAGE_ORDER.indexOf(a);
        const ib = PAGE_ORDER.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
      }),
    [c.sections],
  );

  const changes = (n: number) => `${n} ${n === 1 ? tx("change1") : tx("changeN")}`;
  const homeDrafts = c.draftRefs("home").length + c.draftRefs("chrome").length;

  const tiles = [
    {
      key: "__home",
      name: tx("homeName"),
      route: "/",
      meta: tx("homeMeta"),
      edits: homeDrafts,
      go: () => router.push(`/${locale}${ADMIN_PATHS.home}`),
    },
    ...sections.map((section) => {
      const counts = countsOf(c, section);
      return {
        key: section,
        name: pageName(section, locale),
        route: PAGE_INFO[section]?.route ?? `/${section}`,
        meta: `${counts.sections} ${tx("secW")} · ${counts.texts} ${tx("textW")}${counts.images ? ` · ${counts.images} ${tx("imgW")}` : ""}`,
        edits: c.draftRefs(section).length,
        go: () => {
          router.push(`/${locale}${ADMIN_PATHS.pages}?page=${encodeURIComponent(section)}`);
          window.scrollTo(0, 0);
        },
      };
    }),
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="a-page-head" style={{ display: "block" }}>
        <h1 style={{ lineHeight: 1.2 }}>{tx("title")}</h1>
        <p>{tx("sub")}</p>
      </div>
      {c.error ? <p className="a-note is-error">{kx("loadFailed")}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,250px),1fr))", gap: 12 }}>
        {c.loading
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ padding: "16px 18px", border: "1px solid #e3e5de", borderRadius: 12, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="a-skel" style={{ width: 26, height: 26, borderRadius: "50%" }} />
                <div className="a-skel" style={{ width: "60%" }} />
                <div className="a-skel" style={{ width: "40%" }} />
              </div>
            ))
          : tiles.map((tile, i) => (
              <button
                key={tile.key}
                type="button"
                onClick={tile.go}
                className={kit.tile}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 10,
                  padding: "16px 18px",
                  border: "1px solid #e3e5de",
                  borderRadius: 12,
                  background: "#ffffff",
                  boxShadow: "0 12px 36px #202a2308",
                  textAlign: "start",
                  color: "#1d2220",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 24 }}>
                  <NumBadge n={pad2(i + 1)} size={26} font={10} />
                  {tile.edits > 0 ? <EditedChip label={changes(tile.edits)} style={{ padding: "3px 9px", gap: 6 }} /> : null}
                </span>
                <b style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.3 }}>{tile.name}</b>
                <span dir="ltr" style={{ font: "11px ui-monospace,Menlo,monospace", color: "#92958e", textAlign: "start" }}>
                  {tile.route}
                </span>
                <span style={{ fontSize: 12, color: "#737870", lineHeight: 1.45 }}>{tile.meta}</span>
              </button>
            ))}
      </div>
    </section>
  );
}

interface PageSection {
  group: string;
  fields: SlotMeta[];
  items: { n: string; fields: SlotMeta[] }[];
  media: SlotMeta[];
}

/** A page's slots grouped as the prototype groups them: by their first segment. */
function sectionsOf(c: Content, section: string): PageSection[] {
  const groups = new Map<string, PageSection & { order: number }>();
  for (const slot of c.slotsOf(section)) {
    const [group = slot.slot, second] = slot.slot.split(".");
    let entry = groups.get(group);
    if (!entry) groups.set(group, (entry = { group, fields: [], items: [], media: [], order: slot.sortOrder }));
    entry.order = Math.min(entry.order, slot.sortOrder);
    const parts = slot.slot.split(".");
    if (isMedia(slot.kind)) entry.media.push(slot);
    else if (second && parts.length > 2) {
      // `services.2.title`, `welcome.private.title`, `topbar.links.3.href`:
      // everything between the section and the field names one card.
      const key = parts.slice(1, -1).join(".");
      let item = entry.items.find((it) => it.n === key);
      if (!item) entry.items.push((item = { n: key, fields: [] }));
      item.fields.push(slot);
    } else entry.fields.push(slot);
  }
  // Numbered cards by number; named ones stay in the order their rows come in.
  const numbered = (key: string) => /^\d+$/.test(key);
  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({ ...entry, items: [...entry.items].sort((a, b) => (numbered(a.n) && numbered(b.n) ? Number(a.n) - Number(b.n) : 0)) }));
}

function PageEditor({ c, section }: { c: Content; section: string }) {
  const tx = useText(TEXT);
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const rtl = locale === "ar";
  const stack = useMatch("(max-width: 1179px)");
  const [lang, setLang] = useState<Loc>(rtl ? "ar" : "de");
  const [openMedia, mediaDialog] = useMediaDialog();

  const sections = useMemo(() => sectionsOf(c, section), [c, section]);
  const refs = c.draftRefs(section);
  const groupEdited = (group: string) => refs.some((ref) => ref.startsWith(`${section}|${group}.`) || ref.startsWith(`${section}|${group}|`));
  const route = PAGE_INFO[section]?.route ?? "/";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <BackLink
          label={tx("back")}
          rtl={rtl}
          onClick={() => {
            router.push(`/${locale}${ADMIN_PATHS.pages}`);
            window.scrollTo(0, 0);
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div className="a-page-head" style={{ display: "block" }}>
            <h1 style={{ lineHeight: 1.2 }}>{pageName(section, locale)}</h1>
            <p style={{ maxWidth: 620 }}>{tx("shared")}</p>
            {section === "page-about" ? (
              <p style={{ maxWidth: 620, marginTop: 8 }}>
                {tx("statsNote")}{" "}
                <a href={`/${locale}${ADMIN_PATHS.home}`} style={{ color: "#d71635", fontWeight: 600 }}>
                  {tx("statsLink")}
                </a>
              </p>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <LangSwitch value={lang} onChange={setLang} />
            <a
              href={`/${lang}${route === "/" ? "" : route}`}
              target="_blank"
              rel="noopener noreferrer"
              className={kit.outline}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 14px", border: "1px solid #e3e5de", borderRadius: 9, background: "#ffffff", color: "#252b28", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
              {tx("open")}
            </a>
            {refs.length ? (
              <button
                type="button"
                className={kit.danger}
                onClick={() => {
                  if (window.confirm(tx("resetAsk"))) c.revert(refs).catch((error) => toast(errorText(error, "")));
                }}
                style={{ minHeight: 38, padding: "0 14px", border: "1px solid #e3e5de", borderRadius: 9, background: "#ffffff", color: "#b7122b", fontSize: 12.5, fontWeight: 600 }}
              >
                {tx("resetPage")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: stack ? "minmax(0,1fr)" : "232px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <aside
          style={{
            position: stack ? "static" : "sticky",
            top: 84,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            padding: 10,
            maxHeight: stack ? undefined : "calc(100vh - 110px)",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e3e5de",
            borderRadius: 12,
            boxShadow: "0 12px 36px #202a2308",
          }}
        >
          <span style={{ padding: "4px 8px 8px", fontSize: 9.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#92958e" }}>{tx("sections")}</span>
          {sections.map((entry, i) => (
            <button
              key={entry.group}
              type="button"
              className={kit.rail}
              onClick={() => scrollToId(`pg-${i}`)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, border: 0, borderRadius: 8, background: "transparent", textAlign: "start", color: "#252b28", fontSize: 12.5, fontWeight: 550 }}
            >
              <NumBadge n={pad2(i)} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{groupName(entry.group, locale)}</span>
              {groupEdited(entry.group) ? <i style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: "#ffcb08", flex: "none" }} /> : null}
            </button>
          ))}
        </aside>

        <div
          style={{
            minWidth: 0,
            background: "#ffffff",
            border: "1px solid #e3e5de",
            borderRadius: 12,
            boxShadow: "0 12px 36px #202a2308",
            overflow: "hidden",
            fontFamily: "'DM Sans','IBM Plex Sans Arabic',sans-serif",
            color: "#1d2220",
          }}
        >
          {sections.length === 0 ? <p className="a-empty" style={{ padding: 20 }}>{tx("empty")}</p> : null}
          {sections.map((entry, i) => (
            <div key={entry.group} id={`pg-${i}`} style={{ scrollMarginTop: 84, borderTop: i ? "1px solid #eef0ea" : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "#fafaf7", borderBottom: "1px solid #eef0ea", fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif" }}>
                <NumBadge n={pad2(i)} />
                <b style={{ fontSize: 12.5, fontWeight: 650 }}>{groupName(entry.group, locale)}</b>
                {groupEdited(entry.group) ? <EditedChip label={tx("edited")} /> : null}
              </div>
              <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {entry.fields.map((slot) => (
                  <PageField key={slot.slot} c={c} section={section} slot={slot.slot} lang={lang} />
                ))}
                {entry.items.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))", gap: 12 }}>
                    {entry.items.map((item) => (
                      <div key={item.n} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 12px 14px", border: "1px solid #eef0ea", borderRadius: 10, background: "#fcfcfa" }}>
                        <span
                          style={{
                            alignSelf: "flex-start",
                            minWidth: 20,
                            height: 20,
                            padding: /^\d+$/.test(item.n) ? 0 : "0 8px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 999,
                            background: "#f1f1ea",
                            fontSize: /^\d+$/.test(item.n) ? 9 : 10,
                            fontWeight: 650,
                            color: "#737870",
                            fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif",
                          }}
                        >
                          <bdi>{itemName(item.n, locale)}</bdi>
                        </span>
                        {item.fields.map((slot) => (
                          <PageField key={slot.slot} c={c} section={section} slot={slot.slot} lang={lang} small />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                {entry.media.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,210px),1fr))", gap: 12 }}>
                    {entry.media.map((slot) => (
                      <PageMedia key={slot.slot} c={c} section={section} slot={slot} openMedia={openMedia} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      {mediaDialog}
    </section>
  );
}

/** One text of a page in the editing language, typed as the role it plays. */
function PageField({ c, section, slot, lang, small }: { c: Content; section: string; slot: string; lang: Loc; small?: boolean }) {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const rx = useText(ROLE_TEXT);
  const toast = useToast();
  const [typing, setTyping] = useState<string | null>(null);

  const role = roleOf(slot);
  const [fs, fw, ls, color] = ROLE_STYLE[role];
  const neutral = c.neutral(section, slot);
  const current = c.value(section, slot, lang);
  const shown = typing ?? current;
  const edited = c.edited(section, slot, lang);
  const live = c.live(section, slot, neutral ? "*" : lang);
  const longest = Math.max(live.length, shown.length);
  const long = role !== "link" && (longest > 64 || /\n/.test(live + shown));
  const rows = Math.min(9, Math.max(2, Math.ceil(longest / 60) + (shown.split("\n").length - 1)));
  const dir = neutral ? "ltr" : lang === "ar" ? "rtl" : "ltr";

  const commit = async () => {
    if (typing === null) return;
    try {
      if (typing !== current) await c.save([{ section, slot, locale: lang, value: typing }]);
    } catch (error) {
      toast(errorText(error, kx("saveFailed")));
    } finally {
      setTyping(null);
    }
  };

  const style = {
    width: "100%",
    minWidth: 0,
    padding: long ? "9px 11px" : "8px 11px",
    border: `1px solid ${edited ? "#ffcb08" : "#e3e5de"}`,
    borderRadius: 8,
    background: "#ffffff",
    color,
    fontFamily: role === "link" ? "ui-monospace,Menlo,monospace" : "inherit",
    fontSize: small && role === "title" ? "14.5px" : fs,
    fontWeight: fw,
    letterSpacing: lang === "ar" ? 0 : ls,
    lineHeight: long ? 1.55 : 1.35,
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22, fontFamily: "'Geist','IBM Plex Sans Arabic',sans-serif" }}>
        <span style={{ fontSize: 10, fontWeight: 650, letterSpacing: lang === "ar" ? 0 : ".08em", textTransform: "uppercase", color: "#92958e" }}>{rx(role)}</span>
        {edited ? (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 650, color: "#7a5d00" }}>
              <i style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: "#ffcb08" }} />
              {tx("edited")}
            </span>
            <button
              type="button"
              className={kit.pill}
              onClick={() => c.revert([contentRef(section, slot, neutral ? "*" : lang)]).catch((error) => toast(errorText(error, "")))}
              style={{ marginInlineStart: "auto", minHeight: 22, padding: "0 9px", border: 0, borderRadius: 999, background: "#f1f1ea", color: "#4a514d", fontSize: 10.5, fontWeight: 600 }}
            >
              {kx("reset")}
            </button>
          </>
        ) : null}
      </div>
      {long ? (
        <textarea
          dir={dir}
          className={kit.field}
          value={shown}
          rows={rows}
          onChange={(event) => setTyping(event.target.value)}
          onBlur={() => void commit()}
          style={{ ...style, resize: "vertical" }}
        />
      ) : (
        <input dir={dir} className={kit.field} value={shown} onChange={(event) => setTyping(event.target.value)} onBlur={() => void commit()} style={style} />
      )}
    </div>
  );
}

/** A page's photo or clip: the 16:10 preview, "Change image" and its reset. */
function PageMedia({ c, section, slot, openMedia }: { c: Content; section: string; slot: SlotMeta; openMedia: ReturnType<typeof useMediaDialog>[0] }) {
  const tx = useText(TEXT);
  const kx = useText(KIT_TEXT);
  const toast = useToast();
  const kind = slot.kind === "video" ? "video" : "image";
  const src = c.value(section, slot.slot, "de");
  const edited = c.edited(section, slot.slot, "de");
  const original = c.original(section, slot.slot);
  const canRestore = !edited && original !== undefined && original !== c.live(section, slot.slot, "*");
  const save = (value: string) => c.save([{ section, slot: slot.slot, locale: "*", value }]);
  const { locale } = useI18n();
  // Admin v11 names a photo after what it shows: the card it belongs to
  // (`included.3.img` beside `included.3.title`).
  const label = /\.(img|image)$/.test(slot.slot) ? c.value(section, slot.slot.replace(/\.(img|image)$/, ".title"), locale as Loc).trim() : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label ? <b style={{ fontSize: 12.5, fontWeight: 650, color: "#1d2220", lineHeight: 1.3 }}>{label}</b> : null}
      <div style={{ position: "relative", aspectRatio: "16/10", borderRadius: 10, overflow: "hidden", background: "#f1f1ea", border: `1px solid ${edited ? "#ffcb08" : "#e3e5de"}` }}>
        {src ? (
          kind === "video" ? (
            <video src={src} muted loop playsInline preload="metadata" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <img src={src} alt="" loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
          )
        ) : (
          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11.5, color: "#92958e" }}>{tx("noImage")}</span>
        )}
        {edited ? (
          <span style={{ position: "absolute", top: 8, insetInlineStart: 8, padding: "3px 9px", borderRadius: 999, background: "#ffcb08", color: "#17191a", fontSize: 10.5, fontWeight: 700 }}>{tx("newImg")}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => openMedia({ kind, current: src, onApply: save })}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 12px", border: "1px solid #d71635", borderRadius: 8, background: "#fff6f6", color: "#d71635", fontSize: 12, fontWeight: 600 }}
        >
          <UploadIcon size={13} />
          {kind === "video" ? kx("changeVideo") : kx("change")}
        </button>
        {edited || canRestore ? (
          <button
            type="button"
            className={kit.outline}
            onClick={() =>
              (edited ? c.revert([contentRef(section, slot.slot, "*"), contentRef(section, slot.slot, "de")]) : save(original!)).catch((error) => toast(errorText(error, kx("saveFailed"))))
            }
            style={{ minHeight: 32, padding: "0 12px", border: "1px solid #e3e5de", borderRadius: 8, background: "#ffffff", color: "#4a514d", fontSize: 12, fontWeight: 600 }}
          >
            {edited ? kx("reset") : kx("useOriginal")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
