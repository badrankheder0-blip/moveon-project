import type { StaffRoutePath } from "@/lib/access/staff-routes";

import { defineText } from "./text";

/**
 * The dashboard's sections, grouped as the admin prototype's sidebar groups
 * them. Each names its route (and so, through the shared route table, the
 * capability that opens it), its icon and its label.
 */

export type AdminView =
  | "overview" | "customers" | "users" | "orders" | "quotes" | "inbox" | "calendar" | "map" | "staff"
  | "invoices" | "reports" | "claims" | "reviews" | "messages" | "notify"
  | "services" | "catalog" | "pricing" | "zones" | "discounts"
  | "pages" | "home" | "site" | "faq" | "jobs" | "content"
  | "settings";

export const ADMIN_PATHS: Record<AdminView, StaffRoutePath> = {
  overview: "/admin",
  customers: "/admin/kunden",
  users: "/admin/nutzer",
  orders: "/admin/auftraege",
  quotes: "/admin/angebote",
  inbox: "/admin/posteingang",
  calendar: "/admin/kalender",
  map: "/admin/karte",
  staff: "/admin/mitarbeiter",
  invoices: "/admin/rechnungen",
  reports: "/admin/berichte",
  claims: "/admin/schaeden",
  reviews: "/admin/bewertungen",
  messages: "/admin/kundennachrichten",
  notify: "/admin/benachrichtigungen",
  services: "/admin/leistungen",
  catalog: "/admin/katalog",
  pricing: "/admin/preise",
  zones: "/admin/gebiete",
  discounts: "/admin/rabatte",
  pages: "/admin/inhalte",
  home: "/admin/inhalte/startseite",
  site: "/admin/buchungsseite",
  faq: "/admin/faq",
  jobs: "/admin/stellen",
  content: "/admin/bilder",
  settings: "/admin/einstellungen",
};

/** The prototype's 24px stroke icons, one path each. */
export const ADMIN_ICONS: Record<AdminView | "usermgmt", string> = {
  overview: "M3 3v18h18M7 15l4-4 3 3 6-6M16 8h4v4",
  usermgmt:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19.5 14.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19.5 9V8M19.5 17v-1M22 12.5h-1M18 12.5h-1",
  customers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  orders: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  quotes: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4",
  inbox:
    "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  staff: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  invoices: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h7M9 17h5",
  reports: "M4 20V11M10 20V5M16 20v-6M21 20H3",
  claims: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM12 8v5M12 16h.01",
  reviews: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  messages: "M4 5h16v11H9l-5 4zM8 10h8",
  notify: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  services: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  catalog: "M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4",
  pricing: "M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  zones: "M4 8l8-5 8 5-3 11H7L4 8zM12 11.5h.01",
  discounts: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  pages: "M4 4h16v16H4zM4 9h16M9 9v11M12.5 13h4M12.5 16.5h3",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  site: "M3 4h18v16H3zM3 9h18M6.5 6.5h.01M9.5 6.5h.01M8 13h8M8 16h5",
  faq: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  jobs: "M4 7h16v13H4zM9 7V4h6v3M4 12h16",
  content: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 15l-5-5L5 21",
  settings: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};

/** The sidebar, in order. `usermgmt` is the parent of Customers and Admin users. */
export const ADMIN_GROUPS: { key: "grpOps" | "grpBiz" | "grpCat" | "grpSite" | "grpSys"; items: (AdminView | "usermgmt")[] }[] = [
  { key: "grpOps", items: ["overview", "usermgmt", "orders", "quotes", "inbox", "calendar", "map", "staff"] },
  { key: "grpBiz", items: ["invoices", "reports", "claims", "reviews", "messages", "notify"] },
  { key: "grpCat", items: ["services", "catalog", "pricing", "zones", "discounts"] },
  { key: "grpSite", items: ["pages", "faq", "jobs", "site", "content"] },
  { key: "grpSys", items: ["settings"] },
];

