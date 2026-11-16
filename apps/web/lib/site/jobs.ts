import type { Locale } from "@/lib/i18n/config";

/**
 * Job postings, read on the server for the Jobs pages.
 *
 * Uncached: the dashboard's change must be on the website the moment it is
 * saved, and the list is a handful of rows. A failed read shows an empty list
 * rather than an error page, as the CMS reads do.
 */

export type EmploymentType = "full_time" | "part_time" | "mini_job";

export interface JobSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  location: string;
  employmentType: EmploymentType;
}

export interface JobDetails extends JobSummary {
  /** Sanitised HTML from the API. */
  description: string;
  tasks: string;
  requirements: string;
  offer: string;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function fetchJobs(): Promise<JobSummary[]> {
  try {
    const response = await fetch(`${apiBase()}/api/jobs`, { cache: "no-store" });
    if (!response.ok) return [];
    return ((await response.json()) as { items: JobSummary[] }).items;
  } catch {
    return [];
  }
}

/** One active posting, or null when there is none at that address. */
export async function fetchJob(slug: string): Promise<JobDetails | null> {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  try {
    const response = await fetch(`${apiBase()}/api/jobs/posting/${slug}`, { cache: "no-store" });
    if (!response.ok) return null;
    return ((await response.json()) as { job: JobDetails }).job;
  } catch {
    return null;
  }
}

/** The fixed wording of the job pages, which the CMS section page-jobs does not hold. */
const TEXT = {
  de: {
    home: "Startseite",
    jobs: "Jobs",
    full_time: "Vollzeit",
    part_time: "Teilzeit",
    mini_job: "Minijob",
    details: "Details",
    applyNow: "Jetzt bewerben",
    allJobs: "Alle Stellen",
    description: "Über die Stelle",
    tasks: "Ihre Aufgaben",
    requirements: "Ihr Profil",
    offer: "Das bieten wir",
    location: "Standort",
    type: "Anstellungsart",
    asideTitle: "Interesse?",
    asideText: "Die Bewerbung dauert nur ein paar Minuten. Ein Anschreiben ist nicht nötig.",
    applyEyebrow: "BEWERBUNG",
    applySub: "Schicken Sie uns Ihre Unterlagen. Wir melden uns schnellstmöglich bei Ihnen.",
    formTitle: "Ihre Bewerbung",
    formSub: "Mit * markierte Felder sind Pflichtfelder.",
    firstName: "Vorname",
    lastName: "Nachname",
    address: "Adresse",
    phone: "Telefonnummer",
    email: "E-Mail",
    message: "Nachricht / Anmerkungen",
    cv: "Lebenslauf",
    cvHint: "PDF, DOC oder DOCX, max. 10 MB",
    attachments: "Weitere Anlagen",
    attachmentsHint: "z. B. Zeugnisse oder Führerschein: bis zu 5 Dateien (PDF, DOC, DOCX, JPG, PNG), je max. 10 MB",
    choose: "Datei auswählen",
    chooseMore: "Dateien hinzufügen",
    remove: "Entfernen",
    consentBefore: "Ich habe die ",
    consentLink: "Datenschutzerklärung",
    consentAfter: " gelesen und bin einverstanden, dass meine Angaben zur Bearbeitung meiner Bewerbung gespeichert werden.",
    submit: "Bewerbung absenden",
    sending: "Wird gesendet…",
    sentTitle: "Vielen Dank für Ihre Bewerbung!",
    sentText: "Wir haben Ihre Unterlagen erhalten und melden uns per E-Mail oder Telefon bei Ihnen.",
    backToJobs: "Zurück zu allen Stellen",
    errFill: "Bitte füllen Sie alle Pflichtfelder aus.",
    errEmail: "Geben Sie eine gültige E-Mail-Adresse ein.",
    errCv: "Bitte laden Sie Ihren Lebenslauf hoch.",
    errConsent: "Bitte stimmen Sie der Datenschutzerklärung zu.",
    errCvType: "Der Lebenslauf muss eine PDF-, DOC- oder DOCX-Datei sein.",
    errAttachmentType: "Anlagen müssen PDF-, DOC-, DOCX-, JPG- oder PNG-Dateien sein.",
    errSize: "Jede Datei darf höchstens 10 MB groß sein.",
    errTooMany: "Sie können höchstens 5 weitere Anlagen hochladen.",
    errSend: "Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an.",
    errLimit: "Zu viele Versuche. Bitte warten Sie etwas und versuchen Sie es dann erneut.",
  },
  en: {
    home: "Home",
    jobs: "Jobs",
    full_time: "Full-time",
    part_time: "Part-time",
    mini_job: "Mini-job",
    details: "Details",
    applyNow: "Apply now",
    allJobs: "All roles",
    description: "About the role",
    tasks: "Your tasks",
    requirements: "Your profile",
    offer: "What we offer",
    location: "Location",
    type: "Employment type",
    asideTitle: "Interested?",
    asideText: "Applying only takes a few minutes. No cover letter needed.",
    applyEyebrow: "APPLICATION",
    applySub: "Send us your documents. We will get back to you as soon as possible.",
    formTitle: "Your application",
    formSub: "Fields marked * are required.",
    firstName: "First name",
    lastName: "Last name",
    address: "Address",
    phone: "Phone number",
    email: "Email",
    message: "Message / notes",
    cv: "CV",
    cvHint: "PDF, DOC or DOCX, max. 10 MB",
    attachments: "Additional attachments",
    attachmentsHint: "e.g. certificates or driving licence: up to 5 files (PDF, DOC, DOCX, JPG, PNG), max. 10 MB each",
    choose: "Choose file",
    chooseMore: "Add files",
    remove: "Remove",
    consentBefore: "I have read the ",
    consentLink: "privacy policy",
    consentAfter: " and agree that my details are stored to process my application.",
    submit: "Send application",
    sending: "Sending…",
    sentTitle: "Thank you for your application!",
    sentText: "We have received your documents and will contact you by email or phone.",
    backToJobs: "Back to all roles",
    errFill: "Please fill in all required fields.",
    errEmail: "Enter a valid email address.",
    errCv: "Please upload your CV.",
    errConsent: "Please accept the privacy policy.",
    errCvType: "Your CV must be a PDF, DOC or DOCX file.",
    errAttachmentType: "Attachments must be PDF, DOC, DOCX, JPG or PNG files.",
    errSize: "Each file can be at most 10 MB.",
    errTooMany: "You can upload at most 5 additional attachments.",
    errSend: "Sorry, that didn't work. Please try again or give us a call.",
    errLimit: "Too many attempts. Please wait a while and try again.",
  },
  ar: {
    home: "الرئيسية",
    jobs: "الوظائف",
    full_time: "دوام كامل",
    part_time: "دوام جزئي",
    mini_job: "عمل مصغّر (Minijob)",
    details: "التفاصيل",
    applyNow: "قدّم الآن",
    allJobs: "كل الوظائف",
    description: "عن الوظيفة",
    tasks: "مهامك",
    requirements: "المؤهلات المطلوبة",
    offer: "ما نقدّمه لك",
    location: "المكان",
    type: "نوع الدوام",
    asideTitle: "مهتم؟",
    asideText: "التقديم يستغرق بضع دقائق فقط، ولا حاجة لرسالة تعريفية.",
    applyEyebrow: "طلب توظيف",
    applySub: "أرسل لنا أوراقك وسنتواصل معك بأسرع وقت ممكن.",
    formTitle: "طلبك",
    formSub: "الحقول المعلّمة بـ * إلزامية.",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    address: "العنوان",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني",
    message: "رسالة / ملاحظات",
    cv: "السيرة الذاتية",
    cvHint: "PDF أو DOC أو DOCX، بحد أقصى 10 ميغابايت",
    attachments: "مرفقات إضافية",
    attachmentsHint: "مثل الشهادات أو رخصة القيادة: حتى 5 ملفات (PDF، DOC، DOCX، JPG، PNG)، كل ملف بحد أقصى 10 ميغابايت",
    choose: "اختر ملفاً",
    chooseMore: "أضف ملفات",
    remove: "إزالة",
    consentBefore: "قرأت ",
    consentLink: "سياسة الخصوصية",
    consentAfter: " وأوافق على حفظ بياناتي لمعالجة طلبي.",
    submit: "إرسال الطلب",
    sending: "جارٍ الإرسال…",
    sentTitle: "شكراً لتقديمك!",
    sentText: "استلمنا أوراقك وسنتواصل معك عبر البريد الإلكتروني أو الهاتف.",
    backToJobs: "العودة إلى كل الوظائف",
    errFill: "يرجى تعبئة جميع الحقول الإلزامية.",
    errEmail: "أدخل بريداً إلكترونياً صحيحاً.",
    errCv: "يرجى رفع سيرتك الذاتية.",
    errConsent: "يرجى الموافقة على سياسة الخصوصية.",
    errCvType: "يجب أن تكون السيرة الذاتية ملف PDF أو DOC أو DOCX.",
    errAttachmentType: "يجب أن تكون المرفقات ملفات PDF أو DOC أو DOCX أو JPG أو PNG.",
    errSize: "يجب ألا يتجاوز حجم كل ملف 10 ميغابايت.",
    errTooMany: "يمكنك رفع 5 مرفقات إضافية كحد أقصى.",
    errSend: "عذراً، لم ينجح الإرسال. حاول مرة أخرى أو اتصل بنا.",
    errLimit: "محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مجدداً.",
  },
  tr: {
    home: "Ana sayfa",
    jobs: "Kariyer",
    full_time: "Tam zamanlı",
    part_time: "Yarı zamanlı",
    mini_job: "Mini iş",
    details: "Detaylar",
    applyNow: "Hemen başvurun",
    allJobs: "Tüm pozisyonlar",
    description: "Pozisyon hakkında",
    tasks: "Görevleriniz",
    requirements: "Aradığımız profil",
    offer: "Size sunduklarımız",
    location: "Konum",
    type: "Çalışma şekli",
    asideTitle: "İlgileniyor musunuz?",
    asideText: "Başvuru sadece birkaç dakika sürer. Ön yazı gerekmez.",
    applyEyebrow: "BAŞVURU",
    applySub: "Belgelerinizi bize gönderin. En kısa sürede size dönüş yapacağız.",
    formTitle: "Başvurunuz",
    formSub: "* ile işaretli alanlar zorunludur.",
    firstName: "Ad",
    lastName: "Soyad",
    address: "Adres",
    phone: "Telefon numarası",
    email: "E-posta",
    message: "Mesaj / notlar",
    cv: "Özgeçmiş",
    cvHint: "PDF, DOC veya DOCX, en fazla 10 MB",
    attachments: "Ek belgeler",
    attachmentsHint: "ör. sertifikalar veya ehliyet: en fazla 5 dosya (PDF, DOC, DOCX, JPG, PNG), her biri en fazla 10 MB",
    choose: "Dosya seçin",
    chooseMore: "Dosya ekleyin",
    remove: "Kaldır",
    consentBefore: "",
    consentLink: "Gizlilik politikasını",
    consentAfter: " okudum ve bilgilerimin başvurumun işlenmesi için saklanmasını kabul ediyorum.",
    submit: "Başvuruyu gönder",
    sending: "Gönderiliyor…",
    sentTitle: "Başvurunuz için teşekkürler!",
    sentText: "Belgelerinizi aldık; size e-posta veya telefonla ulaşacağız.",
    backToJobs: "Tüm pozisyonlara dön",
    errFill: "Lütfen tüm zorunlu alanları doldurun.",
    errEmail: "Geçerli bir e-posta adresi girin.",
    errCv: "Lütfen özgeçmişinizi yükleyin.",
    errConsent: "Lütfen gizlilik politikasını kabul edin.",
    errCvType: "Özgeçmiş PDF, DOC veya DOCX dosyası olmalıdır.",
    errAttachmentType: "Ekler PDF, DOC, DOCX, JPG veya PNG dosyası olmalıdır.",
    errSize: "Her dosya en fazla 10 MB olabilir.",
    errTooMany: "En fazla 5 ek belge yükleyebilirsiniz.",
    errSend: "Maalesef olmadı. Lütfen tekrar deneyin veya bizi arayın.",
    errLimit: "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.",
  },
} as const;

export type JobsText = { [K in keyof (typeof TEXT)["de"]]: string };

export function jobsText(locale: Locale): JobsText {
  return TEXT[locale] ?? TEXT.de;
}
