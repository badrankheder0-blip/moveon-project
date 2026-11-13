"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties } from "react";

import { AdminShell, useToast } from "@/app/components/admin/AdminShell";
import { defineText, useText, type TextFn } from "@/lib/admin/text";
import { ApiError, useApi } from "@/lib/api";

import styles from "./page.module.css";

/**
 * Employees: the crew, as the admin prototype keeps it — the head count by
 * role, the crew page card, and one row per person with their team, phone,
 * licence, availability and their team's hours this week. Edit opens the row:
 * changes save as they are made (no publish step — this is operational data),
 * text fields when you leave them.
 *
 * A PIN is the person's sign-in to the crew page. Only its hash is stored, so
 * a PIN is shown once — when the person is added or a new one is set — and a
 * forgotten one is replaced, never looked up.
 */

const TEXT = defineText({
  title: { de: "Mitarbeiter", en: "Employees", ar: "الموظفون", tr: "Çalışanlar" },
  sub: {
    de: "Ihr Team: Rollen, Teams, Verfügbarkeit und Stunden. Jede Person meldet sich mit ihrer PIN auf der Crew-Seite an.",
    en: "Your crew: roles, teams, availability and hours. Each person signs in to the crew page with their PIN.",
    ar: "فريق عملك: الأدوار والفرق والتوفر وساعات العمل. كل شخص يدخل صفحة العمال برمز PIN خاص به.",
    tr: "Ekibiniz: roller, ekipler, müsaitlik ve saatler. Herkes ekip sayfasına kendi PIN'iyle giriş yapar.",
  },
  add: { de: "Mitarbeiter hinzufügen", en: "Add employee", ar: "إضافة موظف", tr: "Çalışan ekle" },
  total: { de: "Mitarbeiter", en: "Employees", ar: "الموظفون", tr: "Çalışanlar" },
  name: { de: "Name", en: "Name", ar: "الاسم", tr: "Ad" },
  role: { de: "Rolle", en: "Role", ar: "الدور", tr: "Rol" },
  team: { de: "Team", en: "Team", ar: "الفريق", tr: "Ekip" },
  phone: { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  lic: { de: "Führerschein", en: "Licence", ar: "الرخصة", tr: "Ehliyet" },
  status: { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  hours: { de: "Diese Woche", en: "This week", ar: "هذا الأسبوع", tr: "Bu hafta" },
  pin: { de: "PIN", en: "PIN", ar: "PIN", tr: "PIN" },
  days: { de: "Arbeitet am", en: "Works on", ar: "أيام العمل", tr: "Çalıştığı günler" },
  save: { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  remove: { de: "Entfernen", en: "Remove", ar: "حذف", tr: "Kaldır" },
  delAsk: { de: "Diesen Mitarbeiter entfernen?", en: "Remove this employee?", ar: "حذف هذا الموظف؟", tr: "Bu çalışan kaldırılsın mı?" },
  edit: { de: "Bearbeiten", en: "Edit", ar: "تعديل", tr: "Düzenle" },
  none: { de: "Noch keine Mitarbeiter.", en: "No employees yet.", ar: "لا يوجد موظفون بعد.", tr: "Henüz çalışan yok." },
  role_team_lead: { de: "Teamleiter", en: "Team lead", ar: "قائد فريق", tr: "Ekip lideri" },
  role_driver: { de: "Fahrer", en: "Driver", ar: "سائق", tr: "Şoför" },
  role_mover: { de: "Umzugshelfer", en: "Mover", ar: "عامل نقل", tr: "Taşıma elemanı" },
  role_cleaner: { de: "Reinigungskraft", en: "Cleaner", ar: "عامل تنظيف", tr: "Temizlik görevlisi" },
  es_available: { de: "Verfügbar", en: "Available", ar: "متاح", tr: "Müsait" },
  es_holiday: { de: "Im Urlaub", en: "On holiday", ar: "في إجازة", tr: "İzinde" },
  es_sick: { de: "Krank", en: "Sick", ar: "مريض", tr: "Hasta" },
  app: { de: "CREW-SEITE", en: "CREW PAGE", ar: "صفحة العمال", tr: "EKİP SAYFASI" },
  appSub: {
    de: "Die Teams öffnen diese Seite auf dem Handy: heutige Einsätze, Checkliste, Fotos, die Unterschrift des Kunden und Schadensmeldungen.",
    en: "Crews open this page on their phone: today’s jobs, a checklist, photos, the customer’s signature and damage reports.",
    ar: "يفتح العمال هذه الصفحة على موبايلهم: مهام اليوم، قائمة الخطوات، الصور، توقيع الزبون والإبلاغ عن الأضرار.",
    tr: "Ekipler bu sayfayı telefonlarında açar: bugünün işleri, kontrol listesi, fotoğraflar, müşterinin imzası ve hasar bildirimleri.",
  },
  openApp: { de: "Crew-Seite öffnen", en: "Open crew page", ar: "فتح صفحة العمال", tr: "Ekip sayfasını aç" },
  daysShort: { de: "Mo,Di,Mi,Do,Fr,Sa,So", en: "Mo,Tu,We,Th,Fr,Sa,Su", ar: "ن,ث,ر,خ,ج,س,ح", tr: "Pt,Sa,Ça,Pe,Cu,Ct,Pz" },
  newName: { de: "Neuer Mitarbeiter", en: "New employee", ar: "موظف جديد", tr: "Yeni çalışan" },
  pinNew: { de: "Neue PIN", en: "New PIN", ar: "PIN جديد", tr: "Yeni PIN" },
  pinShown: { de: "Wird nur jetzt angezeigt.", en: "Shown only now.", ar: "يظهر الآن فقط.", tr: "Yalnızca şimdi gösteriliyor." },
  pinSaved: { de: "PIN gespeichert.", en: "PIN saved.", ar: "تم حفظ رمز PIN.", tr: "PIN kaydedildi." },
  pinBad: { de: "Eine PIN hat 4 bis 6 Ziffern.", en: "A PIN is 4 to 6 digits.", ar: "رمز PIN من 4 إلى 6 أرقام.", tr: "PIN 4 ila 6 haneden oluşur." },
  pinTaken: {
    de: "Diese PIN nutzt bereits jemand anderes.",
    en: "Someone else already uses this PIN.",
    ar: "هذا الرمز مستخدم من شخص آخر.",
    tr: "Bu PIN'i başka biri kullanıyor.",
  },
  saveFailed: {
    de: "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.",
    en: "Saving failed. Please try again.",
    ar: "تعذّر الحفظ. حاول مرة أخرى.",
    tr: "Kaydedilemedi. Lütfen tekrar deneyin.",
  },
  loadFailed: {
    de: "Die Mitarbeiter konnten nicht geladen werden.",
    en: "The employees could not be loaded.",
    ar: "تعذّر تحميل الموظفين.",
    tr: "Çalışanlar yüklenemedi.",
  },
});

const ROLES = ["team_lead", "driver", "mover", "cleaner"] as const;
const STATUSES = ["available", "holiday", "sick"] as const;
type EmployeeRole = (typeof ROLES)[number];
type EmployeeStatus = (typeof STATUSES)[number];

/** The prototype's role and status pill colours: [background, text]. */
const ROLE_PILL: Record<EmployeeRole, [string, string]> = {
  team_lead: ["#fff6f6", "#b7122b"],
  driver: ["#eef3fb", "#2d5a8c"],
  mover: ["#f5f5f0", "#4a514d"],
  cleaner: ["#edf5ed", "#3f705a"],
};
const STATUS_PILL: Record<EmployeeStatus, [string, string]> = {
  available: ["#edf5ed", "#3f705a"],
  holiday: ["#fbf4e4", "#5c4a00"],
  sick: ["#fff1f3", "#b7122b"],
};

/** The day chips run Monday to Sunday; the stored days use 0 = Sunday. */
const CHIP_DAYS = [1, 2, 3, 4, 5, 6, 0];

/** Where crews sign in. The page itself is still to be built. */
const CREW_PAGE = "/crew";

interface Employee {
  id: string;
  fullName: string;
  role: string;
  teamId: string | null;
  phone: string | null;
  email: string | null;
  licence: string | null;
  status: string;
  workDays: number[];
  hoursWeek: number;
  hasPin: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  area: string | null;
  isActive: boolean;
}

interface CrewData {
  employees: Employee[];
  teams: Team[];
}

type EmployeePatch = Partial<Pick<Employee, "fullName" | "role" | "teamId" | "phone" | "licence" | "status" | "workDays">>;

const QUERY_KEY = ["admin", "crew", "employees"];

const asRole = (value: string): EmployeeRole => ((ROLES as readonly string[]).includes(value) ? (value as EmployeeRole) : "mover");
const asStatus = (value: string): EmployeeStatus => ((STATUSES as readonly string[]).includes(value) ? (value as EmployeeStatus) : "available");
const teamLabel = (team: Team) => (team.area ? `${team.name} · ${team.area}` : team.name);

export default function EmployeesPage() {
  const { sdk } = useApi();
  const tx = useText(TEXT);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  /** PINs made in this visit, shown until the page is left: the only time they can be. */
  const [freshPins, setFreshPins] = useState<Record<string, string>>({});

  const data = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.http.get<CrewData>("/api/crew/employees"),
  });

  const employees = data.data?.employees ?? [];
  const teams = data.data?.teams ?? [];

  const replace = (employee: Employee) =>
    queryClient.setQueryData<CrewData>(QUERY_KEY, (current) =>
      current ? { ...current, employees: current.employees.map((e) => (e.id === employee.id ? employee : e)) } : current,
    );

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EmployeePatch }) =>
      sdk.http.patch<{ employee: Employee }>(`/api/crew/employees/${id}`, patch),
    // The change shows at once, as the prototype's live edits do; the server's
    // answer (with the team's hours) replaces it when it arrives.
    onMutate: ({ id, patch }) =>
      queryClient.setQueryData<CrewData>(QUERY_KEY, (current) =>
        current ? { ...current, employees: current.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : current,
      ),
    onSuccess: ({ employee }) => replace(employee),
    onError: () => {
      toast(tx("saveFailed"));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const add = useMutation({
    mutationFn: () => sdk.http.post<{ employee: Employee; pin: string }>("/api/crew/employees", { fullName: tx("newName") }),
    onSuccess: ({ employee, pin }) => {
      queryClient.setQueryData<CrewData>(QUERY_KEY, (current) => (current ? { ...current, employees: [...current.employees, employee] } : current));
      setFreshPins((pins) => ({ ...pins, [employee.id]: pin }));
      setEditing(employee.id);
    },
    onError: () => toast(tx("saveFailed")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sdk.http.delete(`/api/crew/employees/${id}`),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<CrewData>(QUERY_KEY, (current) => (current ? { ...current, employees: current.employees.filter((e) => e.id !== id) } : current));
      setEditing(null);
    },
    onError: () => toast(tx("saveFailed")),
  });

  const setPin = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin?: string }) => sdk.http.post<{ pin: string }>(`/api/crew/employees/${id}/pin`, pin ? { pin } : {}),
    onSuccess: ({ pin }, { id }) => {
      setFreshPins((pins) => ({ ...pins, [id]: pin }));
      queryClient.setQueryData<CrewData>(QUERY_KEY, (current) =>
        current ? { ...current, employees: current.employees.map((e) => (e.id === id ? { ...e, hasPin: true } : e)) } : current,
      );
      toast(tx("pinSaved"));
    },
    onError: (err) => toast(err instanceof ApiError && err.status === 409 ? tx("pinTaken") : tx("saveFailed")),
  });

  const counts = ROLES.map((role) => ({ role, n: employees.filter((e) => asRole(e.role) === role).length }));
  const card: CSSProperties = { background: "#ffffff", border: "1px solid #e3e5de", borderRadius: 10, boxShadow: "0 12px 36px #202a2308" };

  return (
    <AdminShell view="staff">
      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "var(--a-ls-h1)", lineHeight: 1.2 }}>{tx("title")}</h1>
            <p style={{ color: "#737870", fontSize: 13, marginTop: 6, textWrap: "pretty" } as CSSProperties}>{tx("sub")}</p>
          </div>
          <button
            type="button"
            className={styles.red}
            disabled={add.isPending}
            onClick={() => add.mutate()}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "none", whiteSpace: "nowrap", minHeight: 40, padding: "0 16px", border: "1px solid #d71635", borderRadius: 6, background: "#d71635", color: "#ffffff", fontSize: 12, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {tx("add")}
          </button>
        </div>

        {data.isError ? <div className="a-note is-error">{tx("loadFailed")}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 12 }}>
          <div style={{ ...card, padding: "16px 18px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingInlineEnd: 16, borderInlineEnd: "1px solid #eef0ea" }}>
              <b style={{ fontSize: 26, fontWeight: 650 }}>{employees.length}</b>
              <small style={{ fontSize: 11.5, color: "#737870" }}>{tx("total")}</small>
            </div>
            {counts.map((c) => (
              <div key={c.role} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 17, fontWeight: 650 }}>{c.n}</b>
                <small style={{ fontSize: 11.5, color: "#737870" }}>{tx(`role_${c.role}`)}</small>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: "16px 18px", display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ width: 42, height: 42, borderRadius: 10, background: "#fff6f6", color: "#d71635", display: "grid", placeItems: "center", flex: "none" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M11 18h2" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}>{tx("app")}</b>
              <small style={{ fontSize: 12, color: "#4a514d", lineHeight: 1.45, textWrap: "pretty" } as CSSProperties}>{tx("appSub")}</small>
            </div>
            <a
              href={CREW_PAGE}
              target="_blank"
              rel="noopener"
              className={styles.tint}
              style={{ flex: "none", display: "inline-flex", alignItems: "center", minHeight: 36, padding: "0 13px", border: "1px solid #d71635", borderRadius: 6, color: "#b7122b", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              {tx("openApp")}
            </a>
          </div>
        </div>

        <div style={{ ...card, overflow: "hidden" }}>
          <div
            className={styles.head}
            style={{ gap: 14, padding: "11px 20px", background: "#fafaf7", borderBottom: "1px solid #e3e5de", fontSize: 10.5, fontWeight: 650, letterSpacing: "var(--a-ls-eye)", color: "#737870" }}
          >
            <span style={{ flex: "1 1 220px" }}>{tx("name")}</span>
            <span style={{ flex: "0 0 160px" }}>{tx("team")}</span>
            <span style={{ flex: "0 0 150px" }}>{tx("phone")}</span>
            <span style={{ flex: "0 0 60px" }}>{tx("lic")}</span>
            <span style={{ flex: "0 0 100px" }}>{tx("status")}</span>
            <span style={{ flex: "0 0 80px" }}>{tx("hours")}</span>
            <span style={{ flex: "0 0 70px" }} />
          </div>

          {data.isPending
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #eef0ea" }}>
                  <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f3f5", flex: "none" }} />
                  <div className="a-skel" style={{ flex: 1, maxWidth: 220 }} />
                </div>
              ))
            : employees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  teams={teams}
                  open={editing === employee.id}
                  freshPin={freshPins[employee.id]}
                  tx={tx}
                  onToggle={() => setEditing((current) => (current === employee.id ? null : employee.id))}
                  onChange={(patch) => update.mutate({ id: employee.id, patch })}
                  onPin={(pin) => setPin.mutate({ id: employee.id, ...(pin ? { pin } : {}) })}
                  onRemove={() => {
                    if (window.confirm(tx("delAsk"))) remove.mutate(employee.id);
                  }}
                />
              ))}

          {!data.isPending && employees.length === 0 ? (
            <p style={{ padding: "40px 20px", textAlign: "center", color: "#737870", fontSize: 13 }}>{tx("none")}</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}

function EmployeeRow({
  employee,
  teams,
  open,
  freshPin,
  tx,
  onToggle,
  onChange,
  onPin,
  onRemove,
}: {
  employee: Employee;
  teams: Team[];
  open: boolean;
  freshPin: string | undefined;
  tx: TextFn<typeof TEXT>;
  onToggle: () => void;
  onChange: (patch: EmployeePatch) => void;
  onPin: (pin?: string) => void;
  onRemove: () => void;
}) {
  const role = asRole(employee.role);
  const status = asStatus(employee.status);
  const team = teams.find((t) => t.id === employee.teamId);
  const [rolePill, statusPill] = [ROLE_PILL[role], STATUS_PILL[status]];
  const dayLabels = tx("daysShort").split(",");

  // Text fields are edited locally and saved when left, so typing a name is
  // one save rather than one per keystroke.
  const [name, setName] = useState(employee.fullName);
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [licence, setLicence] = useState(employee.licence ?? "");
  const [pin, setPinText] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    setName(employee.fullName);
    setPhone(employee.phone ?? "");
    setLicence(employee.licence ?? "");
  }, [employee.fullName, employee.phone, employee.licence]);

  useEffect(() => {
    if (!open) {
      setPinText("");
      setPinError(false);
    }
  }, [open]);

  const commitText = () => {
    const patch: EmployeePatch = {};
    if (name.trim() && name.trim() !== employee.fullName) patch.fullName = name.trim();
    if (phone.trim() !== (employee.phone ?? "")) patch.phone = phone.trim() || null;
    if (licence.trim() !== (employee.licence ?? "")) patch.licence = licence.trim() || null;
    if (!name.trim()) setName(employee.fullName);
    if (Object.keys(patch).length > 0) onChange(patch);
  };

  const commitPin = () => {
    if (!pin) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setPinError(true);
      return;
    }
    onPin(pin);
    setPinText("");
  };

  const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "#737870" };
  const control: CSSProperties = { height: 38, padding: "0 10px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", fontSize: 13, color: "#252b28" };
  const select: CSSProperties = { ...control, padding: "0 8px" };
  const hours = `${Number.isInteger(employee.hoursWeek) ? employee.hoursWeek : employee.hoursWeek.toFixed(1)} h`;

  return (
    <div style={{ borderBottom: "1px solid #eef0ea" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", padding: "12px 20px" }}>
        <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f3f5", color: "#252b28", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flex: "none" }}>
            {(employee.fullName || "?").trim().charAt(0).toUpperCase()}
          </span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <b style={{ fontSize: 13.5, fontWeight: 600 }}>
              <bdi>{employee.fullName || "—"}</bdi>
            </b>
            <span style={{ alignSelf: "flex-start", padding: "2px 8px", borderRadius: 999, background: rolePill[0], color: rolePill[1], fontSize: 10.5, fontWeight: 650 }}>{tx(`role_${role}`)}</span>
          </span>
        </span>
        <span style={{ flex: "0 0 160px", fontSize: 12.5, color: "#4a514d" }}>
          <bdi>{team ? teamLabel(team) : "—"}</bdi>
        </span>
        <span dir="ltr" style={{ flex: "0 0 150px", fontSize: 12.5, color: "#4a514d" }}>
          {employee.phone || "—"}
        </span>
        <span style={{ flex: "0 0 60px", fontSize: 12.5, fontWeight: 600 }}>
          <bdi>{employee.licence || "—"}</bdi>
        </span>
        <span style={{ flex: "0 0 100px" }}>
          <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 999, background: statusPill[0], color: statusPill[1], fontSize: 11, fontWeight: 650 }}>{tx(`es_${status}`)}</span>
        </span>
        <span style={{ flex: "0 0 80px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          <bdi>{hours}</bdi>
        </span>
        <span style={{ flex: "0 0 70px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            style={{ minHeight: 32, padding: "0 11px", border: "1px solid #cfd3cb", borderRadius: 6, background: "#ffffff", color: "#252b28", fontSize: 11.5, fontWeight: 600 }}
          >
            {tx("edit")}
          </button>
        </span>
      </div>

      {open ? (
        <div style={{ padding: "4px 20px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, background: "#fafaf7", borderTop: "1px solid #eef0ea" }}>
          <label style={{ ...field, paddingTop: 12 }}>
            {tx("name")}
            <input value={name} onChange={(event) => setName(event.target.value)} onBlur={commitText} style={control} />
          </label>
          <label style={{ ...field, paddingTop: 12 }}>
            {tx("role")}
            <select value={role} onChange={(event) => onChange({ role: event.target.value })} style={select}>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {tx(`role_${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ ...field, paddingTop: 12 }}>
            {tx("team")}
            <select value={employee.teamId ?? ""} onChange={(event) => onChange({ teamId: event.target.value || null })} style={select}>
              <option value="">—</option>
              {teams
                .filter((t) => t.isActive || t.id === employee.teamId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {teamLabel(t)}
                  </option>
                ))}
            </select>
          </label>
          <label style={{ ...field, paddingTop: 12 }}>
            {tx("status")}
            <select value={status} onChange={(event) => onChange({ status: event.target.value })} style={select}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {tx(`es_${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={field}>
            {tx("phone")}
            <input dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={commitText} style={control} />
          </label>
          <label style={field}>
            {tx("lic")}
            <input dir="ltr" value={licence} onChange={(event) => setLicence(event.target.value)} onBlur={commitText} placeholder="B / C1 / CE" style={control} />
          </label>
          <div style={field}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <label htmlFor={`pin-${employee.id}`}>{tx("pin")}</label>
              <button type="button" onClick={() => onPin()} style={{ border: 0, background: "transparent", padding: 0, color: "#d71635", fontSize: 11, fontWeight: 600 }}>
                {tx("pinNew")}
              </button>
            </span>
            <input
              id={`pin-${employee.id}`}
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              placeholder={freshPin ?? (employee.hasPin ? "••••••" : "")}
              aria-invalid={pinError}
              onChange={(event) => {
                setPinError(false);
                setPinText(event.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              onBlur={commitPin}
              style={{ ...control, letterSpacing: 2, borderColor: pinError ? "#d71635" : "#cfd3cb" }}
            />
            {pinError ? (
              <small style={{ fontSize: 11, color: "#d71635" }}>{tx("pinBad")}</small>
            ) : freshPin && !pin ? (
              <small style={{ fontSize: 11, color: "#3f705a", fontWeight: 600 }}>
                <bdi dir="ltr" style={{ fontFamily: "ui-monospace,Menlo,monospace", letterSpacing: 1.5 }}>
                  {freshPin}
                </bdi>{" "}
                · {tx("pinShown")}
              </small>
            ) : null}
          </div>
          <div style={field}>
            {tx("days")}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {CHIP_DAYS.map((day, i) => {
                const on = employee.workDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ workDays: on ? employee.workDays.filter((d) => d !== day) : [...employee.workDays, day].sort((a, b) => a - b) })}
                    style={{ minWidth: 32, height: 32, padding: "0 6px", border: `1px solid ${on ? "#252b28" : "#e3e5de"}`, borderRadius: 6, background: on ? "#252b28" : "#ffffff", color: on ? "#ffffff" : "#92958e", fontSize: 11, fontWeight: 650 }}
                  >
                    {dayLabels[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button
              type="button"
              className={styles.tint}
              onClick={onRemove}
              style={{ minHeight: 36, padding: "0 12px", border: 0, borderRadius: 6, background: "transparent", color: "#b7122b", fontSize: 12, fontWeight: 600 }}
            >
              {tx("remove")}
            </button>
            <button
              type="button"
              onClick={() => {
                commitText();
                commitPin();
                onToggle();
              }}
              style={{ minHeight: 36, padding: "0 16px", border: "1px solid #252b28", borderRadius: 6, background: "#252b28", color: "#ffffff", fontSize: 12, fontWeight: 600 }}
            >
              {tx("save")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
