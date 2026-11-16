"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { dateTag } from "@/lib/admin/format";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import { RichTextEditor } from "./RichTextEditor";

/**
 * Job postings and applications (Website → Stellen & Bewerbungen).
 *
 * The postings on the website's Jobs page: add, edit, switch off and delete
 * them, with the details page's sections written in a small rich-text editor.
 * Unlike most website screens this is not a draft: a saved posting is on the
 * website at once, because a job ad is one self-contained thing, not part of
 * a page whose pieces have to change together.
 *
 * Under the list, the applications sent for the chosen posting: the
 * applicant's details and message, and their CV and attachments to download.
 * Opening one marks it read. The office's notification mail links here with
 * ?job=…&application=….
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TEXT = defineText({
  title: { de: "Stellen & Bewerbungen", en: "Jobs & applications", ar: "الوظائف والطلبات", tr: "İlanlar ve başvurular" },
  sub: {
    de: "Die Stellen auf der Jobs-Seite der Website. Änderungen sind nach dem Speichern sofort online.",
    en: "The roles on the website's Jobs page. Changes go live as soon as you save.",
    ar: "الوظائف المعروضة في صفحة الوظائف على الموقع. التغييرات تظهر فوراً بعد الحفظ.",
    tr: "Web sitesinin Kariyer sayfasındaki ilanlar. Değişiklikler kaydettiğiniz anda yayına girer.",
  },
  add: { de: "Neue Stelle", en: "Add new job", ar: "إضافة وظيفة", tr: "Yeni ilan" },
  colJob: { de: "Stelle", en: "Job", ar: "الوظيفة", tr: "İlan" },
  colPlace: { de: "Standort", en: "Location", ar: "المكان", tr: "Konum" },
  colType: { de: "Art", en: "Type", ar: "النوع", tr: "Tür" },
  colActive: { de: "Online", en: "Live", ar: "منشورة", tr: "Yayında" },
  colApps: { de: "Bewerbungen", en: "Applications", ar: "الطلبات", tr: "Başvurular" },
  full_time: { de: "Vollzeit", en: "Full-time", ar: "دوام كامل", tr: "Tam zamanlı" },
  part_time: { de: "Teilzeit", en: "Part-time", ar: "دوام جزئي", tr: "Yarı zamanlı" },
  mini_job: { de: "Minijob", en: "Mini-job", ar: "عمل مصغّر", tr: "Mini iş" },
  newN: { de: "{n} neu", en: "{n} new", ar: "{n} جديد", tr: "{n} yeni" },
  edit: { de: "Bearbeiten", en: "Edit", ar: "تعديل", tr: "Düzenle" },
  view: { de: "Ansehen", en: "View", ar: "عرض", tr: "Görüntüle" },
  del: { de: "Löschen", en: "Delete", ar: "حذف", tr: "Sil" },
  delAsk: {
    de: "„{title}“ von der Website löschen? Eingegangene Bewerbungen bleiben hier erhalten.",
    en: "Delete “{title}” from the website? Applications already received stay here.",
    ar: "حذف «{title}» من الموقع؟ الطلبات التي وصلت تبقى محفوظة هنا.",
    tr: "“{title}” web sitesinden silinsin mi? Gelen başvurular burada kalır.",
  },
  cancel: { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  save: { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  saving: { de: "Speichert…", en: "Saving…", ar: "جارٍ الحفظ…", tr: "Kaydediliyor…" },
  saved: { de: "Gespeichert. Die Stelle ist auf der Website aktualisiert.", en: "Saved. The job is updated on the website.", ar: "تم الحفظ. الوظيفة محدّثة على الموقع.", tr: "Kaydedildi. İlan web sitesinde güncellendi." },
  deleted: { de: "Die Stelle wurde gelöscht.", en: "The job was deleted.", ar: "تم حذف الوظيفة.", tr: "İlan silindi." },
  saveFailed: { de: "Das konnte nicht gespeichert werden.", en: "That could not be saved.", ar: "تعذّر الحفظ.", tr: "Kaydedilemedi." },
  loadFailed: { de: "Die Stellen konnten nicht geladen werden.", en: "The jobs could not be loaded.", ar: "تعذّر تحميل الوظائف.", tr: "İlanlar yüklenemedi." },
  none: { de: "Noch keine Stellen. Legen Sie die erste mit „Neue Stelle“ an.", en: "No jobs yet. Create the first one with “Add new job”.", ar: "لا توجد وظائف بعد. أضف أول وظيفة من «إضافة وظيفة».", tr: "Henüz ilan yok. İlkini “Yeni ilan” ile oluşturun." },
  editTitle: { de: "Stelle bearbeiten", en: "Edit job", ar: "تعديل الوظيفة", tr: "İlanı düzenle" },
  newTitle: { de: "Neue Stelle", en: "New job", ar: "وظيفة جديدة", tr: "Yeni ilan" },
  fTitle: { de: "Stellentitel", en: "Job title", ar: "عنوان الوظيفة", tr: "İlan başlığı" },
  fTitlePh: { de: "z. B. Umzugshelfer (m/w/d)", en: "e.g. Mover (m/f/d)", ar: "مثلاً: Umzugshelfer (m/w/d)", tr: "ör. Umzugshelfer (m/w/d)" },
  fSummary: { de: "Kurzbeschreibung", en: "Short description", ar: "وصف قصير", tr: "Kısa açıklama" },
  fSummaryHint: { de: "Eine Zeile unter dem Titel in der Liste.", en: "One line under the title in the list.", ar: "سطر واحد تحت العنوان في القائمة.", tr: "Listede başlığın altındaki tek satır." },
  fPlace: { de: "Standort", en: "Location", ar: "المكان", tr: "Konum" },
  fType: { de: "Anstellungsart", en: "Employment type", ar: "نوع الدوام", tr: "Çalışma şekli" },
  fActive: { de: "Auf der Website anzeigen", en: "Show on the website", ar: "إظهار على الموقع", tr: "Web sitesinde göster" },
  fDetails: { de: "Details (Seite der Stelle)", en: "Full details (the job's page)", ar: "التفاصيل (صفحة الوظيفة)", tr: "Detaylar (ilan sayfası)" },
  fDetailsHint: {
    de: "Leere Abschnitte werden auf der Website nicht angezeigt. Stellentexte erscheinen in allen Sprachen der Website so, wie Sie sie hier schreiben.",
    en: "Empty sections are not shown on the website. Job texts appear in every site language exactly as you write them here.",
    ar: "الأقسام الفارغة لا تظهر على الموقع. نصوص الوظيفة تظهر بكل لغات الموقع كما تكتبها هنا.",
    tr: "Boş bölümler web sitesinde gösterilmez. İlan metinleri sitenin tüm dillerinde burada yazdığınız gibi görünür.",
  },
  sDescription: { de: "Über die Stelle", en: "About the role", ar: "عن الوظيفة", tr: "Pozisyon hakkında" },
  sTasks: { de: "Ihre Aufgaben", en: "Tasks", ar: "المهام", tr: "Görevler" },
  sRequirements: { de: "Ihr Profil (Anforderungen)", en: "Requirements", ar: "المتطلبات", tr: "Gereksinimler" },
  sOffer: { de: "Das bieten wir", en: "What we offer", ar: "ما نقدّمه", tr: "Sunduklarımız" },
  linkAsk: { de: "Adresse des Links (https://…)", en: "Link address (https://…)", ar: "عنوان الرابط (https://…)", tr: "Bağlantı adresi (https://…)" },
  titleMissing: { de: "Geben Sie einen Stellentitel ein.", en: "Enter a job title.", ar: "أدخل عنوان الوظيفة.", tr: "Bir ilan başlığı girin." },
  appsFor: { de: "Bewerbungen: {title}", en: "Applications: {title}", ar: "الطلبات: {title}", tr: "Başvurular: {title}" },
  appsPick: { de: "Wählen Sie oben eine Stelle, um ihre Bewerbungen zu sehen.", en: "Choose a job above to see its applications.", ar: "اختر وظيفة من الأعلى لعرض طلباتها.", tr: "Başvurularını görmek için yukarıdan bir ilan seçin." },
  appsNone: { de: "Für diese Stelle sind noch keine Bewerbungen eingegangen.", en: "No applications for this job yet.", ar: "لا توجد طلبات لهذه الوظيفة بعد.", tr: "Bu ilan için henüz başvuru yok." },
  appsLoadFailed: { de: "Die Bewerbungen konnten nicht geladen werden.", en: "The applications could not be loaded.", ar: "تعذّر تحميل الطلبات.", tr: "Başvurular yüklenemedi." },
  isNew: { de: "Neu", en: "New", ar: "جديد", tr: "Yeni" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  email: { de: "E-Mail", en: "Email", ar: "البريد", tr: "E-posta" },
  address: { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  message: { de: "Nachricht", en: "Message", ar: "الرسالة", tr: "Mesaj" },
  lang: { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },
  files: { de: "Unterlagen", en: "Documents", ar: "المستندات", tr: "Belgeler" },
  cv: { de: "Lebenslauf", en: "CV", ar: "السيرة الذاتية", tr: "Özgeçmiş" },
  attachment: { de: "Anlage", en: "Attachment", ar: "مرفق", tr: "Ek" },
  download: { de: "Herunterladen", en: "Download", ar: "تنزيل", tr: "İndir" },
  dlFailed: { de: "Die Datei konnte nicht heruntergeladen werden.", en: "The file could not be downloaded.", ar: "تعذّر تنزيل الملف.", tr: "Dosya indirilemedi." },
  deletedJobs: { de: "Gelöschte Stellen mit Bewerbungen", en: "Deleted jobs with applications", ar: "وظائف محذوفة لها طلبات", tr: "Başvurusu olan silinmiş ilanlar" },
  showApps: { de: "Bewerbungen", en: "Applications", ar: "الطلبات", tr: "Başvurular" },
});

type Tx = TextFn<typeof TEXT>;
type EmploymentType = "full_time" | "part_time" | "mini_job";

interface Job {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  tasks: string;
  requirements: string;
  offer: string;
  location: string;
  employmentType: EmploymentType;
  isActive: boolean;
  applications: number;
  unread: number;
}

interface Application {
  id: string;
  jobTitle: string;
  firstName: string;
  lastName: string;
  address: string | null;
  phone: string;
  email: string;
  message: string | null;
  locale: string;
  readAt: string | null;
  createdAt: string;
  files: { index: number; kind: "cv" | "attachment"; name: string; bytes: number }[];
}

type Draft = Pick<Job, "title" | "summary" | "description" | "tasks" | "requirements" | "offer" | "location" | "employmentType" | "isActive">;

const EMPTY: Draft = { title: "", summary: "", description: "", tasks: "", requirements: "", offer: "", location: "", employmentType: "full_time", isActive: true };
const TYPES: EmploymentType[] = ["full_time", "part_time", "mini_job"];

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function JobsAdminPage() {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const tx = useText(TEXT);
  const toast = useToast();
  const client = useQueryClient();

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null);
  const [openApp, setOpenApp] = useState<string | null>(null);

  const jobs = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => sdk.http.get<{ items: Job[]; deleted: { id: string; title: string; total: number }[] }>("/api/jobs/admin"),
  });

  // The notification mail links to ?job=…&application=….
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const job = params.get("job");
    if (job) setSelected({ id: job, title: "" });
    const app = params.get("application");
    if (app) setOpenApp(app);
  }, []);

  // Fill in the chosen posting's title once the list has loaded.
  useEffect(() => {
    if (!selected || selected.title || !jobs.data) return;
    const found = jobs.data.items.find((job) => job.id === selected.id) ?? jobs.data.deleted.find((job) => job.id === selected.id);
    if (found) setSelected({ id: found.id, title: found.title });
  }, [jobs.data, selected]);

  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "jobs"] });

  const save = async () => {
    if (!editing) return;
    if (!editing.draft.title.trim()) return toast(tx("titleMissing"));
    setBusy(true);
    try {
      if (editing.id) await sdk.http.patch(`/api/jobs/admin/${editing.id}`, editing.draft);
      else await sdk.http.post("/api/jobs/admin", editing.draft);
      setEditing(null);
      toast(tx("saved"));
      await refresh();
    } catch {
      toast(tx("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (job: Job) => {
    try {
      await sdk.http.patch(`/api/jobs/admin/${job.id}`, { isActive: !job.isActive });
      await refresh();
    } catch {
      toast(tx("saveFailed"));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await sdk.http.delete(`/api/jobs/admin/${deleting.id}`);
      setDeleting(null);
      toast(tx("deleted"));
      await refresh();
    } catch {
      toast(tx("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const items = jobs.data?.items ?? [];

  return (
    <AdminShell view="jobs">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="a-page-head">
          <div>
            <h1>{tx("title")}</h1>
            <p>{tx("sub")}</p>
          </div>
          <button type="button" className="a-btn" onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}>
            + {tx("add")}
          </button>
        </div>

        {jobs.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div className="a-card is-flush">
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>{tx("colJob")}</th>
                  <th>{tx("colPlace")}</th>
                  <th>{tx("colType")}</th>
                  <th>{tx("colActive")}</th>
                  <th>{tx("colApps")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.isLoading
                  ? [0, 1, 2].map((i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="a-skel" style={{ height: 22, borderRadius: 6 }} />
                        </td>
                      </tr>
                    ))
                  : items.map((job) => (
                      <tr key={job.id} style={selected?.id === job.id ? { background: "#fbfbf8" } : undefined}>
                        <td style={{ minWidth: 220 }}>
                          <b dir="auto">{job.title}</b>
                          <small dir="auto">{job.summary}</small>
                        </td>
                        <td>{job.location || "—"}</td>
                        <td>{tx(job.employmentType)}</td>
                        <td>
                          <button type="button" role="switch" aria-checked={job.isActive} aria-label={tx("colActive")} className="a-switch is-green" onClick={() => void toggle(job)} />
                        </td>
                        <td>
                          <button type="button" className="a-link-btn" onClick={() => setSelected({ id: job.id, title: job.title })}>
                            {job.applications}
                            {job.unread ? <span className="a-pill is-new">{tx("newN", { n: job.unread })}</span> : null}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button type="button" className="a-link-btn" onClick={() => setSelected({ id: job.id, title: job.title })}>
                              {tx("showApps")}
                            </button>
                            {job.isActive ? (
                              <a className="a-link-btn" href={`/${locale}/jobs/${job.slug}`} target="_blank" rel="noreferrer">
                                {tx("view")}
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="a-link-btn"
                              onClick={() =>
                                setEditing({
                                  id: job.id,
                                  draft: {
                                    title: job.title,
                                    summary: job.summary,
                                    description: job.description,
                                    tasks: job.tasks,
                                    requirements: job.requirements,
                                    offer: job.offer,
                                    location: job.location,
                                    employmentType: job.employmentType,
                                    isActive: job.isActive,
                                  },
                                })
                              }
                            >
                              {tx("edit")}
                            </button>
                            <button type="button" className="a-link-btn" style={{ color: "#7a1020" }} onClick={() => setDeleting(job)}>
                              {tx("del")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!jobs.isLoading && !items.length ? <p className="a-empty" style={{ padding: 22 }}>{tx("none")}</p> : null}
        </div>

        {jobs.data?.deleted.length ? (
          <div className="a-card">
            <div className="a-card-head">
              <h2>{tx("deletedJobs")}</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {jobs.data.deleted.map((job) => (
                <button key={job.id} type="button" className="a-btn is-ghost" onClick={() => setSelected({ id: job.id, title: job.title })}>
                  {job.title} · {job.total}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Applications selected={selected} openApp={openApp} setOpenApp={setOpenApp} tx={tx} onRead={refresh} />
      </section>

      {editing ? (
        <JobEditor
          key={editing.id ?? "new"}
          editing={editing}
          busy={busy}
          tx={tx}
          onChange={(draft) => setEditing({ ...editing, draft })}
          onCancel={() => setEditing(null)}
          onSave={() => void save()}
        />
      ) : null}

      {deleting ? (
        <div className="a-modal-bg" role="presentation" onClick={(event) => event.target === event.currentTarget && setDeleting(null)}>
          <div className="a-modal" role="dialog" aria-modal="true" aria-label={tx("del")}>
            <h2>{tx("del")}</h2>
            <p style={{ fontSize: 13.5, color: "#4a514d" }}>{tx("delAsk", { title: deleting.title })}</p>
            <div className="a-modal-foot">
              <button type="button" className="a-btn is-ghost" onClick={() => setDeleting(null)}>
                {tx("cancel")}
              </button>
              <button type="button" className="a-btn" disabled={busy} onClick={() => void remove()}>
                {tx("del")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function JobEditor({
  editing,
  busy,
  tx,
  onChange,
  onCancel,
  onSave,
}: {
  editing: { id: string | null; draft: Draft };
  busy: boolean;
  tx: Tx;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { draft } = editing;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const linkPrompt = () => window.prompt(tx("linkAsk"), "https://");
  const two: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 };

  return (
    <div className="a-modal-bg" role="presentation">
      <div className="a-modal" role="dialog" aria-modal="true" aria-label={editing.id ? tx("editTitle") : tx("newTitle")} style={{ width: "min(860px, 100%)" }}>
        <h2>{editing.id ? tx("editTitle") : tx("newTitle")}</h2>

        <label className="a-field">
          <span>{tx("fTitle")} *</span>
          <input className="a-input" dir="auto" value={draft.title} placeholder={tx("fTitlePh")} maxLength={160} onChange={(event) => set("title", event.target.value)} />
        </label>
        <label className="a-field">
          <span>{tx("fSummary")}</span>
          <input className="a-input" dir="auto" value={draft.summary} maxLength={400} onChange={(event) => set("summary", event.target.value)} />
          <small>{tx("fSummaryHint")}</small>
        </label>
        <div style={two}>
          <label className="a-field">
            <span>{tx("fPlace")}</span>
            <input className="a-input" dir="auto" value={draft.location} maxLength={120} onChange={(event) => set("location", event.target.value)} />
          </label>
          <label className="a-field">
            <span>{tx("fType")}</span>
            <select className="a-input" value={draft.employmentType} onChange={(event) => set("employmentType", event.target.value as EmploymentType)}>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {tx(type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <button type="button" role="switch" aria-checked={draft.isActive} aria-label={tx("fActive")} className="a-switch is-green" onClick={() => set("isActive", !draft.isActive)} />
          {tx("fActive")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6, borderTop: "1px solid #eceee9" }}>
          <b style={{ fontSize: 14, fontWeight: 650 }}>{tx("fDetails")}</b>
          <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("fDetailsHint")}</small>
        </div>
        <RichTextEditor label={tx("sDescription")} value={draft.description} onChange={(html) => set("description", html)} linkPrompt={linkPrompt} />
        <RichTextEditor label={tx("sTasks")} value={draft.tasks} onChange={(html) => set("tasks", html)} linkPrompt={linkPrompt} />
        <RichTextEditor label={tx("sRequirements")} value={draft.requirements} onChange={(html) => set("requirements", html)} linkPrompt={linkPrompt} />
        <RichTextEditor label={tx("sOffer")} value={draft.offer} onChange={(html) => set("offer", html)} linkPrompt={linkPrompt} />

        <div className="a-modal-foot">
          <button type="button" className="a-btn is-ghost" onClick={onCancel}>
            {tx("cancel")}
          </button>
          <button type="button" className="a-btn" disabled={busy} onClick={onSave}>
            {busy ? tx("saving") : tx("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Applications({
  selected,
  openApp,
  setOpenApp,
  tx,
  onRead,
}: {
  selected: { id: string; title: string } | null;
  openApp: string | null;
  setOpenApp: (id: string | null) => void;
  tx: Tx;
  onRead: () => void;
}) {
  const { sdk } = useApi();
  const { locale } = useI18n();
  const toast = useToast();
  const client = useQueryClient();
  const loc = dateTag(locale);

  const apps = useQuery({
    queryKey: ["admin", "jobs", selected?.id, "applications"],
    queryFn: () => sdk.http.get<{ items: Application[] }>(`/api/jobs/admin/${selected!.id}/applications`),
    enabled: Boolean(selected),
  });

  // Opening an application marks it read.
  useEffect(() => {
    const app = apps.data?.items.find((a) => a.id === openApp);
    if (!app || app.readAt) return;
    void sdk.http
      .post(`/api/jobs/admin/applications/${app.id}/read`)
      .then(() => {
        void client.invalidateQueries({ queryKey: ["admin", "jobs", selected?.id, "applications"] });
        onRead();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openApp, apps.data]);

  const download = async (app: Application, index: number, name: string) => {
    try {
      const path = `/api/jobs/admin/applications/${app.id}/files/${index}`;
      const get = (token: string) => fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
      let response = await get(sdk.http.getAccessToken());
      if (response.status === 401) {
        const renewed = await sdk.http.renewAccessToken();
        if (renewed) response = await get(renewed);
      }
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 500);
    } catch {
      toast(tx("dlFailed"));
    }
  };

  return (
    <div className="a-card" id="applications">
      <div className="a-card-head">
        <h2>{selected ? tx("appsFor", { title: selected.title || "…" }) : tx("colApps")}</h2>
      </div>
      {!selected ? (
        <p className="a-empty">{tx("appsPick")}</p>
      ) : apps.isError ? (
        <div className="a-note is-error">{tx("appsLoadFailed")}</div>
      ) : apps.isLoading ? (
        <div className="a-skel" style={{ height: 60, borderRadius: 8 }} />
      ) : !apps.data?.items.length ? (
        <p className="a-empty">{tx("appsNone")}</p>
      ) : (
        apps.data.items.map((app) => {
          const open = openApp === app.id;
          return (
            <div key={app.id}>
              <button type="button" className="a-row-btn" aria-expanded={open} onClick={() => setOpenApp(open ? null : app.id)}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }} dir="auto">
                    {app.firstName} {app.lastName}
                  </b>
                  <small style={{ fontSize: 11.5, color: "#737870" }}>
                    {new Date(app.createdAt).toLocaleString(loc, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {app.email}
                  </small>
                </span>
                {!app.readAt ? <span className="a-pill is-new">{tx("isNew")}</span> : null}
                <span className="a-pill is-grey">{app.files.length} ⧉</span>
              </button>
              {open ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 2px 18px", fontSize: 13 }}>
                  <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px" }}>
                    <dt style={{ color: "#737870" }}>{tx("phone")}</dt>
                    <dd dir="ltr" style={{ textAlign: "start" }}>
                      <a href={`tel:${app.phone}`}>{app.phone}</a>
                    </dd>
                    <dt style={{ color: "#737870" }}>{tx("email")}</dt>
                    <dd dir="ltr" style={{ textAlign: "start" }}>
                      <a href={`mailto:${app.email}`}>{app.email}</a>
                    </dd>
                    {app.address ? (
                      <>
                        <dt style={{ color: "#737870" }}>{tx("address")}</dt>
                        <dd dir="auto">{app.address}</dd>
                      </>
                    ) : null}
                    <dt style={{ color: "#737870" }}>{tx("lang")}</dt>
                    <dd>{app.locale.toUpperCase()}</dd>
                  </dl>
                  {app.message ? (
                    <div>
                      <small style={{ color: "#737870", fontSize: 11.5, fontWeight: 600 }}>{tx("message")}</small>
                      <p dir="auto" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.55, marginTop: 4 }}>
                        {app.message}
                      </p>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <small style={{ color: "#737870", fontSize: 11.5, fontWeight: 600 }}>{tx("files")}</small>
                    {app.files.map((file) => (
                      <div key={file.index} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid #e3e5de", borderRadius: 8 }}>
                        <span className={`a-pill ${file.kind === "cv" ? "is-red" : "is-grey"}`}>{tx(file.kind === "cv" ? "cv" : "attachment")}</span>
                        <span dir="auto" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.name}
                        </span>
                        <small style={{ color: "#737870" }}>{sizeText(file.bytes)}</small>
                        <button type="button" className="a-link-btn" onClick={() => void download(app, file.index, file.name)}>
                          {tx("download")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