export const NAV_TEXT = defineText({
  grpOps: { de: "BETRIEB", en: "OPERATIONS", ar: "العمليات", tr: "OPERASYON" },
  grpBiz: { de: "GESCHÄFT", en: "BUSINESS", ar: "الأعمال", tr: "İŞLETME" },
  grpCat: { de: "KATALOG", en: "CATALOGUE", ar: "الكتالوج", tr: "KATALOG" },
  grpSite: { de: "WEBSITE", en: "WEBSITE", ar: "الموقع", tr: "WEB SİTESİ" },
  grpSys: { de: "SYSTEM", en: "SYSTEM", ar: "النظام", tr: "SİSTEM" },
  overview: { de: "Übersicht", en: "Overview", ar: "نظرة عامة", tr: "Genel bakış" },
  usermgmt: { de: "Benutzerverwaltung", en: "User management", ar: "إدارة المستخدمين", tr: "Kullanıcı yönetimi" },
  customers: { de: "Kunden", en: "Customers", ar: "الزبائن", tr: "Müşteriler" },
  users: { de: "Admin-Benutzer", en: "Admin users", ar: "مستخدمو الإدارة", tr: "Yönetici kullanıcılar" },
  orders: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  quotes: { de: "Angebote & Besichtigungen", en: "Quotes & visits", ar: "العروض والمعاينات", tr: "Teklifler ve keşifler" },
  inbox: { de: "Website-Posteingang", en: "Website inbox", ar: "صندوق الوارد", tr: "Web sitesi gelen kutusu" },
  calendar: { de: "Kalender", en: "Calendar", ar: "التقويم", tr: "Takvim" },
  map: { de: "Live-Karte", en: "Live map", ar: "الخريطة المباشرة", tr: "Canlı harita" },
  staff: { de: "Mitarbeiter", en: "Employees", ar: "الموظفون", tr: "Çalışanlar" },
  invoices: { de: "Rechnungen", en: "Invoices", ar: "الفواتير", tr: "Faturalar" },
  reports: { de: "Berichte", en: "Reports", ar: "التقارير", tr: "Raporlar" },
  claims: { de: "Schadensfälle", en: "Damage cases", ar: "ملفات الأضرار", tr: "Hasar dosyaları" },
  reviews: { de: "Bewertungen", en: "Reviews", ar: "التقييمات", tr: "Değerlendirmeler" },
  messages: { de: "Kundennachrichten", en: "Customer messages", ar: "رسائل الزبائن", tr: "Müşteri mesajları" },
  notify: { de: "Benachrichtigungen", en: "Notifications", ar: "مركز الإشعارات", tr: "Bildirimler" },
  services: { de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler" },
  catalog: { de: "Katalog", en: "Catalogue", ar: "الكتالوج", tr: "Katalog" },
  pricing: { de: "Preise", en: "Pricing", ar: "الأسعار", tr: "Fiyatlandırma" },
  zones: { de: "Servicegebiete", en: "Service zones", ar: "مناطق الخدمة", tr: "Hizmet bölgeleri" },
  discounts: { de: "Rabattcodes", en: "Discount codes", ar: "أكواد الخصم", tr: "İndirim kodları" },
  pages: { de: "Inhalte bearbeiten", en: "Content editing", ar: "تعديل المحتوى", tr: "İçerik düzenleme" },
  home: { de: "Startseite", en: "Homepage", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
  site: { de: "Buchungsseite", en: "Booking site", ar: "موقع الحجز", tr: "Rezervasyon sitesi" },
  faq: { de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS" },
  jobs: { de: "Stellen & Bewerbungen", en: "Jobs & applications", ar: "الوظائف والطلبات", tr: "İlanlar ve başvurular" },
  content: { de: "Inhalte & Bilder", en: "Content & images", ar: "المحتوى والصور", tr: "İçerik ve görseller" },
  settings: { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },
  brand: { de: "Admin", en: "Admin", ar: "لوحة الإدارة", tr: "Yönetim" },
  searchAll: { de: "Aufträge und Kunden suchen", en: "Search orders and customers", ar: "ابحث في الطلبات والزبائن", tr: "Sipariş ve müşteri ara" },
  roleOwner: { de: "Inhaber", en: "Owner", ar: "المالك", tr: "Sahip" },
  roleAdmin: { de: "Vollzugriff", en: "Full access", ar: "صلاحية كاملة", tr: "Tam erişim" },
  roleMember: { de: "Ausgewählte Seiten", en: "Selected pages", ar: "صفحات محددة", tr: "Seçili sayfalar" },
  logout: { de: "Abmelden", en: "Sign out", ar: "تسجيل الخروج", tr: "Çıkış yap" },
  liveSite: { de: "Website ist online", en: "Booking site is live", ar: "موقع الحجز يعمل", tr: "Rezervasyon sitesi yayında" },
  openSite: { de: "Website öffnen", en: "Open the website", ar: "فتح الموقع", tr: "Siteyi aç" },
  collapse: { de: "Seitenleiste einklappen", en: "Collapse sidebar", ar: "طي الشريط الجانبي", tr: "Kenar çubuğunu daralt" },
  expand: { de: "Seitenleiste ausklappen", en: "Expand sidebar", ar: "توسيع الشريط الجانبي", tr: "Kenar çubuğunu genişlet" },
  menu: { de: "Menü", en: "Menu", ar: "القائمة", tr: "Menü" },
  close: { de: "Schließen", en: "Close", ar: "إغلاق", tr: "Kapat" },
  language: { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },
  unsaved: { de: "Sie haben unveröffentlichte Änderungen", en: "You have unpublished changes", ar: "لديك تغييرات غير منشورة", tr: "Yayınlanmamış değişiklikleriniz var" },
  discard: { de: "Verwerfen", en: "Discard", ar: "تجاهل", tr: "Vazgeç" },
  publish: { de: "Speichern & veröffentlichen", en: "Save & publish", ar: "حفظ ونشر", tr: "Kaydet ve yayınla" },
  published: {
    de: "Veröffentlicht. Die Buchungsseite nutzt jetzt diese Einstellungen.",
    en: "Published. The booking site now uses these settings.",
    ar: "تم النشر. موقع الحجز يستخدم هذه الإعدادات الآن.",
    tr: "Yayınlandı. Rezervasyon sitesi artık bu ayarları kullanıyor.",
  },
  discarded: { de: "Änderungen verworfen.", en: "Changes discarded.", ar: "تم تجاهل التغييرات.", tr: "Değişiklikler geri alındı." },
  publishFailed: {
    de: "Veröffentlichen fehlgeschlagen. Korrigieren Sie zuerst die rot markierten Werte.",
    en: "Publishing failed. Fix the values marked in red first.",
    ar: "تعذّر النشر. صحّح القيم المعلّمة بالأحمر أولاً.",
    tr: "Yayınlanamadı. Önce kırmızıyla işaretli değerleri düzeltin.",
  },
  lastPublished: { de: "Zuletzt veröffentlicht · {date}", en: "Last published · {date}", ar: "آخر نشر · {date}", tr: "Son yayın · {date}" },
  notPublished: { de: "Noch nicht veröffentlicht", en: "Not published yet", ar: "لم يُنشر بعد", tr: "Henüz yayınlanmadı" },
});
