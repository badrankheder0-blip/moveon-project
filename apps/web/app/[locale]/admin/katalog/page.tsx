"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { defineText, useText } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";

/**
 * The item catalogue: the furniture a move is measured in and the rooms a
 * clean is priced by.
 *
 * These are the rows the booking planner shows on its "Umfang" step, and the
 * volume and prices here are what the quote is built from — so an item that is
 * missing is a move the calculator cannot price, and the office had no way to
 * add one without a deploy. `/api/catalog` could already create, change and
 * retire items; this is the screen for it.
 *
 * Unlike prices, zones or discounts, a catalogue item is not drafted: the API
 * writes it straight away (and audits it). Retiring an item deactivates it
 * rather than deleting it, because historical quotes and orders name it by id
 * and an old invoice has to stay reproducible.
 */

const TEXT = defineText({
  title: { de: "Katalog", en: "Catalogue", ar: "الكتالوج", tr: "Katalog" },
  sub: {
    de: "Die Gegenstände, aus denen der Planer den Umfang und den Preis berechnet.",
    en: "The items the planner measures scope and price from.",
    ar: "العناصر التي يحسب منها المخطِّط الحجم والسعر.",
    tr: "Planlayıcının kapsamı ve fiyatı hesapladığı kalemler.",
  },
  furniture: { de: "Möbel", en: "Furniture", ar: "أثاث", tr: "Mobilya" },
  cleaning: { de: "Reinigung", en: "Cleaning", ar: "تنظيف", tr: "Temizlik" },
  special: { de: "Besondere Gegenstände", en: "Special items", ar: "أغراض خاصة", tr: "Özel eşyalar" },
  specialSub: {
    de: "Zusätzliches Handling pro Stück — Klavier, Tresor und was du sonst anbietest.",
    en: "Extra handling per piece — piano, safe, and whatever else you offer.",
    ar: "رسوم إضافية لكل قطعة — بيانو، خزنة، وما تضيفه أنت.",
    tr: "Parça başına ek taşıma — piyano, kasa ve eklediğiniz diğerleri.",
  },
  code: { de: "Code", en: "Code", ar: "الرمز", tr: "Kod" },
  codeHint: {
    de: "Kleinbuchstaben, Ziffern oder Bindestriche. Wird im Angebot gespeichert und lässt sich später nicht ändern.",
    en: "Lower-case letters, digits or hyphens. Stored in the quote, and fixed afterwards.",
    ar: "أحرف صغيرة أو أرقام أو شرطات. يُحفظ في العرض ولا يتغيّر لاحقاً.",
    tr: "Küçük harf, rakam veya tire. Teklifte saklanır ve sonradan değişmez.",
  },
  needCode: { de: "Gib einen Code ein (z. B. billard).", en: "Enter a code (e.g. billard).", ar: "أدخل رمزاً (مثلاً billard).", tr: "Bir kod girin (ör. billard)." },
  badCode: { de: "Nur Kleinbuchstaben, Ziffern und Bindestriche.", en: "Lower-case letters, digits and hyphens only.", ar: "أحرف صغيرة وأرقام وشرطات فقط.", tr: "Yalnızca küçük harf, rakam ve tire." },
  codeExists: { de: "Diesen Code gibt es schon.", en: "That code already exists.", ar: "هذا الرمز موجود مسبقاً.", tr: "Bu kod zaten var." },
  search: { de: "Suchen", en: "Search", ar: "بحث", tr: "Ara" },
  searchPh: { de: "Name oder Kategorie…", en: "Name or category…", ar: "الاسم أو الفئة…", tr: "Ad veya kategori…" },
  name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  category: { de: "Kategorie", en: "Category", ar: "الفئة", tr: "Kategori" },
  price: { de: "Transport €", en: "Transport €", ar: "النقل €", tr: "Taşıma €" },
  disposal: { de: "Entsorgung €", en: "Disposal €", ar: "التخلص €", tr: "İmha €" },
  assembly: { de: "Aufbau €", en: "Assembly €", ar: "التركيب €", tr: "Kurulum €" },
  disassembly: { de: "Abbau €", en: "Dismantling €", ar: "الفك €", tr: "Söküm €" },
  volume: { de: "Volumen m³", en: "Volume m³", ar: "الحجم م³", tr: "Hacim m³" },
  active: { de: "Aktiv", en: "Active", ar: "فعّال", tr: "Etkin" },
  add: { de: "Gegenstand hinzufügen", en: "Add item", ar: "إضافة عنصر", tr: "Kalem ekle" },
  retire: { de: "Stilllegen", en: "Retire", ar: "إيقاف", tr: "Kullanımdan kaldır" },
  showRetired: { de: "Stillgelegte zeigen", en: "Show retired", ar: "عرض الموقوفة", tr: "Kullanımdan kaldırılanları göster" },
  needName: { de: "Gib einen Namen und eine Kategorie ein.", en: "Enter a name and a category.", ar: "أدخل اسماً وفئة.", tr: "Bir ad ve kategori girin." },
  nameExists: { de: "Diesen Gegenstand gibt es schon in dieser Kategorie.", en: "That item already exists in this category.", ar: "هذا العنصر موجود في هذه الفئة.", tr: "Bu kalem bu kategoride zaten var." },
  badNumber: { de: "Gib einen Betrag mit höchstens zwei Nachkommastellen ein.", en: "Enter an amount with at most two decimals.", ar: "أدخل مبلغاً بخانتين عشريتين كحد أقصى.", tr: "En fazla iki ondalık basamaklı bir tutar girin." },
  saveFailed: { de: "Nicht gespeichert.", en: "Not saved.", ar: "لم يُحفظ.", tr: "Kaydedilmedi." },
  saved: { de: "Gespeichert.", en: "Saved.", ar: "تم الحفظ.", tr: "Kaydedildi." },
  retired: { de: "Stillgelegt. Alte Aufträge behalten ihn.", en: "Retired. Old orders keep it.", ar: "أُوقف. الطلبات القديمة تحتفظ به.", tr: "Kullanımdan kaldırıldı. Eski siparişler korur." },
  empty: { de: "Keine Gegenstände.", en: "No items.", ar: "لا عناصر.", tr: "Kalem yok." },
  count: { de: "{n} Gegenstände", en: "{n} items", ar: "{n} عنصر", tr: "{n} kalem" },
});

