"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { dateTag, money } from "@/lib/admin/format";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { LOCALE_META } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Damage cases, as the admin prototype's "Damage & insurance" screen draws
 * them: open/claimed/approved totals, status tabs, the list of cases and the
 * selected case beside it — item, what happened, status, solution, claimed
 * and approved amounts, photos and a dated notes timeline. Changes save as
 * they are made (cases are operational data, not website configuration).
 *
 * Cases come from three places: the team opens one here, the crew page
 * reports one, and a signed-in customer reports damage on their order.
 */

const TEXT = defineText({
  title: { de: "Schäden & Versicherung", en: "Damage & insurance", ar: "الأضرار والتأمين", tr: "Hasar ve sigorta" },
  sub: {
    de: "Jede Schadensmeldung von der ersten Meldung bis zur Lösung, mit Fotos und der Entscheidung der Versicherung.",
    en: "Every damage report from first report to solution, with photos and the insurer’s decision.",
    ar: "كل بلاغ ضرر من لحظة الإبلاغ حتى الحل، مع الصور وقرار التأمين.",
    tr: "İlk bildirimden çözüme kadar her hasar bildirimi; fotoğraflar ve sigortanın kararıyla.",
  },
  newCase: { de: "Neuer Fall", en: "New case", ar: "ملف جديد", tr: "Yeni dosya" },
  openN: { de: "Offene Fälle", en: "Open cases", ar: "ملفات مفتوحة", tr: "Açık dosyalar" },
  claimed: { de: "Gefordert", en: "Claimed", ar: "المطالَب به", tr: "Talep edilen" },
  approved: { de: "Bewilligt", en: "Approved", ar: "المعتمد", tr: "Onaylanan" },
  all: { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  st_reported: { de: "Gemeldet", en: "Reported", ar: "تم الإبلاغ", tr: "Bildirildi" },
  st_checking: { de: "In Prüfung", en: "Checking", ar: "قيد المراجعة", tr: "İnceleniyor" },
  st_insurer: { de: "Bei der Versicherung", en: "With insurer", ar: "لدى التأمين", tr: "Sigortada" },
  st_resolved: { de: "Erledigt", en: "Resolved", ar: "تم الحل", tr: "Çözüldü" },
  st_rejected: { de: "Abgelehnt", en: "Rejected", ar: "مرفوض", tr: "Reddedildi" },
  item: { de: "Gegenstand", en: "Item", ar: "القطعة", tr: "Eşya" },
  desc: { de: "Was ist passiert", en: "What happened", ar: "ما الذي حدث", tr: "Ne oldu" },
  amount: { de: "Gefordert (€)", en: "Claimed (€)", ar: "المطالبة (€)", tr: "Talep (€)" },
  approvedAmt: { de: "Bewilligt (€)", en: "Approved (€)", ar: "المعتمد (€)", tr: "Onaylanan (€)" },
  solution: { de: "Lösung", en: "Solution", ar: "الحل", tr: "Çözüm" },
  so_none: { de: "Noch offen", en: "Not decided", ar: "لم يُحدد", tr: "Karar verilmedi" },
  so_repair: { de: "Reparatur", en: "Repair", ar: "إصلاح", tr: "Onarım" },
  so_compensation: { de: "Entschädigung", en: "Compensation", ar: "تعويض", tr: "Tazminat" },
  so_replacement: { de: "Ersatz", en: "Replacement", ar: "استبدال", tr: "Yenisiyle değişim" },
  status: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  notes: { de: "NOTIZEN", en: "NOTES", ar: "الملاحظات", tr: "NOTLAR" },
  addNote: { de: "Notiz eingeben und Enter drücken…", en: "Add a note and press Enter…", ar: "أضف ملاحظة واضغط Enter…", tr: "Bir not yazıp Enter’a basın…" },
  photos: { de: "FOTOS", en: "PHOTOS", ar: "الصور", tr: "FOTOĞRAFLAR" },
  addPhoto: { de: "Foto hinzufügen", en: "Add photo", ar: "إضافة صورة", tr: "Fotoğraf ekle" },
  photoUrl: { de: "Bildlink einfügen (https://…)", en: "Paste an image link (https://…)", ar: "الصق رابط الصورة (https://…)", tr: "Görsel bağlantısı yapıştırın (https://…)" },
  pasteLink: { de: "Link einfügen", en: "Paste a link", ar: "لصق رابط", tr: "Bağlantı yapıştır" },
  add: { de: "Hinzufügen", en: "Add", ar: "إضافة", tr: "Ekle" },
  remove: { de: "Entfernen", en: "Remove", ar: "إزالة", tr: "Kaldır" },
  order: { de: "Auftrag", en: "Order", ar: "الطلب", tr: "Sipariş" },
  orderSearch: { de: "Auftragsnummer oder Name suchen", en: "Search order number or name", ar: "ابحث برقم الطلب أو الاسم", tr: "Sipariş numarası veya isim ara" },
  noOrders: { de: "Kein Auftrag gefunden.", en: "No order found.", ar: "لم يُعثر على طلب.", tr: "Sipariş bulunamadı." },
  noOrder: { de: "Kein Auftrag", en: "No order", ar: "بدون طلب", tr: "Sipariş yok" },
  create: { de: "Fall anlegen", en: "Create case", ar: "إنشاء الملف", tr: "Dosya oluştur" },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  none: { de: "Keine Fälle.", en: "No cases.", ar: "لا توجد ملفات.", tr: "Dosya yok." },
  fromCrew: { de: "Von der Crew-Seite", en: "From crew page", ar: "من صفحة العمال", tr: "Ekip sayfasından" },
  fromCust: { de: "Vom Kunden", en: "From customer", ar: "من الزبون", tr: "Müşteriden" },
  select: { de: "Wählen Sie einen Fall, um die Details zu sehen.", en: "Select a case to see the details.", ar: "اختر ملفاً لعرض التفاصيل.", tr: "Ayrıntıları görmek için bir dosya seçin." },
  source: { de: "Quelle", en: "Source", ar: "المصدر", tr: "Kaynak" },
  src_team: { de: "Team (Büro)", en: "Team (office)", ar: "الفريق (المكتب)", tr: "Ekip (ofis)" },
  src_crew: { de: "Crew-Seite", en: "Crew page", ar: "صفحة العمال", tr: "Ekip sayfası" },
  src_customer: { de: "Kundenkonto", en: "Customer account", ar: "حساب الزبون", tr: "Müşteri hesabı" },
  created: { de: "Fall angelegt.", en: "Case created.", ar: "تم إنشاء الملف.", tr: "Dosya oluşturuldu." },
  saveFailed: { de: "Das konnte nicht gespeichert werden.", en: "That could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  badAmount: { de: "Bitte einen gültigen Betrag eingeben.", en: "Enter a valid amount.", ar: "أدخل مبلغاً صحيحاً.", tr: "Geçerli bir tutar girin." },
  badUrl: { de: "Bitte einen Bildlink mit https:// einfügen.", en: "Paste an image link starting with https://.", ar: "الصق رابط صورة يبدأ بـ https://.", tr: "https:// ile başlayan bir görsel bağlantısı yapıştırın." },
  uploadFailed: { de: "Das Foto konnte nicht hochgeladen werden.", en: "The photo could not be uploaded.", ar: "تعذّر رفع الصورة.", tr: "Fotoğraf yüklenemedi." },
  loadFailed: { de: "Die Schadensfälle konnten nicht geladen werden.", en: "The damage cases could not be loaded.", ar: "تعذّر تحميل ملفات الأضرار.", tr: "Hasar dosyaları yüklenemedi." },
});

type Status = "reported" | "checking" | "insurer" | "resolved" | "rejected";
type Source = "customer" | "crew" | "team";
type Solution = "none" | "repair" | "compensation" | "replacement";

interface Claim {
  id: string;
  orderId: string | null;
  orderReference: string | null;
  customerName: string | null;
  source: Source;
  status: Status;
  item: string;
  description: string | null;
  photos: string[];
  claimedAmount: string | null;
  approvedAmount: string | null;
  solution: Solution | null;
  notes: { at: string; text: string; by?: string }[];
  createdAt: string;
}

interface OrderHit {
  id: string;
  reference: string;
  contactName: string;
}

const STATUSES: Status[] = ["reported", "checking", "insurer", "resolved", "rejected"];
const SOLUTIONS: Solution[] = ["none", "repair", "compensation", "replacement"];
const SOURCES: Source[] = ["team", "crew", "customer"];
const STATUS_COLOURS: Record<Status, [string, string]> = {
  reported: ["#fbf4e4", "#5c4a00"],
  checking: ["#eef3fb", "#2d5a8c"],
  insurer: ["#f3eefb", "#5a3d8c"],
  resolved: ["#edf5ed", "#3f705a"],
  rejected: ["#f5f5f0", "#4a514d"],
};

const SHIELD = "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM12 8v5M12 16h.01";
const CAMERA = "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";

const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870", minWidth: 0 };
const input: CSSProperties = { height: 40, padding: "0 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", minWidth: 0 };
const select: CSSProperties = { ...input, padding: "0 8px" };
const textarea: CSSProperties = { padding: "10px 12px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 };
const eyebrow: CSSProperties = { fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" };

/** "45.00" → "45", "45.50" → "45.5": how the prototype shows an amount it lets you edit. */
const amountText = (value: string | null) => (value == null ? "" : String(Number.parseFloat(value)));
const toNumber = (value: string | null) => Number.parseFloat(value ?? "") || 0;

export default function DamageCasesPage() {
  const { sdk, can } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const router = useRouter();
  const client = useQueryClient();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const loc = dateTag(locale);
  const canWrite = can("complaints.write");
  const canUpload = can("content.write") || can("theme.write");

  const [filter, setFilter] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const claims = useQuery({
    queryKey: ["admin", "claims"],
    queryFn: () => sdk.http.get<{ claims: Claim[] }>("/api/claims"),
  });
  const uploads = useQuery({
    queryKey: ["admin", "uploads-enabled"],
    queryFn: () => sdk.http.get<{ enabled: boolean }>("/api/site/uploads"),
    enabled: canUpload,
    retry: false,
  });

  const list = claims.data?.claims ?? [];
  const current = list.find((c) => c.id === selected) ?? null;

  const replace = (claim: Claim) =>
    client.setQueryData<{ claims: Claim[] }>(["admin", "claims"], (old) => {
      const rest = (old?.claims ?? []).filter((c) => c.id !== claim.id);
      return { claims: [claim, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => sdk.http.patch<{ claim: Claim }>(`/api/claims/${id}`, body),
    onSuccess: ({ claim }) => replace(claim),
    onError: (error) => toast(errorText(error, tx("saveFailed"))),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => sdk.http.post<{ claim: Claim }>("/api/claims", body),
    onSuccess: ({ claim }) => {
      replace(claim);
      setCreating(false);
      setSelected(claim.id);
      toast(tx("created"));
    },
    onError: (error) => toast(errorText(error, tx("saveFailed"))),
  });

  const view = useMemo(() => {
    const open = list.filter((c) => c.status !== "resolved" && c.status !== "rejected");
    const kpis = [
      { label: tx("openN"), value: String(open.length) },
      { label: tx("claimed"), value: money(list.reduce((n, c) => n + toNumber(c.claimedAmount), 0)) },
      { label: tx("approved"), value: money(list.reduce((n, c) => n + toNumber(c.approvedAmount), 0)) },
    ];
    // The prototype (v11) has no "Rejected" tab; it appears only once there is
    // a rejected case, which would otherwise be findable only under "All".
    const tabs = (["all", ...STATUSES] as const)
      .map((key) => ({
        key,
        label: key === "all" ? tx("all") : tx(`st_${key}`),
        n: key === "all" ? list.length : list.filter((c) => c.status === key).length,
      }))
      .filter((tab) => tab.key !== "rejected" || tab.n > 0 || filter === "rejected");
    const rows = list.filter((c) => filter === "all" || c.status === filter);
    return { kpis, tabs, rows };
  }, [list, filter, tx]);

  const fd = (iso: string) => new Date(iso).toLocaleDateString(loc, { day: "numeric", month: "short" });
  const save = (body: Record<string, unknown>) => current && patch.mutate({ id: current.id, body });
  const openOrder = (id: string | null) => id && router.push(`/${locale}${ADMIN_PATHS.orders}/${id}`);

  return (
    <AdminShell view="claims">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: rtl ? 0 : "-0.9px", lineHeight: 1.2 }}>{tx("title")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" } as CSSProperties}>{tx("sub")}</p>
          </div>
          {canWrite ? (
            <button
              type="button"
              className="a-btn"
              style={{ flex: "none", borderRadius: 6, fontSize: 12 }}
              onClick={() => {
                setCreating(true);
                setSelected(null);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {tx("newCase")}
            </button>
          ) : null}
        </div>

        {claims.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {view.kpis.map((k) => (
            <div key={k.label} style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <small style={{ fontSize: 11.5, color: "#737870" }}>{k.label}</small>
              <b style={{ fontSize: 24, fontWeight: 650, letterSpacing: rtl ? 0 : "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                <bdi>{claims.isLoading ? "—" : k.value}</bdi>
              </b>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {view.tabs.map((tab) => {
            const on = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(tab.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", minHeight: 34, padding: "0 13px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 999, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#4a514d", fontSize: 12, fontWeight: 600 }}
              >
                {tab.label}
                <span style={{ fontSize: 11, opacity: 0.7 }}>{tab.n}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16, alignItems: "start" }}>
          <div style={{ ...card, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {claims.isLoading
              ? [0, 1, 2].map((i) => <div key={i} className="a-skel" style={{ height: 60, borderRadius: 8 }} />)
              : view.rows.map((c) => {
                  const on = current?.id === c.id && !creating;
                  const [bg, fg] = STATUS_COLOURS[c.status] ?? STATUS_COLOURS.reported;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelected(c.id);
                        setCreating(false);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px solid ${on ? "#d71635" : "#eef0ea"}`, borderRadius: 8, background: on ? "#fff6f6" : "#ffffff", textAlign: "start", width: "100%", color: "#252b28" }}
                    >
                      <span style={{ width: 36, height: 36, borderRadius: 8, background: "#f1f3f5", color: "#4a514d", display: "grid", placeItems: "center", flex: "none" }}>
                        <Icon d={SHIELD} size={17} width={1.9} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <b style={{ fontSize: 13, fontWeight: 600, color: "#252b28", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.item || "—"}</b>
                          <SourceTag source={c.source} tx={tx} />
                        </span>
                        <small style={{ fontSize: 11.5, color: "#737870", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <bdi>{c.orderReference ?? "—"}</bdi>
                          {c.customerName ? ` · ${c.customerName}` : ""} · {fd(c.createdAt)}
                        </small>
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "none" }}>
                        <b style={{ fontSize: 12.5, fontWeight: 650, color: "#252b28", fontVariantNumeric: "tabular-nums" }}>
                          <bdi>{money(c.claimedAmount)}</bdi>
                        </b>
                        <span style={{ padding: "3px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 10.5, fontWeight: 650, whiteSpace: "nowrap" }}>{tx(`st_${c.status}`)}</span>
                      </span>
                    </button>
                  );
                })}
            {!claims.isLoading && view.rows.length === 0 ? <p style={{ padding: "30px 12px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p> : null}
          </div>

          <div style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {creating ? (
              <NewCase tx={tx} busy={create.isPending} onCancel={() => setCreating(false)} onCreate={(body) => create.mutate(body)} />
            ) : current ? (
              <Detail
                key={current.id}
                claim={current}
                tx={tx}
                loc={loc}
                canWrite={canWrite}
                canUpload={canUpload && !!uploads.data?.enabled}
                onSave={save}
                onOrder={() => openOrder(current.orderId)}
              />
            ) : (
              <p style={{ padding: "40px 10px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("select")}</p>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

type Tx = TextFn<typeof TEXT>;

/** The server's messages are English; the screen speaks the reader's language. */
function errorText(_error: unknown, fallback: string): string {
  return fallback;
}

function Icon({ d, size = 16, width = 2 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function SourceTag({ source, tx, big }: { source: Source; tx: Tx; big?: boolean }) {
  if (source === "crew")
    return <span style={{ padding: big ? "2px 8px" : "1px 6px", borderRadius: 4, background: "#fff6f6", color: "#b7122b", fontSize: big ? 10.5 : 10, fontWeight: 650, whiteSpace: "nowrap" }}>{tx("fromCrew")}</span>;
  if (source === "customer")
    return <span style={{ padding: big ? "2px 8px" : "1px 6px", borderRadius: 4, background: "#eef2fb", color: "#3d5a99", fontSize: big ? 10.5 : 10, fontWeight: 650, whiteSpace: "nowrap" }}>{tx("fromCust")}</span>;
  return null;
}

/** Search an order by its reference or the customer's name, and pick one. */
function OrderPicker({ tx, value, onPick, disabled }: { tx: Tx; value: OrderHit | null; onPick: (order: OrderHit | null) => void; disabled?: boolean }) {
  const { sdk } = useApi();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const hits = useQuery({
    queryKey: ["admin", "claims", "orders", term],
    queryFn: () => sdk.http.get<{ orders: OrderHit[] }>("/api/claims/orders", term ? { q: term } : undefined),
    enabled: open,
  });

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, paddingInlineStart: 12, paddingInlineEnd: 6, border: "1px solid #cfd3cb", borderRadius: 6, fontSize: 13, color: "#252b28" }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <bdi>{value.reference}</bdi> · {value.contactName}
        </span>
        {!disabled ? (
          <button type="button" aria-label={tx("remove")} onClick={() => onPick(null)} style={{ width: 28, height: 28, border: 0, borderRadius: 6, background: "transparent", color: "#92958e", fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <input
        value={q}
        disabled={disabled}
        placeholder={tx("orderSearch")}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{ ...input, width: "100%" }}
      />
      {open ? (
        <div style={{ position: "absolute", insetInline: 0, top: "calc(100% + 4px)", zIndex: 20, maxHeight: 240, overflowY: "auto", background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 8, boxShadow: "0 18px 40px #1d22201f" }}>
          {(hits.data?.orders ?? []).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onPick(o);
                setOpen(false);
                setQ("");
              }}
              style={{ display: "block", width: "100%", padding: "9px 12px", border: 0, borderBottom: "1px solid #eef0ea", background: "#ffffff", textAlign: "start", fontSize: 12.5, color: "#252b28" }}
            >
              <b style={{ fontWeight: 600 }}>
                <bdi>{o.reference}</bdi>
              </b>{" "}
              · {o.contactName}
            </button>
          ))}
          {hits.data && hits.data.orders.length === 0 ? <p style={{ padding: 14, fontSize: 12.5, color: "#92958e", textAlign: "center" }}>{tx("noOrders")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function NewCase({ tx, busy, onCancel, onCreate }: { tx: Tx; busy: boolean; onCancel: () => void; onCreate: (body: Record<string, unknown>) => void }) {
  const [order, setOrder] = useState<OrderHit | null>(null);
  const [source, setSource] = useState<Source>("team");
  const [item, setItem] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <>
      <b style={{ fontSize: 16, fontWeight: 650 }}>{tx("newCase")}</b>
      <div style={label}>
        {tx("order")}
        <OrderPicker tx={tx} value={order} onPick={setOrder} />
      </div>
      <label style={label}>
        {tx("source")}
        <select value={source} onChange={(event) => setSource(event.target.value as Source)} style={select}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {tx(`src_${s}`)}
            </option>
          ))}
        </select>
      </label>
      <label style={label}>
        {tx("item")}
        <input value={item} onChange={(event) => setItem(event.target.value)} style={input} />
      </label>
      <label style={label}>
        {tx("desc")}
        <textarea value={desc} onChange={(event) => setDesc(event.target.value)} rows={3} style={textarea} />
      </label>
      <label style={label}>
        {tx("amount")}
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" style={input} />
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ minHeight: 38, padding: "0 14px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 12, fontWeight: 600 }}>
          {tx("cancel")}
        </button>
        <button
          type="button"
          disabled={busy || !item.trim()}
          onClick={() => onCreate({ orderId: order?.id ?? null, source, item: item.trim(), description: desc.trim() || undefined, claimedAmount: amount.trim() || null })}
          style={{ minHeight: 38, padding: "0 16px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}
        >
          {tx("create")}
        </button>
      </div>
    </>
  );
}

/** A field that saves when it loses focus, if it changed. */
function useDraftField(live: string) {
  const [value, setValue] = useState(live);
  useEffect(() => setValue(live), [live]);
  return [value, setValue] as const;
}

function Detail({
  claim,
  tx,
  loc,
  canWrite,
  canUpload,
  onSave,
  onOrder,
}: {
  claim: Claim;
  tx: Tx;
  loc: string;
  canWrite: boolean;
  canUpload: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onOrder: () => void;
}) {
  const { sdk } = useApi();
  const toast = useToast();
  const [item, setItem] = useDraftField(claim.item);
  const [desc, setDesc] = useDraftField(claim.description ?? "");
  const [amount, setAmount] = useDraftField(amountText(claim.claimedAmount));
  const [approved, setApproved] = useDraftField(amountText(claim.approvedAmount));
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const fd = (iso: string) => new Date(iso).toLocaleDateString(loc, { day: "numeric", month: "short" });
  const validAmount = (v: string) => !v.trim() || /^\d+([.,]\d{1,2})?$/.test(v.trim().replace(/\s|€/g, ""));

  const addPhoto = (url: string) => onSave({ photos: [...claim.photos, url] });

  const upload = async (picked: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", picked);
      const { url } = await sdk.http.post<{ url: string }>("/api/site/uploads", form, { query: { kind: "image" }, timeoutMs: 120_000 });
      addPhoto(url);
    } catch {
      toast(tx("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const tile: CSSProperties = { width: 84, height: 84, border: "1.5px dashed #cfd3cb", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "#737870", fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "center", background: "#ffffff", padding: 4 };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {claim.orderId ? (
          <button type="button" onClick={onOrder} style={{ border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 600, color: "#d71635", textAlign: "start" }}>
            {tx("order")} · <bdi>{claim.orderReference}</bdi> · {claim.customerName}
          </button>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#737870" }}>
            {tx("order")} · {tx("noOrder")}
          </span>
        )}
        <SourceTag source={claim.source} tx={tx} big />
      </div>
      {!claim.orderId && canWrite ? <OrderPicker tx={tx} value={null} onPick={(o) => o && onSave({ orderId: o.id })} /> : null}

      <label style={label}>
        {tx("item")}
        <input
          dir="auto"
          value={item}
          disabled={!canWrite}
          onChange={(event) => setItem(event.target.value)}
          onBlur={() => item.trim() && item.trim() !== claim.item && onSave({ item: item.trim() })}
          style={{ ...input, fontSize: 14, fontWeight: 600 }}
        />
      </label>
      <label style={label}>
        {tx("desc")}
        <textarea
          dir="auto"
          value={desc}
          disabled={!canWrite}
          rows={2}
          onChange={(event) => setDesc(event.target.value)}
          onBlur={() => desc.trim() !== (claim.description ?? "") && onSave({ description: desc.trim() })}
          style={textarea}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <label style={label}>
          {tx("status")}
          <select value={claim.status} disabled={!canWrite} onChange={(event) => onSave({ status: event.target.value })} style={select}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tx(`st_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label style={label}>
          {tx("solution")}
          <select value={claim.solution ?? "none"} disabled={!canWrite} onChange={(event) => onSave({ solution: event.target.value })} style={select}>
            {SOLUTIONS.map((s) => (
              <option key={s} value={s}>
                {tx(`so_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label style={label}>
            {tx("amount")}
            <input
              value={amount}
              disabled={!canWrite}
              inputMode="decimal"
              aria-invalid={!validAmount(amount)}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={() => {
                if (!validAmount(amount)) return toast(tx("badAmount"));
                if (amount !== amountText(claim.claimedAmount)) onSave({ claimedAmount: amount.trim() || null });
              }}
              style={{ ...input, ...(validAmount(amount) ? {} : { borderColor: "#d71635", background: "#fff6f6" }) }}
            />
          </label>
        <label style={label}>
          {tx("approvedAmt")}
          <input
            value={approved}
            disabled={!canWrite}
            inputMode="decimal"
            aria-invalid={!validAmount(approved)}
            onChange={(event) => setApproved(event.target.value)}
            onBlur={() => {
              if (!validAmount(approved)) return toast(tx("badAmount"));
              if (approved !== amountText(claim.approvedAmount)) onSave({ approvedAmount: approved.trim() || null });
            }}
            style={{ ...input, ...(validAmount(approved) ? {} : { borderColor: "#d71635", background: "#fff6f6" }) }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={eyebrow}>{tx("photos")}</b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {claim.photos.map((url, i) => (
            <span key={`${url}-${i}`} style={{ position: "relative", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid #e3e5de" }}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </a>
              {canWrite ? (
                <button
                  type="button"
                  aria-label={tx("remove")}
                  title={tx("remove")}
                  onClick={() => onSave({ photos: claim.photos.filter((_, j) => j !== i) })}
                  style={{ position: "absolute", top: 4, insetInlineEnd: 4, width: 22, height: 22, border: 0, borderRadius: "50%", background: "#ffffffe6", color: "#b7122b", display: "grid", placeItems: "center", padding: 0, fontSize: 13, fontWeight: 700 }}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {canWrite && claim.photos.length < 12 ? (
            <>
              <button type="button" disabled={uploading} onClick={() => (canUpload ? file.current?.click() : setLinkOpen((o) => !o))} style={tile}>
                {uploading ? <span className="a-spin" style={{ borderColor: "#cfd3cb", borderTopColor: "#737870" }} /> : <Icon d={CAMERA} size={18} width={1.9} />}
                {tx("addPhoto")}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  event.target.value = "";
                  if (picked) void upload(picked);
                }}
              />
            </>
          ) : null}
        </div>
        {canWrite && canUpload && !linkOpen ? (
          <button type="button" className="a-link-btn" style={{ alignSelf: "flex-start", fontSize: 11.5 }} onClick={() => setLinkOpen(true)}>
            {tx("pasteLink")}
          </button>
        ) : null}
        {canWrite && linkOpen ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input dir="ltr" value={link} placeholder={tx("photoUrl")} onChange={(event) => setLink(event.target.value)} style={{ ...input, flex: 1 }} />
            <button
              type="button"
              className="a-btn is-ghost is-sm"
              style={{ minHeight: 40 }}
              onClick={() => {
                const url = link.trim();
                if (!/^https?:\/\/\S+$/i.test(url)) return toast(tx("badUrl"));
                addPhoto(url);
                setLink("");
                setLinkOpen(false);
              }}
            >
              {tx("add")}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={eyebrow}>{tx("notes")}</b>
        {canWrite ? (
          <input
            dir="auto"
            placeholder={tx("addNote")}
            onKeyDown={(event) => {
              const target = event.currentTarget;
              if (event.key !== "Enter" || !target.value.trim()) return;
              onSave({ addNote: target.value.trim() });
              target.value = "";
            }}
            style={input}
          />
        ) : null}
        {[...claim.notes].reverse().map((n, i) => (
          <div key={`${n.at}-${i}`} style={{ display: "flex", gap: 10, fontSize: 12.5, lineHeight: 1.45 }}>
            <small style={{ flex: "none", width: 52, color: "#92958e", fontSize: 11, paddingTop: 1 }}>{fd(n.at)}</small>
            <span dir="auto" style={{ color: "#252b28", whiteSpace: "pre-wrap", minWidth: 0, overflowWrap: "anywhere", textAlign: "start" }}>{n.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}