type Kind = "furniture" | "cleaning" | "special";

interface Item {
  id: string;
  kind: Kind;
  category: string;
  name: string;
  price: string;
  disposalPrice: string;
  assemblyPrice: string;
  disassemblyPrice: string;
  volumeM3: string | null;
  code: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** Money and volume as the API wants them: a plain decimal, no thousands marks. */
const DECIMAL = /^\d{1,6}(\.\d{1,2})?$/;
const clean = (raw: string) => raw.trim().replace(",", ".");

export default function CatalogPage() {
  const { sdk, user, loading } = useApi();
  const tx = useText(TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<Kind>("furniture");
  const [query, setQuery] = useState("");
  const [withRetired, setWithRetired] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", price: "", volumeM3: "", code: "" });
  const [error, setError] = useState("");

  /**
   * Waits for the session before asking.
   *
   * `GET /api/catalog` answers anonymous callers too — with the public shape,
   * which leaves out `isActive` and every retired row. Asking before the token
   * is in hand therefore succeeds, so nothing retries, and the screen caches a
   * catalogue it cannot manage. The user id is part of the key so signing in
   * fetches again rather than reusing that answer.
   */
  const list = useQuery({
    queryKey: ["admin", "catalog", user?.id ?? null],
    queryFn: () => sdk.http.get<{ items: Item[] }>("/api/catalog?includeInactive=true"),
    enabled: !loading && Boolean(user),
    staleTime: 10_000,
  });

  const items = useMemo(() => list.data?.items ?? [], [list.data]);

  /** The categories already in use, so a new item joins one instead of inventing a near-duplicate. */
  const categories = useMemo(
    () => [...new Set(items.filter((item) => item.kind === kind).map((item) => item.category))].sort(),
    [items, kind],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => item.kind === kind)
      .filter((item) => withRetired || item.isActive)
      .filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.category.toLowerCase().includes(needle))
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [items, kind, query, withRetired]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });

  const failed = (caught: unknown) => toast(caught instanceof ApiError && caught.message ? caught.message : tx("saveFailed"));

  const create = useMutation({
    mutationFn: (body: Partial<Item>) => sdk.http.post<Item>("/api/catalog", body),
    onSuccess: () => {
      setForm({ name: "", category: "", price: "", volumeM3: "", code: "" });
      setError("");
      toast(tx("saved"));
      void refresh();
    },
    onError: failed,
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Item> }) => sdk.http.patch<Item>(`/api/catalog/${id}`, body),
    onSuccess: () => void refresh(),
    onError: failed,
  });

  const retire = useMutation({
    mutationFn: (id: string) => sdk.http.delete(`/api/catalog/${id}`),
    onSuccess: () => {
      toast(tx("retired"));
      void refresh();
    },
    onError: failed,
  });

  /** Writes one field, after checking the ones that must stay decimals. */
  function edit(item: Item, field: keyof Item, raw: string) {
    if (field === "name" || field === "category") {
      const value = raw.trim();
      if (!value) return;
      patch.mutate({ id: item.id, body: { [field]: value } });
      return;
    }
    const value = clean(raw);
    if (!DECIMAL.test(value)) {
      toast(tx("badNumber"));
      return;
    }
    patch.mutate({ id: item.id, body: { [field]: value } });
  }

  const CODE = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const SPECIAL_CATEGORY = "Besondere Gegenstände";

  function add() {
    const name = form.name.trim();
    // A special item is filed in one place; the office names the item, not the
    // folder it sits in.
    const category = kind === "special" ? SPECIAL_CATEGORY : form.category.trim();
    if (!name || !category) return setError(tx("needName"));

    const code = form.code.trim().toLowerCase();
    if (kind === "special") {
      if (!code) return setError(tx("needCode"));
      if (!CODE.test(code)) return setError(tx("badCode"));
      if (items.some((item) => item.code === code)) return setError(tx("codeExists"));
    }

    const price = clean(form.price || "0");
    const volume = clean(form.volumeM3 || "");
    if (!DECIMAL.test(price)) return setError(tx("badNumber"));
    if (volume && !DECIMAL.test(volume)) return setError(tx("badNumber"));

    const duplicate = items.some(
      (item) => item.kind === kind && item.category.toLowerCase() === category.toLowerCase() && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return setError(tx("nameExists"));

    setError("");
    create.mutate({
      kind,
      name,
      category,
      price,
      // A cleaning item is priced by the room, not carried: the move-only
      // amounts stay at zero unless the office fills them in on the row.
      ...(kind === "furniture" && volume ? { volumeM3: volume } : {}),
      ...(kind === "special" ? { code } : {}),
    });
  }

  const kinds: { value: Kind; label: string }[] = [
    { value: "furniture", label: tx("furniture") },
    { value: "cleaning", label: tx("cleaning") },
    { value: "special", label: tx("special") },
  ];

  return (
    <AdminShell view="catalog">
      <section data-screen-label="Catalogue" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
          <p style={{ color: "#737870", fontSize: 13, marginTop: 6 }}>{kind === "special" ? tx("specialSub") : tx("sub")}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "#f1f3f5", borderRadius: 999 }}>
            {kinds.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setKind(entry.value)}
                style={{
                  minHeight: 32,
                  padding: "0 16px",
                  border: 0,
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: kind === entry.value ? "#ffffff" : "transparent",
                  color: kind === entry.value ? "#1d2220" : "#737870",
                  boxShadow: kind === entry.value ? "0 1px 3px #202a2314" : "none",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx("searchPh")}
            aria-label={tx("search")}
            style={{ ...input, flex: "1 1 220px", maxWidth: 320 }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#737870" }}>
            <input type="checkbox" checked={withRetired} onChange={(event) => setWithRetired(event.target.checked)} />
            {tx("showRetired")}
          </label>

          <span style={{ marginInlineStart: "auto", fontSize: 12.5, color: "#737870" }}>{tx("count", { n: shown.length })}</span>
        </div>

        <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ ...label, flex: "1 1 200px" }}>
              {tx("name")}
              <input value={form.name} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} style={input} />
            </label>
            {kind === "special" ? (
              <label style={{ ...label, flex: "1 1 160px" }}>
                {tx("code")}
                <input
                  dir="ltr"
                  value={form.code}
                  maxLength={40}
                  placeholder="billard"
                  title={tx("codeHint")}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase() })}
                  style={input}
                />
              </label>
            ) : (
              <label style={{ ...label, flex: "1 1 160px" }}>
                {tx("category")}
                <input
                  value={form.category}
                  maxLength={60}
                  list="catalog-categories"
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  style={input}
                />
                <datalist id="catalog-categories">
                  {categories.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
            )}
            <label style={{ ...label, flex: "0 1 120px" }}>
              {tx("price")}
              <input dir="ltr" inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} style={input} />
            </label>
            {kind === "furniture" ? (
              <label style={{ ...label, flex: "0 1 120px" }}>
                {tx("volume")}
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={form.volumeM3}
                  onChange={(event) => setForm({ ...form, volumeM3: event.target.value })}
                  style={input}
                />
              </label>
            ) : null}
            <button type="button" onClick={add} disabled={create.isPending} style={primary}>
              {tx("add")}
            </button>
          </div>
          {error ? <p style={{ color: "#b7122b", fontSize: 12.5, margin: 0 }}>{error}</p> : null}
        </div>

        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {(kind === "special"
                  ? [tx("name"), tx("code"), tx("price"), tx("active"), ""]
                  : [tx("name"), tx("category"), tx("price"), tx("disposal"), tx("assembly"), tx("disassembly"), ...(kind === "furniture" ? [tx("volume")] : []), tx("active"), ""]
                ).map(
                  (heading, index) => (
                    <th
                      key={index}
                      style={{
                        textAlign: index === 0 || index === 1 ? "start" : "end",
                        padding: "12px 14px",
                        borderBottom: "1px solid #e3e5de",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        color: "#737870",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "22px 14px", color: "#737870" }}>
                    {tx("empty")}
                  </td>
                </tr>
              ) : null}
              {shown.map((item) => (
                <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.55 }}>
                  <td style={cell}>
                    <input defaultValue={item.name} maxLength={80} onBlur={(event) => edit(item, "name", event.target.value)} style={{ ...rowInput, fontWeight: 600, minWidth: 150 }} />
                  </td>
                  {kind === "special" ? (
                    // Not editable: a quote already taken records this word, and
                    // changing it would orphan that line. Rename the item instead.
                    <td style={{ ...cell, color: "#737870", fontFamily: "ui-monospace, monospace", fontSize: 12.5 }} dir="ltr">
                      {item.code}
                    </td>
                  ) : (
                    <td style={cell}>
                      <input defaultValue={item.category} maxLength={60} list="catalog-categories" onBlur={(event) => edit(item, "category", event.target.value)} style={{ ...rowInput, minWidth: 110 }} />
                    </td>
                  )}
                  {(kind === "special" ? (["price"] as const) : (["price", "disposalPrice", "assemblyPrice", "disassemblyPrice"] as const)).map((field) => (
                    <td key={field} style={{ ...cell, textAlign: "end" }}>
                      <input dir="ltr" inputMode="decimal" defaultValue={item[field]} onBlur={(event) => edit(item, field, event.target.value)} style={{ ...rowInput, width: 86, textAlign: "end" }} />
                    </td>
                  ))}
                  {kind === "furniture" ? (
                    <td style={{ ...cell, textAlign: "end" }}>
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        defaultValue={item.volumeM3 ?? ""}
                        onBlur={(event) => edit(item, "volumeM3", event.target.value)}
                        style={{ ...rowInput, width: 76, textAlign: "end" }}
                      />
                    </td>
                  ) : null}
                  <td style={{ ...cell, textAlign: "end" }}>
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) => patch.mutate({ id: item.id, body: { isActive: event.target.checked } })}
                      aria-label={tx("active")}
                    />
                  </td>
                  <td style={{ ...cell, textAlign: "end" }}>
                    {item.isActive ? (
                      <button type="button" onClick={() => retire.mutate(item.id)} style={ghost}>
                        {tx("retire")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870", minWidth: 0 };
const input: CSSProperties = { width: "100%", height: 41, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" };
const rowInput: CSSProperties = { height: 32, padding: "0 8px", border: "1px solid transparent", borderRadius: 5, background: "transparent", fontSize: 13, color: "#252b28" };
const cell: CSSProperties = { padding: "6px 14px", borderBottom: "1px solid #eceee9", verticalAlign: "middle" };
const primary: CSSProperties = {
  minHeight: 41,
  padding: "0 18px",
  border: 0,
  borderRadius: 6,
  background: "#d71635",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const ghost: CSSProperties = {
  minHeight: 30,
  padding: "0 10px",
  border: "1px solid #cfd3cb",
  borderRadius: 5,
  background: "#ffffff",
  color: "#737870",
  fontSize: 12,
  whiteSpace: "nowrap",
};
