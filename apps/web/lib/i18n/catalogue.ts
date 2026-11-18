/**
 * The complete message catalogue.
 *
 * Kept as one typed source rather than four hand-edited JSON files, so a key
 * added for one language cannot be forgotten in another — the type below makes
 * that a compile error. The JSON files the app loads are generated from this.
 *
 * A plural is written as an object of CLDR categories. Arabic genuinely needs
 * six of them; German, English and Turkish use two. Only the categories a
 * language actually has are supplied, and `other` is always the fallback.
 */

export const LOCALES = ["de", "en", "ar", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Message = string | Plural;

/** Every key must exist in every locale. */
export type Catalogue = Record<Locale, Record<MessageKey, Message>>;

export const MESSAGES = {
  // ── Navigation ──────────────────────────────────────────────────────
  "nav.calculator": {
    de: "Rechner", en: "Calculator", ar: "الحاسبة", tr: "Hesaplayıcı",
  },
  "nav.services": {
    de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler",
  },
  "nav.reviews": {
    de: "Kundenstimmen", en: "Reviews", ar: "آراء العملاء", tr: "Yorumlar",
  },
  "nav.about": {
    de: "Über uns", en: "About us", ar: "من نحن", tr: "Hakkımızda",
  },
  "nav.howItWorks": {
    de: "So funktioniert's", en: "How it works", ar: "كيف يعمل", tr: "Nasıl çalışır",
  },
  "nav.admin": { de: "Admin", en: "Admin", ar: "الإدارة", tr: "Yönetim" },
  "nav.profile": {
    de: "Mein Profil", en: "My Profile", ar: "ملفي الشخصي", tr: "Profilim",
  },
  "nav.orders": {
    de: "Meine Aufträge", en: "My Orders", ar: "طلباتي", tr: "Siparişlerim",
  },
  "nav.logout": {
    de: "Abmelden", en: "Log out", ar: "تسجيل الخروج", tr: "Çıkış yap",
  },
  "nav.login": {
    de: "Anmelden", en: "Log in", ar: "تسجيل الدخول", tr: "Giriş yap",
  },
  "nav.signup": {
    de: "Registrieren", en: "Sign up", ar: "إنشاء حساب", tr: "Kayıt ol",
  },
  "nav.language": { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },

  // ── Common ──────────────────────────────────────────────────────────
  "common.loading": {
    de: "Wird geladen…", en: "Loading…", ar: "جارٍ التحميل…", tr: "Yükleniyor…",
  },
  "common.retry": {
    de: "Erneut versuchen", en: "Try again", ar: "حاول مرّة أخرى", tr: "Tekrar dene",
  },
  "common.cancel": { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  "common.save": { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  "common.saving": {
    de: "Speichern…", en: "Saving…", ar: "جارٍ الحفظ…", tr: "Kaydediliyor…",
  },
  "common.saved": { de: "Gespeichert.", en: "Saved.", ar: "تم الحفظ.", tr: "Kaydedildi." },
  "common.back": { de: "Zurück", en: "Back", ar: "رجوع", tr: "Geri" },
  "common.next": { de: "Weiter", en: "Next", ar: "التالي", tr: "İleri" },
  "common.search": { de: "Suche", en: "Search", ar: "بحث", tr: "Ara" },
  "common.status": { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  "common.action": { de: "Aktion", en: "Action", ar: "إجراء", tr: "İşlem" },
  "common.name": { de: "Name", en: "Name", ar: "الاسم", tr: "İsim" },
  "common.email": { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  "common.phone": { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  "common.password": { de: "Passwort", en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  "common.date": { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  "common.time": { de: "Uhrzeit", en: "Time", ar: "الوقت", tr: "Saat" },
  "common.address": { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  "common.optional": { de: "optional", en: "optional", ar: "اختياري", tr: "isteğe bağlı" },
  "common.none": { de: "—", en: "—", ar: "—", tr: "—" },
  "common.loadMore": {
    de: "Weitere laden", en: "Load more", ar: "تحميل المزيد", tr: "Daha fazla yükle",
  },

  // ── Order status ────────────────────────────────────────────────────
  "status.quoted": { de: "Angebot", en: "Quote", ar: "عرض سعر", tr: "Teklif" },
  "status.confirmed": { de: "Bestätigt", en: "Confirmed", ar: "مؤكَّد", tr: "Onaylandı" },
  "status.cancelled": { de: "Storniert", en: "Cancelled", ar: "ملغى", tr: "İptal edildi" },
  "status.completed": {
    de: "Abgeschlossen", en: "Completed", ar: "مكتمل", tr: "Tamamlandı",
  },
  "status.active": { de: "Aktiv", en: "Active", ar: "نشط", tr: "Aktif" },
  "status.blocked": { de: "Gesperrt", en: "Blocked", ar: "محظور", tr: "Engellendi" },

  // ── Services ────────────────────────────────────────────────────────
  "service.moving": { de: "Umzug", en: "Moving", ar: "نقل", tr: "Nakliye" },
  "service.disposal": {
    de: "Entsorgung", en: "Disposal", ar: "التخلّص من الأثاث", tr: "Tasfiye",
  },
  "service.cleaning": { de: "Reinigung", en: "Cleaning", ar: "تنظيف", tr: "Temizlik" },
  "service.moving.hint": {
    de: "Privat- oder Firmenumzug",
    en: "Private or business move",
    ar: "نقل منزلي أو تجاري",
    tr: "Bireysel veya ticari taşınma",
  },
  "service.disposal.hint": {
    de: "Entrümpelung & Haushaltsauflösung",
    en: "Decluttering & house clearance",
    ar: "إفراغ وتصفية المنزل",
    tr: "Eşya boşaltma ve tasfiye",
  },
  "service.cleaning.hint": {
    de: "Übergabereinigung beim Auszug",
    en: "Move-out handover cleaning",
    ar: "تنظيف التسليم عند المغادرة",
    tr: "Çıkış teslim temizliği",
  },

  // ── Calculator ──────────────────────────────────────────────────────
  "calc.title": {
    de: "Sofort-Preis berechnen",
    en: "Calculate your instant price",
    ar: "احسب سعرك الفوري",
    tr: "Anında fiyatını hesapla",
  },
  "calc.lead": {
    de: "Der Rechner ist kostenlos und ohne Konto nutzbar. Ein Konto brauchst du erst, wenn du verbindlich anfragen möchtest.",
    en: "The calculator is free and needs no account. An account is only needed to submit a binding request.",
    ar: "الحاسبة مجانية ولا تحتاج حسابًا. الحساب مطلوب فقط عند إرسال طلب ملزم.",
    tr: "Hesaplayıcı ücretsizdir ve hesap gerektirmez. Hesap yalnızca bağlayıcı talep için gerekir.",
  },
  "calc.step.scope": { de: "Umfang", en: "Scope", ar: "النطاق", tr: "Kapsam" },
  "calc.step.schedule": { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  "calc.step.contact": { de: "Kontakt", en: "Contact", ar: "التواصل", tr: "İletişim" },
  "calc.progress": { de: "Fortschritt", en: "Wizard progress", ar: "التقدّم", tr: "İlerleme" },
  "calc.whichService": {
    de: "Welche Leistung brauchst du?",
    en: "Which service do you need?",
    ar: "أي خدمة تحتاج؟",
    tr: "Hangi hizmete ihtiyacınız var?",
  },
  "calc.customerType": {
    de: "Für wen?", en: "For whom?", ar: "لمن؟", tr: "Kimin için?",
  },
  "calc.private": { de: "Privat", en: "Private", ar: "شخصي", tr: "Bireysel" },
  "calc.business": { de: "Gewerblich", en: "Business", ar: "تجاري", tr: "Ticari" },
  "calc.scopeAndAddress": {
    de: "Umfang und Adresse",
    en: "Scope and address",
    ar: "النطاق والعنوان",
    tr: "Kapsam ve adres",
  },
  "calc.originAddress": {
    de: "Startadresse", en: "Starting address", ar: "عنوان البداية", tr: "Başlangıç adresi",
  },
  "calc.objectAddress": {
    de: "Adresse des Objekts", en: "Property address", ar: "عنوان العقار", tr: "Mülk adresi",
  },
  "calc.destinationAddress": {
    de: "Zieladresse", en: "Destination address", ar: "عنوان الوجهة", tr: "Varış adresi",
  },
  "calc.area": { de: "Fläche (m²)", en: "Area (m²)", ar: "المساحة (م²)", tr: "Alan (m²)" },
  "calc.floor": { de: "Etage", en: "Floor", ar: "الطابق", tr: "Kat" },
  "calc.floorIn": {
    de: "Etage (Einzug)", en: "Floor (moving in)", ar: "الطابق (الوصول)", tr: "Kat (giriş)",
  },
  "calc.hasElevator": {
    de: "Aufzug vorhanden", en: "Lift available", ar: "يوجد مصعد", tr: "Asansör var",
  },
  "calc.extras": {
    de: "Zusatzleistungen", en: "Extras", ar: "خدمات إضافية", tr: "Ek hizmetler",
  },
  "calc.packing": {
    de: "Verpackungsservice inkl. Material",
    en: "Packing service incl. material",
    ar: "خدمة التغليف شاملة المواد",
    tr: "Paketleme hizmeti (malzeme dahil)",
  },
  "calc.parkingZone": {
    de: "Halteverbotszone", en: "No-parking zone", ar: "منطقة حظر وقوف", tr: "Park yasağı bölgesi",
  },
  "calc.insurance": {
    de: "Transportversicherung (erweitert)",
    en: "Extended transport insurance",
    ar: "تأمين نقل موسّع",
    tr: "Genişletilmiş nakliye sigortası",
  },
  "calc.crewOfThree": {
    de: "3 Mitarbeiter (schneller)",
    en: "3 movers (faster)",
    ar: "3 عمّال (أسرع)",
    tr: "3 işçi (daha hızlı)",
  },
  "calc.preferredDate": {
    de: "Wunschtermin", en: "Preferred date", ar: "الموعد المفضّل", tr: "Tercih edilen tarih",
  },
  "calc.calendarHint": {
    de: "Belegte und gesperrte Tage sind deaktiviert. Wird ein Tag während deiner Auswahl vergeben, verschwindet er automatisch.",
    en: "Booked and blocked days are disabled. If a day is taken while you are choosing, it disappears automatically.",
    ar: "الأيام المحجوزة والمغلقة معطّلة. وإذا حُجز يوم أثناء اختيارك، يختفي تلقائيًّا.",
    tr: "Dolu ve kapalı günler devre dışıdır. Siz seçerken bir gün dolarsa otomatik olarak kaybolur.",
  },
  "calc.discountCode": {
    de: "Rabattcode", en: "Discount code", ar: "كود خصم", tr: "İndirim kodu",
  },
  "calc.yourPrice": { de: "Dein Preis", en: "Your price", ar: "سعرك", tr: "Fiyatınız" },
  "calc.enterToSeePrice": {
    de: "Gib Adresse und Fläche an, um den Preis zu sehen.",
    en: "Enter an address and area to see the price.",
    ar: "أدخل العنوان والمساحة لرؤية السعر.",
    tr: "Fiyatı görmek için adres ve alan girin.",
  },
  "calc.calculating": {
    de: "Preis wird berechnet…", en: "Calculating price…", ar: "جارٍ حساب السعر…", tr: "Fiyat hesaplanıyor…",
  },
  "calc.net": { de: "Netto", en: "Net", ar: "الصافي", tr: "Net" },
  "calc.vat": { de: "MwSt. {rate} %", en: "VAT {rate}%", ar: "ضريبة القيمة المضافة {rate}٪", tr: "KDV %{rate}" },
  "calc.vatIncl": { de: "inkl. MwSt. {rate} %", en: "incl. VAT {rate}%", ar: "شامل ضريبة القيمة المضافة {rate}٪", tr: "KDV %{rate} dahil" },
  "calc.total": { de: "Gesamt", en: "Total", ar: "الإجمالي", tr: "Toplam" },
  "calc.deposit": {
    de: "Anzahlung", en: "Deposit", ar: "الدفعة المقدّمة", tr: "Kapora",
  },
  "calc.duration": {
    de: "Voraussichtliche Dauer: {hours} Std. Unverbindliche Schätzung.",
    en: "Estimated duration: {hours} hrs. Non-binding estimate.",
    ar: "المدة المتوقعة: {hours} ساعة. تقدير غير ملزم.",
    tr: "Tahmini süre: {hours} saat. Bağlayıcı olmayan tahmin.",
  },
  "calc.accountHint": {
    de: "Für die verbindliche Anfrage legst du ein kostenloses Konto an — dein berechneter Preis wird übernommen.",
    en: "For a binding request you create a free account — your calculated price is carried over.",
    ar: "للطلب الملزم تُنشئ حسابًا مجانيًّا — والسعر الذي حسبته يُنقل معك.",
    tr: "Bağlayıcı talep için ücretsiz hesap açarsınız — hesapladığınız fiyat aktarılır.",
  },
  "calc.submit": {
    de: "Verbindlich anfragen", en: "Request binding quote", ar: "إرسال طلب ملزم", tr: "Bağlayıcı talep gönder",
  },
  "calc.submitWithSignup": {
    de: "Konto anlegen & anfragen",
    en: "Create account & request",
    ar: "إنشاء حساب وإرسال الطلب",
    tr: "Hesap aç ve talep et",
  },
  "calc.sending": { de: "Sende…", en: "Sending…", ar: "جارٍ الإرسال…", tr: "Gönderiliyor…" },
  "calc.successTitle": {
    de: "Anfrage gesendet", en: "Request sent", ar: "تم إرسال الطلب", tr: "Talep gönderildi",
  },
  "calc.successBody": {
    de: "Dein Auftrag {reference} ist bei uns eingegangen. Den Status siehst du jederzeit unter „Meine Aufträge“ — er aktualisiert sich automatisch.",
    en: "Your order {reference} has reached us. You can see its status any time under \"My Orders\" — it updates automatically.",
    ar: "وصلنا طلبك {reference}. يمكنك متابعة حالته في أي وقت من «طلباتي» — وتتحدّث تلقائيًّا.",
    tr: "Siparişiniz {reference} bize ulaştı. Durumunu istediğiniz zaman \"Siparişlerim\" altında görebilirsiniz — otomatik güncellenir.",
  },
  "calc.goToOrders": {
    de: "Zu meinen Aufträgen", en: "Go to my orders", ar: "إلى طلباتي", tr: "Siparişlerime git",
  },
  "calc.prevMonth": {
    de: "Vorheriger Monat", en: "Previous month", ar: "الشهر السابق", tr: "Önceki ay",
  },
  "calc.nextMonth": {
    de: "Nächster Monat", en: "Next month", ar: "الشهر التالي", tr: "Sonraki ay",
  },

  // ── Auth ────────────────────────────────────────────────────────────

  "auth.welcomeBack": {
    de: "Willkommen zurück", en: "Welcome back", ar: "أهلاً بعودتك", tr: "Tekrar hoş geldiniz",
  },
  "auth.panelHeadline": {
    de: "Umzug — einfacher, schneller, stressfrei.",
    en: "Moving made simpler, faster, and stress-free.",
    ar: "النقل — أبسط وأسرع وبلا توتّر.",
    tr: "Taşınma — daha basit, daha hızlı, stressiz.",
  },
  "auth.panelBody": {
    de: "Melde dich an, um deine Aufträge zu verwalten, deine Checkliste anzupassen und dein Team direkt zu erreichen.",
    en: "Log in to manage your bookings, customize your moving checklist, and connect with your dedicated professional team instantly.",
    ar: "سجّل الدخول لإدارة طلباتك، وتخصيص قائمة النقل، والتواصل مع فريقك مباشرةً.",
    tr: "Rezervasyonlarınızı yönetmek, taşınma listenizi özelleştirmek ve ekibinizle anında iletişim kurmak için giriş yapın.",
  },
  "auth.badgeInsured": {
    de: "Vollständig versichert", en: "Fully Insured", ar: "مؤمَّن بالكامل", tr: "Tam Sigortalı",
  },
  "auth.badgeRating": {
    de: "4,6/5 Bewertung", en: "4.6/5 Rating", ar: "تقييم 4.6/5", tr: "4,6/5 Puan",
  },
  "auth.forgotPassword": {
    de: "Passwort vergessen?", en: "Forgot Password?", ar: "نسيت كلمة المرور؟", tr: "Şifrenizi mi unuttunuz?",
  },
  "auth.orContinueWith": {
    de: "oder weiter mit", en: "or continue with", ar: "أو تابع باستخدام", tr: "veya şununla devam et",
  },
  "auth.show": { de: "Zeigen", en: "Show", ar: "إظهار", tr: "Göster" },
  "auth.hide": { de: "Verbergen", en: "Hide", ar: "إخفاء", tr: "Gizle" },
  "auth.comingSoon": {
    de: "Demnächst verfügbar", en: "Coming soon", ar: "قريبًا", tr: "Yakında",
  },
  "auth.loginTitle": { de: "Anmelden", en: "Log in", ar: "تسجيل الدخول", tr: "Giriş yap" },
  "auth.loginSub": {
    de: "Melde dich mit deinem Konto an.",
    en: "Sign in with your account.",
    ar: "سجّل الدخول بحسابك.",
    tr: "Hesabınızla giriş yapın.",
  },
  "auth.loginSubmit": { de: "Einloggen", en: "Log in", ar: "دخول", tr: "Giriş yap" },
  "auth.loggingIn": { de: "Anmelden…", en: "Signing in…", ar: "جارٍ الدخول…", tr: "Giriş yapılıyor…" },
  "auth.noAccount": {
    de: "Noch kein Konto?", en: "No account yet?", ar: "ليس لديك حساب؟", tr: "Hesabınız yok mu?",
  },
  "auth.hasAccount": {
    de: "Schon ein Konto?", en: "Already have an account?", ar: "لديك حساب؟", tr: "Zaten hesabınız var mı?",
  },
  "auth.signupTitle": { de: "Registrieren", en: "Sign up", ar: "إنشاء حساب", tr: "Kayıt ol" },
  "auth.signupSub": {
    de: "Erstelle ein kostenloses Konto.",
    en: "Create a free account.",
    ar: "أنشئ حسابًا مجانيًّا.",
    tr: "Ücretsiz hesap oluşturun.",
  },
  "auth.signupWithQuote": {
    de: "Noch ein Schritt — dein berechnetes Angebot wird übernommen.",
    en: "One more step — your calculated quote is carried over.",
    ar: "خطوة واحدة — والعرض الذي حسبته يُنقل معك.",
    tr: "Bir adım daha — hesapladığınız teklif aktarılır.",
  },
  "auth.signupSubmit": {
    de: "Konto erstellen", en: "Create account", ar: "إنشاء الحساب", tr: "Hesap oluştur",
  },
  "auth.creatingAccount": {
    de: "Konto wird erstellt…", en: "Creating account…", ar: "جارٍ إنشاء الحساب…", tr: "Hesap oluşturuluyor…",
  },
  "auth.passwordHint": {
    de: "Mindestens {min} Zeichen.",
    en: "At least {min} characters.",
    ar: "{min} أحرف على الأقل.",
    tr: "En az {min} karakter.",
  },
  "auth.emailLocked": {
    de: "Zum Ändern der E-Mail wende dich bitte an den Support.",
    en: "To change your email, please contact support.",
    ar: "لتغيير البريد الإلكتروني، الرجاء التواصل مع الدعم.",
    tr: "E-postanızı değiştirmek için lütfen destekle iletişime geçin.",
  },
  "auth.profileTitle": {
    de: "Mein Profil", en: "My Profile", ar: "ملفي الشخصي", tr: "Profilim",
  },

  // ── Auth: reset, confirm and one-time code ──────────────────────────
  "auth.forgotTitle": {
    de: "Passwort vergessen", en: "Forgot password", ar: "نسيت كلمة السر", tr: "Şifremi unuttum",
  },
  "auth.forgotSub": {
    de: "Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.", en: "Enter your email address and we'll send you a reset link.", ar: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.", tr: "E-posta adresini gir, sıfırlama bağlantısı gönderelim.",
  },
  "auth.forgotSubmit": {
    de: "Link senden", en: "Send link", ar: "إرسال الرابط", tr: "Bağlantı gönder",
  },
  "auth.forgotSending": {
    de: "Wird gesendet…", en: "Sending…", ar: "جارٍ الإرسال…", tr: "Gönderiliyor…",
  },
  "auth.forgotSent": {
    de: "Falls ein Konto zu dieser Adresse gehört, ist ein Link auf dem Weg. Prüfe auch den Spam-Ordner.", en: "If an account exists for that address, a link is on its way. Check your spam folder too.", ar: "إذا كان هناك حساب مرتبط بهذا العنوان، فالرابط في الطريق. تحقّق من مجلد السبام أيضاً.", tr: "Bu adrese ait bir hesap varsa bağlantı yolda. Spam klasörünü de kontrol et.",
  },
  "auth.backToLogin": {
    de: "Zurück zur Anmeldung", en: "Back to sign in", ar: "رجوع لتسجيل الدخول", tr: "Girişe dön",
  },
  "auth.resetTitle": {
    de: "Neues Passwort wählen", en: "Choose a new password", ar: "اختر كلمة سر جديدة", tr: "Yeni şifre seç",
  },
  "auth.resetSub": {
    de: "Wähle ein neues Passwort für dein Konto.", en: "Pick a new password for your account.", ar: "اختر كلمة سر جديدة لحسابك.", tr: "Hesabın için yeni bir şifre belirle.",
  },
  "auth.resetSubmit": {
    de: "Passwort speichern", en: "Save password", ar: "حفظ كلمة السر", tr: "Şifreyi kaydet",
  },
  "auth.resetSaving": {
    de: "Wird gespeichert…", en: "Saving…", ar: "جارٍ الحفظ…", tr: "Kaydediliyor…",
  },
  "auth.resetDone": {
    de: "Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.", en: "Your password has been changed. You can sign in now.", ar: "تم تغيير كلمة السر. بتقدر تسجّل دخول هلق.", tr: "Şifren değiştirildi. Şimdi giriş yapabilirsin.",
  },
  "auth.confirmPassword": {
    de: "Passwort bestätigen", en: "Confirm password", ar: "تأكيد كلمة السر", tr: "Şifreyi onayla",
  },
  "auth.passwordMismatch": {
    de: "Die Passwörter stimmen nicht überein.", en: "The passwords do not match.", ar: "كلمتا السر غير متطابقتين.", tr: "Şifreler eşleşmiyor.",
  },
  "auth.linkInvalid": {
    de: "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.", en: "This link is invalid or has expired. Request a new one.", ar: "هذا الرابط غير صالح أو منتهي. اطلب رابطاً جديداً.", tr: "Bu bağlantı geçersiz veya süresi dolmuş. Yenisini talep et.",
  },
  "auth.linkMissing": {
    de: "Es fehlt ein Token. Öffne den Link direkt aus der E-Mail.", en: "The token is missing. Open the link straight from the email.", ar: "الرمز مفقود. افتح الرابط من الإيميل مباشرة.", tr: "Belirteç eksik. Bağlantıyı doğrudan e-postadan aç.",
  },
  "auth.verifyTitle": {
    de: "E-Mail bestätigen", en: "Confirm your email", ar: "تأكيد البريد الإلكتروني", tr: "E-postanı onayla",
  },
  "auth.verifyChecking": {
    de: "Wird bestätigt…", en: "Confirming…", ar: "جارٍ التأكيد…", tr: "Onaylanıyor…",
  },
  "auth.verifyDone": {
    de: "Deine E-Mail-Adresse ist bestätigt. Vielen Dank.", en: "Your email address is confirmed. Thank you.", ar: "تم تأكيد بريدك الإلكتروني. شكراً لك.", tr: "E-posta adresin onaylandı. Teşekkürler.",
  },
  "auth.verifyResend": {
    de: "Bestätigungslink erneut senden", en: "Resend confirmation link", ar: "إعادة إرسال رابط التأكيد", tr: "Onay bağlantısını yeniden gönder",
  },
  "auth.verifySent": {
    de: "Wir haben dir einen neuen Link geschickt.", en: "We've sent you a new link.", ar: "بعتنالك رابط جديد.", tr: "Sana yeni bir bağlantı gönderdik.",
  },
  "auth.otpTitle": {
    de: "Mit Code anmelden", en: "Sign in with a code", ar: "الدخول برمز", tr: "Kod ile giriş",
  },
  "auth.otpSub": {
    de: "Wir senden dir einen sechsstelligen Code per E-Mail — kein Passwort nötig.", en: "We'll email you a six-digit code — no password needed.", ar: "نبعتلك رمز من ٦ أرقام على الإيميل — بدون كلمة سر.", tr: "Sana e-postayla altı haneli bir kod göndereceğiz — şifre gerekmez.",
  },
  "auth.otpRequest": {
    de: "Code senden", en: "Send code", ar: "إرسال الرمز", tr: "Kod gönder",
  },
  "auth.otpSent": {
    de: "Falls ein Konto zu dieser Adresse gehört, ist ein Code auf dem Weg.", en: "If an account exists for that address, a code is on its way.", ar: "إذا كان هناك حساب مرتبط بهذا العنوان، فالرمز في الطريق.", tr: "Bu adrese ait bir hesap varsa kod yolda.",
  },
  "auth.otpCode": {
    de: "Sechsstelliger Code", en: "Six-digit code", ar: "الرمز المكوّن من ٦ أرقام", tr: "Altı haneli kod",
  },
  "auth.otpVerify": {
    de: "Anmelden", en: "Sign in", ar: "تسجيل الدخول", tr: "Giriş yap",
  },
  "auth.otpVerifying": {
    de: "Wird geprüft…", en: "Checking…", ar: "جارٍ التحقّق…", tr: "Kontrol ediliyor…",
  },
  "auth.otpInvalid": {
    de: "Dieser Code ist falsch oder abgelaufen.", en: "That code is wrong or has expired.", ar: "هذا الرمز خطأ أو منتهي.", tr: "Bu kod yanlış veya süresi dolmuş.",
  },
  "auth.otpChangeEmail": {
    de: "Andere E-Mail-Adresse verwenden", en: "Use a different email", ar: "استخدام بريد آخر", tr: "Başka bir e-posta kullan",
  },
  "auth.otpLink": {
    de: "Stattdessen Code per E-Mail", en: "Email me a code instead", ar: "أرسل لي رمزاً بدلاً من ذلك", tr: "Bunun yerine kod gönder",
  },
  "auth.passwordLink": {
    de: "Mit Passwort anmelden", en: "Sign in with a password", ar: "الدخول بكلمة السر", tr: "Şifre ile giriş",
  },
  "auth.otpNotDelivered": {
    de: "Hinweis: Der Mailversand ist deaktiviert (MAIL_DRIVER=log) — die Nachricht wurde nur lokal gespeichert.", en: "Note: mail sending is disabled (MAIL_DRIVER=log) — the message was only recorded locally.", ar: "ملاحظة: إرسال الإيميل معطّل (MAIL_DRIVER=log) — الرسالة انحفظت محلياً بس.", tr: "Not: e-posta gönderimi kapalı (MAIL_DRIVER=log) — mesaj yalnızca yerel olarak kaydedildi.",
  },

  // ── Orders ──────────────────────────────────────────────────────────
  "orders.title": {
    de: "Meine Aufträge", en: "My Orders", ar: "طلباتي", tr: "Siparişlerim",
  },
  "orders.empty": {
    de: "Du hast noch keine Aufträge.",
    en: "You have no orders yet.",
    ar: "لا توجد لديك طلبات بعد.",
    tr: "Henüz siparişiniz yok.",
  },
  "orders.calculateNow": {
    de: "Jetzt Preis berechnen", en: "Calculate a price now", ar: "احسب السعر الآن", tr: "Şimdi fiyat hesapla",
  },
  "orders.reference": {
    de: "Auftrag", en: "Order", ar: "الطلب", tr: "Sipariş",
  },
  "orders.service": { de: "Leistung", en: "Service", ar: "الخدمة", tr: "Hizmet" },
  "orders.breakdown": {
    de: "Preisaufschlüsselung", en: "Price breakdown", ar: "تفصيل السعر", tr: "Fiyat dökümü",
  },
  "orders.paid": {
    de: "Davon bezahlt", en: "Paid so far", ar: "المدفوع حتى الآن", tr: "Şu ana kadar ödenen",
  },
  "orders.cancelOrder": {
    de: "Auftrag stornieren", en: "Cancel order", ar: "إلغاء الطلب", tr: "Siparişi iptal et",
  },
  "orders.cancelTitle": {
    de: "Auftrag {reference} stornieren?",
    en: "Cancel order {reference}?",
    ar: "إلغاء الطلب {reference}؟",
    tr: "{reference} siparişi iptal edilsin mi?",
  },
  "orders.cancelBody": {
    de: "Bis 12 Stunden vor dem Termin ist die Stornierung kostenlos. Danach werden der Grundpreis sowie eine Bearbeitungsgebühr von 3 % einbehalten.",
    en: "Cancellation is free until 12 hours before the appointment. After that the base rate plus a 3% handling fee is retained.",
    ar: "الإلغاء مجاني حتى 12 ساعة قبل الموعد. بعد ذلك يُحتجز السعر الأساسي إضافةً إلى رسوم معالجة 3٪.",
    tr: "İptal, randevudan 12 saat öncesine kadar ücretsizdir. Sonrasında taban ücret ve %3 işlem ücreti tahsil edilir.",
  },
  "orders.cancelConfirm": {
    de: "Ja, stornieren", en: "Yes, cancel", ar: "نعم، ألغِ", tr: "Evet, iptal et",
  },
  "orders.cancelling": {
    de: "Wird storniert…", en: "Cancelling…", ar: "جارٍ الإلغاء…", tr: "İptal ediliyor…",
  },
  "orders.cancellationFee": {
    de: "Stornogebühr: {amount}",
    en: "Cancellation fee: {amount}",
    ar: "رسوم الإلغاء: {amount}",
    tr: "İptal ücreti: {amount}",
  },
  "orders.notFound": {
    de: "Dieser Auftrag wurde nicht gefunden.",
    en: "That order was not found.",
    ar: "لم يُعثر على هذا الطلب.",
    tr: "Bu sipariş bulunamadı.",
  },
  "orders.loadFailed": {
    de: "Deine Aufträge konnten nicht geladen werden.",
    en: "Your orders could not be loaded.",
    ar: "تعذّر تحميل طلباتك.",
    tr: "Siparişleriniz yüklenemedi.",
  },

  // ── Reviews ─────────────────────────────────────────────────────────
  "reviews.title": {
    de: "Kundenstimmen", en: "Reviews", ar: "آراء العملاء", tr: "Yorumlar",
  },
  "reviews.empty": {
    de: "Noch keine Bewertungen vorhanden.",
    en: "No reviews yet.",
    ar: "لا توجد تقييمات بعد.",
    tr: "Henüz yorum yok.",
  },
  "reviews.loadFailed": {
    de: "Die Bewertungen konnten nicht geladen werden.",
    en: "The reviews could not be loaded.",
    ar: "تعذّر تحميل التقييمات.",
    tr: "Yorumlar yüklenemedi.",
  },
  "reviews.adminReply": {
    de: "Antwort von m.on:",
    en: "Reply from m.on:",
    ar: "ردّ من m.on:",
    tr: "m.on'tan yanıt:",
  },
  "reviews.stars": {
    de: "{rating} von 5 Sternen",
    en: "{rating} out of 5 stars",
    ar: "{rating} من 5 نجوم",
    tr: "5 yıldız üzerinden {rating}",
  },

  // Dashboard: the customer's reviews and the moderation tab.
  "reviews.tabMine": {
    de: "Meine Bewertungen", en: "My reviews", ar: "تقييماتي", tr: "Yorumlarım",
  },
  "reviews.tabModeration": {
    de: "Moderation", en: "Moderation", ar: "الإشراف", tr: "Moderasyon",
  },
  "reviews.rateTitle": {
    de: "Abgeschlossene Aufträge bewerten",
    en: "Rate a completed job",
    ar: "قيّم طلبًا مكتملًا",
    tr: "Tamamlanan bir işi değerlendirin",
  },
  "reviews.nothingToRate": {
    de: "Im Moment gibt es nichts zu bewerten. Sobald ein Auftrag abgeschlossen ist, kannst du ihn hier bewerten.",
    en: "There is nothing to rate right now. Once a job is completed, you can rate it here.",
    ar: "لا يوجد ما تقيّمه حاليًا. بمجرد اكتمال أي طلب يمكنك تقييمه هنا.",
    tr: "Şu anda değerlendirilecek bir şey yok. Bir iş tamamlandığında burada değerlendirebilirsiniz.",
  },
  "reviews.mineTitle": {
    de: "Deine Bewertungen", en: "Your reviews", ar: "تقييماتك", tr: "Yorumlarınız",
  },
  "reviews.noneYet": {
    de: "Du hast noch keine Bewertung abgegeben.",
    en: "You have not written a review yet.",
    ar: "لم تكتب أي تقييم بعد.",
    tr: "Henüz bir yorum yazmadınız.",
  },
  "reviews.published": {
    de: "Veröffentlicht", en: "Published", ar: "منشور", tr: "Yayında",
  },
  "reviews.awaiting": {
    de: "Wird geprüft", en: "Awaiting review", ar: "قيد المراجعة", tr: "İnceleniyor",
  },
  "reviews.unpublished": {
    de: "Nicht veröffentlicht", en: "Not published", ar: "غير منشور", tr: "Yayında değil",
  },
  "reviews.ratingLabel": {
    de: "Deine Bewertung", en: "Your rating", ar: "تقييمك", tr: "Puanınız",
  },
  "reviews.commentLabel": {
    de: "Kommentar", en: "Comment", ar: "تعليق", tr: "Yorum",
  },
  "reviews.commentPlaceholder": {
    de: "Wie lief dein Umzug?",
    en: "How did your move go?",
    ar: "كيف كانت تجربة انتقالك؟",
    tr: "Taşınmanız nasıl geçti?",
  },
  "reviews.moderationHint": {
    de: "Bewertungen erscheinen auf der Website, sobald unser Team sie geprüft hat.",
    en: "Reviews appear on the website once our team has checked them.",
    ar: "تظهر التقييمات على الموقع بعد أن يراجعها فريقنا.",
    tr: "Yorumlar ekibimiz kontrol ettikten sonra web sitesinde görünür.",
  },
  "reviews.submit": {
    de: "Bewertung senden", en: "Submit review", ar: "إرسال التقييم", tr: "Yorumu gönder",
  },
  "reviews.submitFailed": {
    de: "Die Bewertung konnte nicht gesendet werden. Bitte versuch es erneut.",
    en: "The review could not be submitted. Please try again.",
    ar: "تعذّر إرسال التقييم. الرجاء المحاولة مرّة أخرى.",
    tr: "Yorum gönderilemedi. Lütfen tekrar deneyin.",
  },
  "reviews.filter.unpublished": {
    de: "Nicht veröffentlicht", en: "Not published", ar: "غير منشورة", tr: "Yayında olmayan",
  },
  "reviews.filter.published": {
    de: "Veröffentlicht", en: "Published", ar: "منشورة", tr: "Yayında",
  },
  "reviews.filter.all": {
    de: "Alle", en: "All", ar: "الكل", tr: "Tümü",
  },
  "reviews.moderationEmpty": {
    de: "Keine Bewertungen in dieser Ansicht.",
    en: "No reviews in this view.",
    ar: "لا توجد تقييمات في هذا العرض.",
    tr: "Bu görünümde yorum yok.",
  },
  "reviews.updateFailed": {
    de: "Die Änderung konnte nicht gespeichert werden. Bitte versuch es erneut.",
    en: "The change could not be saved. Please try again.",
    ar: "تعذّر حفظ التغيير. الرجاء المحاولة مرّة أخرى.",
    tr: "Değişiklik kaydedilemedi. Lütfen tekrar deneyin.",
  },
  "reviews.reviewer": { de: "Kunde", en: "Reviewer", ar: "صاحب التقييم", tr: "Yorumlayan" },
  "reviews.rating": { de: "Bewertung", en: "Rating", ar: "التقييم", tr: "Puan" },
  "reviews.comment": { de: "Kommentar", en: "Comment", ar: "التعليق", tr: "Yorum" },
  "reviews.submitted": { de: "Eingegangen", en: "Submitted", ar: "تاريخ الإرسال", tr: "Gönderilme" },
  "reviews.publish": { de: "Veröffentlichen", en: "Publish", ar: "نشر", tr: "Yayınla" },
  "reviews.hide": { de: "Ausblenden", en: "Hide", ar: "إخفاء", tr: "Gizle" },
  "reviews.reply": { de: "Antworten", en: "Reply", ar: "ردّ", tr: "Yanıtla" },
  "reviews.replyTitle": {
    de: "Antwort auf die Bewertung zu {reference}",
    en: "Reply to the review of {reference}",
    ar: "الردّ على تقييم {reference}",
    tr: "{reference} yorumuna yanıt",
  },
  "reviews.replyLabel": {
    de: "Deine Antwort", en: "Your reply", ar: "ردّك", tr: "Yanıtınız",
  },
  "reviews.replyHint": {
    de: "Die Antwort wird mit der Bewertung angezeigt, sobald sie veröffentlicht ist.",
    en: "The reply is shown with the review once it is published.",
    ar: "يظهر الردّ مع التقييم بمجرد نشره.",
    tr: "Yanıt, yorum yayınlandığında onunla birlikte gösterilir.",
  },

  // ── Messages (dashboard) ────────────────────────────────────────────
  "messages.threads": {
    de: "Unterhaltungen", en: "Conversations", ar: "المحادثات", tr: "Sohbetler",
  },
  "messages.new": {
    de: "Neue Unterhaltung", en: "New conversation", ar: "محادثة جديدة", tr: "Yeni sohbet",
  },
  "messages.empty": {
    de: "Noch keine Unterhaltungen. Schreib uns — der Assistent antwortet sofort, und bei Bedarf übernimmt jemand aus unserem Team.",
    en: "No conversations yet. Write to us — the assistant answers right away, and someone from our team takes over when needed.",
    ar: "لا توجد محادثات بعد. راسلنا — يجيب المساعد فورًا، ويتولّى أحد أعضاء فريقنا المحادثة عند الحاجة.",
    tr: "Henüz sohbet yok. Bize yazın — asistan hemen yanıtlar, gerektiğinde ekibimizden biri devralır.",
  },
  "messages.loadFailed": {
    de: "Die Nachrichten konnten nicht geladen werden.",
    en: "The messages could not be loaded.",
    ar: "تعذّر تحميل الرسائل.",
    tr: "Mesajlar yüklenemedi.",
  },
  "messages.conversationFrom": {
    de: "Unterhaltung vom {date}",
    en: "Conversation of {date}",
    ar: "محادثة بتاريخ {date}",
    tr: "{date} tarihli sohbet",
  },
  "messages.unread": {
    de: { one: "{count} ungelesen", other: "{count} ungelesen" },
    en: { one: "{count} unread", other: "{count} unread" },
    ar: {
      zero: "لا رسائل غير مقروءة", one: "رسالة واحدة غير مقروءة", two: "رسالتان غير مقروءتين",
      few: "{count} رسائل غير مقروءة", many: "{count} رسالة غير مقروءة", other: "{count} رسالة غير مقروءة",
    },
    tr: { one: "{count} okunmamış", other: "{count} okunmamış" },
  },
  "messages.you": { de: "Du", en: "You", ar: "أنت", tr: "Siz" },
  "messages.staff": {
    de: "Kundenservice", en: "Customer service", ar: "خدمة العملاء", tr: "Müşteri hizmetleri",
  },
  "messages.assistant": { de: "Assistent", en: "Assistant", ar: "المساعد", tr: "Asistan" },
  "messages.humanHandled": {
    de: "Mit unserem Team", en: "With our team", ar: "مع فريقنا", tr: "Ekibimizle",
  },
  "messages.assistantHandled": {
    de: "Mit dem Assistenten", en: "With the assistant", ar: "مع المساعد", tr: "Asistanla",
  },
  "messages.startHint": {
    de: "Schreib deine Frage unten. Der Assistent antwortet sofort; wenn er nicht weiterweiß, übernimmt jemand aus unserem Team.",
    en: "Write your question below. The assistant answers right away; if it cannot help, someone from our team takes over.",
    ar: "اكتب سؤالك في الأسفل. يجيب المساعد فورًا، وإن لم يستطع المساعدة يتولّى أحد أعضاء فريقنا.",
    tr: "Sorunuzu aşağıya yazın. Asistan hemen yanıtlar; yardımcı olamazsa ekibimizden biri devralır.",
  },
  "messages.composerLabel": { de: "Nachricht", en: "Message", ar: "الرسالة", tr: "Mesaj" },
  "messages.placeholder": {
    de: "Nachricht schreiben…", en: "Write a message…", ar: "اكتب رسالة…", tr: "Bir mesaj yazın…",
  },
  "messages.send": { de: "Senden", en: "Send", ar: "إرسال", tr: "Gönder" },
  "messages.sendFailed": {
    de: "Die Nachricht konnte nicht gesendet werden. Bitte versuch es erneut.",
    en: "The message could not be sent. Please try again.",
    ar: "تعذّر إرسال الرسالة. الرجاء المحاولة مرّة أخرى.",
    tr: "Mesaj gönderilemedi. Lütfen tekrar deneyin.",
  },

  // ── Support inbox (staff) ───────────────────────────────────────────
  "admin.nav.messages": { de: "Nachrichten", en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "inbox.filterLabel": {
    de: "Unterhaltungen filtern", en: "Filter conversations", ar: "تصفية المحادثات", tr: "Sohbetleri filtrele",
  },
  "inbox.filterAll": { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  "inbox.filterWaiting": { de: "Wartend", en: "Waiting", ar: "بانتظار الرد", tr: "Bekleyen" },
  "inbox.filterAssistant": { de: "Assistent", en: "Assistant", ar: "المساعد", tr: "Asistan" },
  "inbox.filterHuman": { de: "Übernommen", en: "Taken over", ar: "تم تولّيها", tr: "Devralınan" },
  "inbox.waiting": { de: "Wartet auf Antwort", en: "Waiting for a reply", ar: "بانتظار الرد", tr: "Yanıt bekliyor" },
  "inbox.waitingCount": {
    de: { one: "{count} Unterhaltung wartet", other: "{count} Unterhaltungen warten" },
    en: { one: "{count} conversation waiting", other: "{count} conversations waiting" },
    ar: {
      zero: "لا توجد محادثات بانتظار الرد", one: "محادثة واحدة بانتظار الرد", two: "محادثتان بانتظار الرد",
      few: "{count} محادثات بانتظار الرد", many: "{count} محادثة بانتظار الرد", other: "{count} محادثة بانتظار الرد",
    },
    tr: { one: "{count} sohbet bekliyor", other: "{count} sohbet bekliyor" },
  },
  "inbox.visitor": {
    de: "Besucher (nicht angemeldet)", en: "Visitor (not signed in)", ar: "زائر (غير مسجّل الدخول)", tr: "Ziyaretçi (giriş yapmamış)",
  },
  "inbox.statusAssistant": {
    de: "Assistent antwortet", en: "Assistant answering", ar: "المساعد يجيب", tr: "Asistan yanıtlıyor",
  },
  "inbox.statusHuman": {
    de: "Übernommen von {name}", en: "Taken over by {name}", ar: "تولّاها {name}", tr: "{name} devraldı",
  },
  "inbox.statusHumanUnknown": { de: "Übernommen", en: "Taken over", ar: "تم تولّيها", tr: "Devralındı" },
  "inbox.empty": {
    de: "Keine Unterhaltungen in dieser Ansicht.",
    en: "No conversations in this view.",
    ar: "لا توجد محادثات في هذا العرض.",
    tr: "Bu görünümde sohbet yok.",
  },
  "inbox.selectHint": {
    de: "Wähle links eine Unterhaltung aus, um den Verlauf zu sehen.",
    en: "Pick a conversation to see its history.",
    ar: "اختر محادثة لعرض سجلّها.",
    tr: "Geçmişini görmek için bir sohbet seçin.",
  },
  "inbox.takeOver": { de: "Übernehmen", en: "Take over", ar: "تولّي المحادثة", tr: "Devral" },
  "inbox.takeOverHint": {
    de: "Danach antwortet der Assistent in dieser Unterhaltung nicht mehr.",
    en: "The assistant stops answering in this conversation.",
    ar: "بعد ذلك يتوقّف المساعد عن الرد في هذه المحادثة.",
    tr: "Bundan sonra asistan bu sohbette yanıt vermez.",
  },
  "inbox.takeOverFailed": {
    de: "Die Unterhaltung konnte nicht übernommen werden.",
    en: "The conversation could not be taken over.",
    ar: "تعذّر تولّي المحادثة.",
    tr: "Sohbet devralınamadı.",
  },
  "inbox.replyHint": {
    de: "Mit deiner Antwort übernimmst du die Unterhaltung; der Assistent schweigt dann.",
    en: "Replying takes the conversation over; the assistant then stays quiet.",
    ar: "بالرد تتولّى المحادثة، ويتوقّف المساعد عن الرد.",
    tr: "Yanıt verdiğinizde sohbeti devralırsınız; asistan artık yanıt vermez.",
  },
  "inbox.readOnly": {
    de: "Du kannst Unterhaltungen lesen, aber nicht beantworten.",
    en: "You can read conversations but not answer them.",
    ar: "يمكنك قراءة المحادثات لكن لا يمكنك الرد عليها.",
    tr: "Sohbetleri okuyabilir ama yanıtlayamazsınız.",
  },

  // ── Admin ───────────────────────────────────────────────────────────
  "admin.orders": { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  "admin.customer": { de: "Kunde", en: "Customer", ar: "العميل", tr: "Müşteri" },
  "admin.allStatuses": {
    de: "Alle Status", en: "All statuses", ar: "كل الحالات", tr: "Tüm durumlar",
  },
  "admin.searchOrders": {
    de: "Referenz, Name oder E-Mail…",
    en: "Reference, name or email…",
    ar: "الرقم المرجعي أو الاسم أو البريد…",
    tr: "Referans, isim veya e-posta…",
  },
  "admin.noOrders": {
    de: "Keine Aufträge gefunden.", en: "No orders found.", ar: "لم يُعثر على طلبات.", tr: "Sipariş bulunamadı.",
  },
  "admin.live": { de: "Live", en: "Live", ar: "مباشر", tr: "Canlı" },
  "admin.connecting": {
    de: "Verbinde…", en: "Connecting…", ar: "جارٍ الاتصال…", tr: "Bağlanıyor…",
  },
  "admin.offline": {
    de: "Nicht verbunden", en: "Not connected", ar: "غير متّصل", tr: "Bağlı değil",
  },
  "admin.autoRefresh": {
    de: "Aktualisiert alle {seconds} s",
    en: "Refreshes every {seconds}s",
    ar: "يتحدّث كل {seconds} ثانية",
    tr: "{seconds} sn'de bir yenilenir",
  },
  "admin.users": { de: "Nutzer", en: "Users", ar: "المستخدمون", tr: "Kullanıcılar" },
  "admin.allRoles": {
    de: "Alle Rollen", en: "All roles", ar: "كل الأدوار", tr: "Tüm roller",
  },
  "admin.noUsers": {
    de: "Keine Nutzer gefunden.", en: "No users found.", ar: "لم يُعثر على مستخدمين.", tr: "Kullanıcı bulunamadı.",
  },
  "admin.searchUsers": {
    de: "Name oder E-Mail…", en: "Name or email…", ar: "الاسم أو البريد…", tr: "İsim veya e-posta…",
  },
  "admin.lastLogin": {
    de: "Zuletzt angemeldet", en: "Last sign-in", ar: "آخر تسجيل دخول", tr: "Son giriş",
  },
  "admin.yourself": { de: "Du selbst", en: "Yourself", ar: "أنت", tr: "Kendiniz" },
  "admin.role": { de: "Rolle", en: "Role", ar: "الدور", tr: "Rol" },
  "admin.roleOf": {
    de: "Rolle von {name}", en: "Role of {name}", ar: "دور {name}", tr: "{name} rolü",
  },
  "admin.block": { de: "Sperren", en: "Block", ar: "حظر", tr: "Engelle" },
  "admin.unblock": { de: "Entsperren", en: "Unblock", ar: "رفع الحظر", tr: "Engeli kaldır" },
  "admin.blocking": { de: "Wird gesperrt…", en: "Blocking…", ar: "جارٍ الحظر…", tr: "Engelleniyor…" },
  "admin.blockTitle": {
    de: "{name} sperren?", en: "Block {name}?", ar: "حظر {name}؟", tr: "{name} engellensin mi?",
  },
  "admin.blockBody": {
    de: "{email} kann sich dann nicht mehr anmelden, und alle aktiven Sitzungen werden sofort beendet. Bestehende Aufträge bleiben erhalten.",
    en: "{email} will no longer be able to sign in, and all active sessions end immediately. Existing orders are kept.",
    ar: "لن يتمكّن {email} من تسجيل الدخول، وستُنهى كل الجلسات النشطة فورًا. أمّا الطلبات القائمة فتبقى.",
    tr: "{email} artık giriş yapamayacak ve tüm aktif oturumlar hemen sona erecek. Mevcut siparişler korunur.",
  },
  "admin.blockConfirm": {
    de: "Ja, sperren", en: "Yes, block", ar: "نعم، احظر", tr: "Evet, engelle",
  },
  // ── Roles ───────────────────────────────────────────────────────────
  // One entry per role in `@mon/core`. A role without a label here
  // renders as its raw key on the admin screen, which is how the removed
  // "staff" entry was spotted.
  "admin.role.customer": { de: "Kunde", en: "Customer", ar: "عميل", tr: "Müşteri" },
  "admin.role.customer_service": {
    de: "Kundenservice", en: "Customer service", ar: "خدمة العملاء", tr: "Müşteri hizmetleri",
  },
  "admin.role.operator": {
    de: "Disponent", en: "Operator", ar: "مشغّل", tr: "Operatör",
  },
  "admin.role.admin": {
    de: "Administrator", en: "Administrator", ar: "مدير", tr: "Yönetici",
  },
  "admin.role.super_admin": {
    de: "Super-Administrator", en: "Super administrator", ar: "مدير عام", tr: "Süper yönetici",
  },

  // What each role may actually do, shown under the role selector so the
  // choice is made on capability rather than on a job title.
  "admin.roleHint.customer": {
    de: "Sieht nur die eigenen Aufträge. Keine Rechte im Backoffice.",
    en: "Sees only their own orders. No back-office rights.",
    ar: "يرى طلباته فقط. لا صلاحيات في لوحة الإدارة.",
    tr: "Yalnızca kendi siparişlerini görür. Yönetim panelinde yetkisi yoktur.",
  },
  "admin.roleHint.customer_service": {
    de: "Sieht Aufträge und Angebote, beantwortet Nachrichten und Beschwerden.",
    en: "Sees orders and quotes, answers messages and complaints.",
    ar: "يرى الطلبات وعروض الأسعار، ويردّ على الرسائل والشكاوى.",
    tr: "Siparişleri ve teklifleri görür, mesaj ve şikâyetleri yanıtlar.",
  },
  "admin.roleHint.operator": {
    de: "Plant Aufträge, ändert Status, pflegt Verfügbarkeiten und moderiert Bewertungen.",
    en: "Plans orders, changes their status, maintains availability and moderates reviews.",
    ar: "يخطّط الطلبات ويغيّر حالتها ويحدّث المواعيد المتاحة ويراجع التقييمات.",
    tr: "Siparişleri planlar, durumlarını değiştirir, müsaitliği günceller ve yorumları denetler.",
  },
  "admin.roleHint.admin": {
    de: "Alles vom Disponenten, dazu Preise, Zahlungen, Website und Nutzerverwaltung.",
    en: "Everything an operator may do, plus pricing, payments, the website and user administration.",
    ar: "كل صلاحيات المشغّل، إضافةً إلى الأسعار والمدفوعات والموقع وإدارة المستخدمين.",
    tr: "Operatörün tüm yetkileri ile birlikte fiyatlar, ödemeler, web sitesi ve kullanıcı yönetimi.",
  },
  "admin.roleHint.super_admin": {
    de: "Vollzugriff, einschließlich der Vergabe von Rollen.",
    en: "Full access, including handing out roles.",
    ar: "وصول كامل، بما في ذلك منح الأدوار.",
    tr: "Rol atama dâhil tam erişim.",
  },

  // ── User administration ─────────────────────────────────────────────
  "admin.usersLead": {
    de: "Die Rolle bestimmt, was jemand im Backoffice darf. Jede Änderung wird protokolliert.",
    en: "A role decides what someone may do in the back office. Every change is recorded.",
    ar: "يحدّد الدور ما يمكن للشخص فعله في لوحة الإدارة. وكل تغيير يُسجَّل.",
    tr: "Rol, bir kişinin yönetim panelinde ne yapabileceğini belirler. Her değişiklik kayda geçer.",
  },
  "admin.joined": {
    de: "Angelegt", en: "Joined", ar: "تاريخ الانضمام", tr: "Katılım",
  },
  "admin.newUser": {
    de: "Neuer Nutzer", en: "New user", ar: "مستخدم جديد", tr: "Yeni kullanıcı",
  },
  "admin.newUserBody": {
    de: "Das Passwort wird erzeugt und nur einmal angezeigt. Gib es weiter — es lässt sich später nicht erneut abrufen.",
    en: "The password is generated and shown once. Pass it on — it cannot be retrieved again later.",
    ar: "يُنشأ كلمة المرور وتُعرض مرّة واحدة فقط. سلّمها للشخص المعني — لا يمكن استرجاعها لاحقًا.",
    tr: "Parola oluşturulur ve yalnızca bir kez gösterilir. İlgili kişiye iletin — sonradan tekrar alınamaz.",
  },
  "admin.createUser": {
    de: "Nutzer anlegen", en: "Create user", ar: "إنشاء المستخدم", tr: "Kullanıcı oluştur",
  },
  "admin.created": {
    de: "{email} wurde angelegt.",
    en: "{email} has been created.",
    ar: "تم إنشاء {email}.",
    tr: "{email} oluşturuldu.",
  },
  "admin.createdWithPassword": {
    de: "{email} wurde angelegt. Passwort (wird nur einmal angezeigt): {password}",
    en: "{email} has been created. Password (shown only once): {password}",
    ar: "تم إنشاء {email}. كلمة المرور (تُعرض مرّة واحدة فقط): {password}",
    tr: "{email} oluşturuldu. Parola (yalnızca bir kez gösterilir): {password}",
  },
  "admin.createFailed": {
    de: "Der Nutzer konnte nicht angelegt werden.",
    en: "The user could not be created.",
    ar: "تعذّر إنشاء المستخدم.",
    tr: "Kullanıcı oluşturulamadı.",
  },
  "admin.billing": { de: "Abrechnung", en: "Billing", ar: "المحاسبة", tr: "Muhasebe" },
  "admin.paymentsReceived": {
    de: "Eingegangene Zahlungen", en: "Payments received", ar: "المدفوعات المستلمة", tr: "Alınan ödemeler",
  },
  "admin.bookingCount": {
    de: { one: "Buchung", other: "Buchungen" },
    en: { one: "booking", other: "bookings" },
    ar: { zero: "لا حجوزات", one: "حجز واحد", two: "حجزان", few: "حجوزات", many: "حجزًا", other: "حجز" },
    tr: { one: "kayıt", other: "kayıt" },
  },
  "admin.billingNote": {
    de: "Summiert werden alle im gewählten Monat verbuchten Zahlungen — Anzahlungen, Restzahlungen und Erstattungen. Die Abgrenzung erfolgt in der Zeitzone Europe/Berlin.",
    en: "All payments booked in the selected month are summed — deposits, balances and refunds. Month boundaries use the Europe/Berlin time zone.",
    ar: "تُجمع كل المدفوعات المسجّلة في الشهر المختار — الدفعات المقدّمة والمتبقّية والمستردّات. وتُحسب حدود الشهر بتوقيت Europe/Berlin.",
    tr: "Seçilen ayda kaydedilen tüm ödemeler toplanır — kaporalar, bakiyeler ve iadeler. Ay sınırları Europe/Berlin saat dilimine göredir.",
  },
  "admin.noPayments": {
    de: "In diesem Monat wurden noch keine Zahlungen verbucht.",
    en: "No payments have been booked this month yet.",
    ar: "لم تُسجَّل أي مدفوعات في هذا الشهر بعد.",
    tr: "Bu ay henüz ödeme kaydedilmedi.",
  },
  "admin.reportFailed": {
    de: "Der Bericht konnte nicht geladen werden.",
    en: "The report could not be loaded.",
    ar: "تعذّر تحميل التقرير.",
    tr: "Rapor yüklenemedi.",
  },
  "admin.usersFailed": {
    de: "Die Nutzer konnten nicht geladen werden.",
    en: "The users could not be loaded.",
    ar: "تعذّر تحميل المستخدمين.",
    tr: "Kullanıcılar yüklenemedi.",
  },
  "admin.ordersFailed": {
    de: "Die Aufträge konnten nicht geladen werden.",
    en: "The orders could not be loaded.",
    ar: "تعذّر تحميل الطلبات.",
    tr: "Siparişler yüklenemedi.",
  },
  "admin.statusChangeFailed": {
    de: "Der Status konnte nicht geändert werden.",
    en: "The status could not be changed.",
    ar: "تعذّر تغيير الحالة.",
    tr: "Durum değiştirilemedi.",
  },
  "admin.updateFailed": {
    de: "Die Änderung konnte nicht gespeichert werden.",
    en: "The change could not be saved.",
    ar: "تعذّر حفظ التغيير.",
    tr: "Değişiklik kaydedilemedi.",
  },

  // ── Chat ────────────────────────────────────────────────────────────
  "chat.title": {
    de: "m.on-Assistent", en: "m.on Assistant", ar: "مساعد m.on", tr: "m.on Asistanı",
  },
  "chat.subtitle": {
    de: "Antwortet meist sofort",
    en: "Usually replies instantly",
    ar: "يجيب فورًا عادةً",
    tr: "Genellikle anında yanıtlar",
  },
  "chat.greeting": {
    de: "Hallo! Wie kann ich dir helfen?",
    en: "Hello! How can I help?",
    ar: "مرحبًا! كيف أستطيع مساعدتك؟",
    tr: "Merhaba! Nasıl yardımcı olabilirim?",
  },
  "chat.placeholder": {
    de: "Deine Frage…", en: "Your question…", ar: "سؤالك…", tr: "Sorunuz…",
  },
  "chat.send": { de: "Senden", en: "Send", ar: "إرسال", tr: "Gönder" },
  "chat.open": { de: "Chat öffnen", en: "Open chat", ar: "فتح المحادثة", tr: "Sohbeti aç" },
  "chat.close": { de: "Chat schließen", en: "Close chat", ar: "إغلاق المحادثة", tr: "Sohbeti kapat" },
  "chat.humanTakeover": {
    de: "Ein Mitarbeiter übernimmt jetzt das Gespräch.",
    en: "A team member is taking over the conversation.",
    ar: "أحد الموظّفين يتولّى المحادثة الآن.",
    tr: "Bir ekip üyesi görüşmeyi devralıyor.",
  },
  "chat.failed": {
    de: "Verbindung fehlgeschlagen. Bitte versuch es erneut.",
    en: "Connection failed. Please try again.",
    ar: "فشل الاتصال. الرجاء المحاولة مرّة أخرى.",
    tr: "Bağlantı başarısız. Lütfen tekrar deneyin.",
  },


  // ── Dashboard ───────────────────────────────────────────────────────
  "dash.overview": {
    de: "Übersicht", en: "Dashboard Overview", ar: "نظرة عامة", tr: "Genel Bakış",
  },
  "dash.mainNavigation": {
    de: "Hauptnavigation", en: "Main navigation", ar: "التنقّل الرئيسي", tr: "Ana gezinme",
  },
  "dash.searchPlaceholder": {
    de: "Aufträge, Angebote…", en: "Search orders, quotes…", ar: "ابحث في الطلبات والعروض…", tr: "Sipariş, teklif ara…",
  },
  "dash.notifications": {
    de: "Benachrichtigungen", en: "Notifications", ar: "الإشعارات", tr: "Bildirimler",
  },
  "dash.savedQuotes": {
    de: "Gespeicherte Angebote", en: "Saved Quotes", ar: "العروض المحفوظة", tr: "Kayıtlı Teklifler",
  },
  "dash.documents": { de: "Dokumente", en: "Documents", ar: "المستندات", tr: "Belgeler" },
  "dash.messages": { de: "Nachrichten", en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "dash.payment": { de: "Zahlungen", en: "Payment", ar: "المدفوعات", tr: "Ödeme" },
  "dash.settings": { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },
  "dash.welcome": {
    de: "Willkommen zurück, {name}!",
    en: "Welcome back, {name}!",
    ar: "أهلاً بعودتك، {name}!",
    tr: "Tekrar hoş geldiniz, {name}!",
  },
  "dash.welcomeWithMove": {
    de: "Dein nächster Termin ist am {date}. Alles ist vorbereitet.",
    en: "Your next move is scheduled for {date}. Everything is on track.",
    ar: "موعدك القادم في {date}. كل شيء جاهز.",
    tr: "Bir sonraki taşınmanız {date} tarihinde. Her şey hazır.",
  },
  "dash.welcomeNoMove": {
    de: "Du hast aktuell keinen anstehenden Termin.",
    en: "You have no upcoming move scheduled.",
    ar: "لا يوجد لديك موعد قادم حاليًا.",
    tr: "Planlanmış yaklaşan taşınmanız yok.",
  },
  "dash.trackMove": {
    de: "Termin verfolgen", en: "Track Live Move", ar: "تتبّع الموعد", tr: "Taşınmayı İzle",
  },
  "dash.activeOrders": {
    de: "Aktive Aufträge", en: "Active Orders", ar: "الطلبات النشطة", tr: "Aktif Siparişler",
  },
  "dash.pendingQuotes": {
    de: "Offene Angebote", en: "Pending Quotes", ar: "عروض معلّقة", tr: "Bekleyen Teklifler",
  },
  "dash.completedMoves": {
    de: "Abgeschlossen", en: "Completed Moves", ar: "طلبات مكتملة", tr: "Tamamlanan Taşınmalar",
  },
  "dash.unreadMessages": {
    de: "Ungelesene Nachrichten", en: "Unread Messages", ar: "رسائل غير مقروءة", tr: "Okunmamış Mesajlar",
  },
  "dash.inTransit": {
    de: { one: "{count} in Bearbeitung", other: "{count} in Bearbeitung" },
    en: { one: "{count} in progress", other: "{count} in progress" },
    ar: {
      zero: "لا شيء قيد التنفيذ", one: "واحد قيد التنفيذ", two: "اثنان قيد التنفيذ",
      few: "{count} قيد التنفيذ", many: "{count} قيد التنفيذ", other: "{count} قيد التنفيذ",
    },
    tr: { one: "{count} devam ediyor", other: "{count} devam ediyor" },
  },
  "dash.awaitingConfirmation": {
    de: "Warten auf Bestätigung", en: "Awaiting confirmation", ar: "بانتظار التأكيد", tr: "Onay bekliyor",
  },
  "dash.sinceJoining": {
    de: "Seit Beitritt", en: "Since joining", ar: "منذ الانضمام", tr: "Katılımdan beri",
  },
  "dash.fromSupport": {
    de: "Vom Support-Team", en: "From support team", ar: "من فريق الدعم", tr: "Destek ekibinden",
  },
  "dash.recentOrders": {
    de: "Letzte Aufträge", en: "Recent Orders", ar: "أحدث الطلبات", tr: "Son Siparişler",
  },
  "dash.viewAll": { de: "Alle ansehen", en: "View All", ar: "عرض الكل", tr: "Tümünü Gör" },
  "dash.nextAppointment": {
    de: "Nächster Termin", en: "Next Appointment", ar: "الموعد القادم", tr: "Sonraki Randevu",
  },
  "dash.estimatedArrival": {
    de: "Voraussichtliche Ankunft 08:00–09:00",
    en: "Est. arrival 08:00 – 09:00",
    ar: "الوصول المتوقّع 08:00–09:00",
    tr: "Tahmini varış 08:00–09:00",
  },
  "dash.assignedTeam": {
    de: "Zugewiesenes Team", en: "Assigned team", ar: "الفريق المكلّف", tr: "Atanan ekip",
  },
  "dash.contactTeam": {
    de: "Team kontaktieren", en: "Contact Team", ar: "تواصل مع الفريق", tr: "Ekibe Ulaş",
  },
  "dash.viewDetails": {
    de: "Details ansehen", en: "View Details", ar: "عرض التفاصيل", tr: "Detayları Gör",
  },
  "dash.noAppointment": {
    de: "Kein anstehender Termin.", en: "No upcoming appointment.", ar: "لا موعد قادم.", tr: "Yaklaşan randevu yok.",
  },

  // ── Website control ─────────────────────────────────────────────────
  "site.title": {
    de: "Website", en: "Website", ar: "الموقع", tr: "Web Sitesi",
  },
  "site.lead": {
    de: "Ändere Farben, Branding, Kontaktdaten und Texte der Website — ohne Deployment. Preise und rechtliche Seiten sind bewusst nicht hier bearbeitbar.",
    en: "Change the website's colours, branding, contact details and copy — with no deploy. Prices and legal pages are deliberately not editable here.",
    ar: "غيّر ألوان الموقع وهويته وبيانات التواصل والنصوص — بلا نشر جديد. الأسعار والصفحات القانونية غير قابلة للتعديل هنا عن قصد.",
    tr: "Web sitesinin renklerini, markasını, iletişim bilgilerini ve metinlerini dağıtım yapmadan değiştirin. Fiyatlar ve yasal sayfalar burada bilinçli olarak düzenlenemez.",
  },
  "site.tab.theme": { de: "Farben", en: "Theme", ar: "الألوان", tr: "Tema" },
  "site.tab.brand": { de: "Marke", en: "Brand", ar: "الهوية", tr: "Marka" },
  "site.tab.contact": { de: "Kontakt", en: "Contact", ar: "التواصل", tr: "İletişim" },
  "site.tab.seo": { de: "SEO", en: "SEO", ar: "تحسين الظهور", tr: "SEO" },
  "site.tab.content": { de: "Inhalte", en: "Content", ar: "المحتوى", tr: "İçerik" },
  // The FAQ tab of the Website editor.
  "site.tab.faq": { de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS" },
  "site.faq.hint": {
    de: "Fragen werden pro Sprache gepflegt. Die Startseite zeigt die ersten vier veröffentlichten.",
    en: "Questions are maintained per language. The home page shows the first four published ones.",
    ar: "تُحرَّر الأسئلة لكل لغة على حدة. تعرض الصفحة الرئيسية أول أربعة أسئلة منشورة.",
    tr: "Sorular her dil için ayrı tutulur. Ana sayfa yayındaki ilk dördünü gösterir.",
  },
  "site.faq.question": { de: "Frage", en: "Question", ar: "السؤال", tr: "Soru" },
  "site.faq.answer": { de: "Antwort", en: "Answer", ar: "الإجابة", tr: "Cevap" },
  "site.faq.category": { de: "Thema", en: "Topic", ar: "الموضوع", tr: "Konu" },
  "site.faq.position": { de: "Nr. {n}", en: "No. {n}", ar: "رقم {n}", tr: "No. {n}" },
  "site.faq.empty": {
    de: "In dieser Sprache gibt es noch keine Fragen.",
    en: "There are no questions in this language yet.",
    ar: "لا توجد أسئلة بهذه اللغة بعد.",
    tr: "Bu dilde henüz soru yok.",
  },
  "site.faq.addTitle": { de: "Neue Frage", en: "New question", ar: "سؤال جديد", tr: "Yeni soru" },
  "site.faq.add": { de: "Frage hinzufügen", en: "Add question", ar: "إضافة السؤال", tr: "Soruyu ekle" },
  "site.faq.adding": { de: "Wird hinzugefügt …", en: "Adding…", ar: "جارٍ الإضافة…", tr: "Ekleniyor…" },
  "site.faq.added": {
    de: "Frage hinzugefügt — auf der Website in einigen Minuten sichtbar.",
    en: "Question added — visible on the website within a few minutes.",
    ar: "أُضيف السؤال — يظهر على الموقع خلال دقائق.",
    tr: "Soru eklendi — birkaç dakika içinde sitede görünür.",
  },
  "site.faq.tooShort": {
    de: "Frage und Antwort brauchen jeweils mindestens 3 Zeichen.",
    en: "The question and the answer each need at least 3 characters.",
    ar: "يحتاج كل من السؤال والإجابة إلى 3 أحرف على الأقل.",
    tr: "Soru ve cevabın her biri en az 3 karakter olmalıdır.",
  },
  "site.faq.moveUp": { de: "Nach oben", en: "Move up", ar: "تحريك للأعلى", tr: "Yukarı taşı" },
  "site.faq.moveDown": { de: "Nach unten", en: "Move down", ar: "تحريك للأسفل", tr: "Aşağı taşı" },
  "site.faq.reordered": {
    de: "Reihenfolge gespeichert.",
    en: "Order saved.",
    ar: "حُفظ الترتيب.",
    tr: "Sıralama kaydedildi.",
  },
  "site.faq.delete": { de: "Löschen", en: "Delete", ar: "حذف", tr: "Sil" },
  "site.faq.deleteTitle": {
    de: "Diese Frage löschen?",
    en: "Delete this question?",
    ar: "حذف هذا السؤال؟",
    tr: "Bu soru silinsin mi?",
  },
  "site.faq.deleteBody": {
    de: "„{question}“ verschwindet von der Website. Das lässt sich nicht rückgängig machen — soll sie nur vorübergehend fehlen, nimm stattdessen den Haken bei „Veröffentlicht“ heraus.",
    en: "“{question}” will be removed from the website. This cannot be undone — to hide it only for a while, untick “Published” instead.",
    ar: "سيُحذف «{question}» من الموقع ولا يمكن التراجع عن ذلك — لإخفائه مؤقتاً فقط، أزِل علامة «منشور» بدلاً من ذلك.",
    tr: "“{question}” web sitesinden kaldırılacak. Bu geri alınamaz — yalnızca bir süre gizlemek için bunun yerine “Yayında” işaretini kaldırın.",
  },
  "site.faq.deleting": { de: "Wird gelöscht …", en: "Deleting…", ar: "جارٍ الحذف…", tr: "Siliniyor…" },
  "site.faq.deleted": { de: "Frage gelöscht.", en: "Question deleted.", ar: "حُذف السؤال.", tr: "Soru silindi." },
  "site.section.home": { de: "Startseite", en: "Home page", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
  "site.section.auth": { de: "Anmeldeseite", en: "Login page", ar: "صفحة الدخول", tr: "Giriş sayfası" },
  "site.section.footer": { de: "Fußzeile", en: "Footer", ar: "التذييل", tr: "Alt bilgi" },
  // One per `content_blocks` section the seeds create. Without them the
  // editor printed the raw key ("site.section.service-moving") as the heading.
  "site.section.service-moving": { de: "Umzug", en: "Moving page", ar: "صفحة النقل", tr: "Taşınma sayfası" },
  "site.section.service-cleaning": { de: "Reinigung", en: "Cleaning page", ar: "صفحة التنظيف", tr: "Temizlik sayfası" },
  "site.section.service-disposal": { de: "Entrümpelung", en: "Clearance page", ar: "صفحة الإخلاء", tr: "Boşaltma sayfası" },
  "site.section.page-about": { de: "Über uns", en: "About us", ar: "من نحن", tr: "Hakkımızda" },
  "site.section.page-blog": { de: "Ratgeber", en: "Guide / blog", ar: "المدوّنة", tr: "Rehber / blog" },
  "site.section.page-contact": { de: "Kontakt", en: "Contact", ar: "اتصل بنا", tr: "İletişim" },
  "site.section.page-faq": { de: "FAQ", en: "FAQ page", ar: "صفحة الأسئلة الشائعة", tr: "SSS sayfası" },
  "site.section.page-for-business": { de: "Für Unternehmen", en: "For business", ar: "للشركات", tr: "Kurumsal" },
  "site.section.page-how-it-works": { de: "So funktioniert's", en: "How it works", ar: "كيف نعمل", tr: "Nasıl çalışır" },
  "site.section.page-partner": { de: "Partner werden", en: "Become a partner", ar: "كن شريكًا", tr: "Partner olun" },
  "site.section.page-pricing": { de: "Preise", en: "Pricing", ar: "الأسعار", tr: "Fiyatlar" },
  "site.section.page-reviews": { de: "Kundenstimmen", en: "Reviews", ar: "آراء العملاء", tr: "Müşteri yorumları" },
  "site.section.planner": { de: "Buchungsplaner", en: "Booking planner", ar: "مخطّط الحجز", tr: "Rezervasyon planlayıcı" },
  "site.section.page-imprint": { de: "Impressum", en: "Imprint", ar: "بيانات الناشر", tr: "Künye" },
  "site.section.page-privacy": { de: "Datenschutz", en: "Privacy", ar: "الخصوصية", tr: "Gizlilik" },
  "site.section.page-terms": { de: "AGB", en: "Terms", ar: "الشروط والأحكام", tr: "Şartlar" },
  "site.section.page-legal-cookie": { de: "Cookies", en: "Cookies", ar: "ملفات تعريف الارتباط", tr: "Çerezler" },
  "site.published": { de: "Veröffentlicht", en: "Published", ar: "منشور", tr: "Yayında" },
  "site.saved": {
    de: "Gespeichert — auf der Website in bis zu einer Minute sichtbar.",
    en: "Saved — live on the website within a minute.",
    ar: "تم الحفظ — سيظهر على الموقع خلال دقيقة.",
    tr: "Kaydedildi — bir dakika içinde sitede görünür.",
  },
  "site.resetTheme": {
    de: "Farben zurücksetzen", en: "Reset theme", ar: "إعادة الألوان", tr: "Temayı sıfırla",
  },
  "site.themeReset": {
    de: "Die Farben wurden auf die Standardwerte zurückgesetzt.",
    en: "The theme has been restored to its defaults.",
    ar: "أُعيدت الألوان إلى قيمها الافتراضية.",
    tr: "Tema varsayılanlarına döndürüldü.",
  },
  "site.contentHint": {
    de: "Texte werden pro Sprache gepflegt.",
    en: "Copy is maintained per language.",
    ar: "النصوص تُحرَّر لكل لغة على حدة.",
    tr: "Metinler her dil için ayrı tutulur.",
  },
  "site.image.hint": {
    de: "Ein Pfad unter /images/ oder eine https://-Adresse. Fotos gelten für alle Sprachen.",
    en: "A path under /images/ or an https:// address. Photos apply to every language.",
    ar: "مسار ضمن ‎/images/‎ أو عنوان يبدأ بـ ‎https://‎. تسري الصور على جميع اللغات.",
    tr: "/images/ altında bir yol veya https:// adresi. Fotoğraflar tüm diller için geçerlidir.",
  },
  "site.image.empty": {
    de: "Kein Foto gesetzt — die Seite zeigt ihr eigenes oder keins.",
    en: "No photo set — the page shows its own, or none.",
    ar: "لا توجد صورة — تعرض الصفحة صورتها الافتراضية أو لا شيء.",
    tr: "Fotoğraf yok — sayfa kendi fotoğrafını gösterir ya da hiç göstermez.",
  },
  "site.image.invalid": {
    de: "Nur Pfade unter /images/ oder https://-Adressen sind erlaubt.",
    en: "Only paths under /images/ or https:// addresses are allowed.",
    ar: "يُسمح فقط بمسارات ضمن ‎/images/‎ أو بعناوين ‎https://‎.",
    tr: "Yalnızca /images/ altındaki yollar veya https:// adresleri kabul edilir.",
  },
  "site.image.broken": {
    de: "Das Bild konnte nicht geladen werden.",
    en: "The image could not be loaded.",
    ar: "تعذّر تحميل الصورة.",
    tr: "Görsel yüklenemedi.",
  },
  "site.image.reset": {
    de: "Standardfoto", en: "Default photo", ar: "الصورة الافتراضية", tr: "Varsayılan fotoğraf",
  },
  "site.image.wasReset": {
    de: "Das Standardfoto ist wiederhergestellt.",
    en: "The default photo has been restored.",
    ar: "أُعيدت الصورة الافتراضية.",
    tr: "Varsayılan fotoğraf geri yüklendi.",
  },
  // The upload control's strings. The dashboard has used these since photo
  // uploads arrived; the revert to frame 139:676 dropped them by accident,
  // which left the raw keys on the buttons.
  "site.image.upload": {
    de: "Foto hochladen", en: "Upload photo", ar: "رفع صورة", tr: "Fotoğraf yükle",
  },
  "site.image.uploading": {
    de: "Wird hochgeladen …", en: "Uploading…", ar: "جارٍ الرفع…", tr: "Yükleniyor…",
  },
  "site.image.uploaded": {
    de: "Hochgeladen. Mit ✓ übernehmen Sie das Foto auf die Seite.",
    en: "Uploaded. Press ✓ to put the photo on the page.",
    ar: "تم الرفع. اضغط ✓ لوضع الصورة على الصفحة.",
    tr: "Yüklendi. Fotoğrafı sayfaya koymak için ✓ tuşuna basın.",
  },
  "site.image.uploadTooLarge": {
    de: "Das Foto ist größer als 8 MB.",
    en: "The photo is larger than 8 MB.",
    ar: "الصورة أكبر من 8 ميغابايت.",
    tr: "Fotoğraf 8 MB'tan büyük.",
  },
  "site.image.uploadType": {
    de: "Nur JPEG-, PNG-, WebP- oder AVIF-Fotos sind möglich.",
    en: "Only JPEG, PNG, WebP or AVIF photos can be uploaded.",
    ar: "يمكن رفع صور JPEG أو PNG أو WebP أو AVIF فقط.",
    tr: "Yalnızca JPEG, PNG, WebP veya AVIF fotoğraflar yüklenebilir.",
  },
  "site.image.uploadFailed": {
    de: "Das Hochladen ist fehlgeschlagen.",
    en: "The upload failed.",
    ar: "فشل الرفع.",
    tr: "Yükleme başarısız oldu.",
  },
  // A video field: the homepage strip's clips. Uploading… and the failure
  // message are the photo field's.
  "site.video.hint": {
    de: "Ein Pfad unter /videos/ oder eine https://-Adresse: MP4 oder WebM, eine kurze Schleife ohne Ton. Halten Sie die Datei klein (wenige MB) – sie läuft bei jedem Besuch. Videos gelten für alle Sprachen.",
    en: "A path under /videos/ or an https:// address: MP4 or WebM, a short loop without sound. Keep the file small (a few MB) — it plays on every visit. Videos apply to every language.",
    ar: "مسار ضمن ‎/videos/‎ أو عنوان يبدأ بـ ‎https://‎: بصيغة MP4 أو WebM، مقطع قصير متكرر بلا صوت. اجعل حجم الملف صغيرًا (بضعة ميغابايت)، فهو يُشغَّل في كل زيارة. تسري مقاطع الفيديو على جميع اللغات.",
    tr: "/videos/ altında bir yol veya https:// adresi: MP4 ya da WebM, sessiz kısa bir döngü. Dosyayı küçük tutun (birkaç MB) — her ziyarette oynatılır. Videolar tüm diller için geçerlidir.",
  },
  "site.video.empty": {
    de: "Kein Video gesetzt — die Seite zeigt das Standfoto.",
    en: "No video set — the page shows the poster photo.",
    ar: "لا يوجد فيديو — تعرض الصفحة الصورة الثابتة.",
    tr: "Video yok — sayfa kapak fotoğrafını gösterir.",
  },
  "site.video.invalid": {
    de: "Nur Pfade unter /videos/ oder https://-Adressen sind erlaubt.",
    en: "Only paths under /videos/ or https:// addresses are allowed.",
    ar: "يُسمح فقط بمسارات ضمن ‎/videos/‎ أو بعناوين ‎https://‎.",
    tr: "Yalnızca /videos/ altındaki yollar veya https:// adresleri kabul edilir.",
  },
  "site.video.broken": {
    de: "Das Video konnte nicht geladen werden.",
    en: "The video could not be loaded.",
    ar: "تعذّر تحميل الفيديو.",
    tr: "Video yüklenemedi.",
  },
  "site.video.upload": {
    de: "Video hochladen", en: "Upload video", ar: "رفع فيديو", tr: "Video yükle",
  },
  "site.video.uploaded": {
    de: "Hochgeladen. Mit ✓ übernehmen Sie das Video auf die Seite.",
    en: "Uploaded. Press ✓ to put the video on the page.",
    ar: "تم الرفع. اضغط ✓ لوضع الفيديو على الصفحة.",
    tr: "Yüklendi. Videoyu sayfaya koymak için ✓ tuşuna basın.",
  },
  "site.video.uploadTooLarge": {
    de: "Das Video ist größer als 60 MB.",
    en: "The video is larger than 60 MB.",
    ar: "الفيديو أكبر من 60 ميغابايت.",
    tr: "Video 60 MB'tan büyük.",
  },
  "site.video.uploadType": {
    de: "Nur MP4- oder WebM-Videos sind möglich.",
    en: "Only MP4 or WebM videos can be uploaded.",
    ar: "يمكن رفع مقاطع فيديو MP4 أو WebM فقط.",
    tr: "Yalnızca MP4 veya WebM videolar yüklenebilir.",
  },
  "site.video.reset": {
    de: "Standard", en: "Default", ar: "الافتراضي", tr: "Varsayılan",
  },
  "site.video.wasReset": {
    de: "Das Video ist auf den Standard zurückgesetzt.",
    en: "The video is back to its default.",
    ar: "أُعيد الفيديو إلى الوضع الافتراضي.",
    tr: "Video varsayılana döndürüldü.",
  },
  "site.loadFailed": {
    de: "Die Website-Einstellungen konnten nicht geladen werden.",
    en: "The website settings could not be loaded.",
    ar: "تعذّر تحميل إعدادات الموقع.",
    tr: "Web sitesi ayarları yüklenemedi.",
  },

  // ── Footer ──────────────────────────────────────────────────────────
  "footer.rights": {
    de: "Alle Rechte vorbehalten.",
    en: "All rights reserved.",
    ar: "جميع الحقوق محفوظة.",
    tr: "Tüm hakları saklıdır.",
  },
  "footer.tagline": {
    de: "Umzug, Entsorgung & Reinigung zum transparenten Festpreis.",
    en: "Moving, disposal & cleaning at a transparent fixed price.",
    ar: "نقل وتخلّص من الأثاث وتنظيف بسعر ثابت وشفّاف.",
    tr: "Şeffaf sabit fiyatla nakliye, tasfiye ve temizlik.",
  },
  /**
   * The footer's fourth column heading.
   *
   * The M.io footer draws three columns — brand, Services, Contact & Support —
   * and no frame links the guide, partner, business or how-it-works pages from
   * anywhere. This heading is therefore the one string here with no source in
   * the design; the four labels under it already existed in this catalogue,
   * because the pages themselves use them.
   */
  "footer.companyTitle": {
    de: "Unternehmen", en: "Company", ar: "الشركة", tr: "Şirket",
  },


  // ── Admin navigation ────────────────────────────────────────────────
  "admin.nav.dashboard": { de: "Dashboard", en: "Dashboard", ar: "لوحة التحكّم", tr: "Panel" },
  "admin.nav.users": { de: "Nutzer", en: "Users", ar: "المستخدمون", tr: "Kullanıcılar" },
  "admin.nav.leads": { de: "Leads", en: "Leads", ar: "العملاء المحتملون", tr: "Potansiyeller" },
  "admin.nav.orders": { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  "admin.nav.dispatch": { de: "Disposition", en: "Dispatch", ar: "التوزيع", tr: "Sevkiyat" },
  "admin.nav.pricing": { de: "Preise", en: "Pricing", ar: "التسعير", tr: "Fiyatlandırma" },
  "admin.nav.payments": { de: "Zahlungen", en: "Payments", ar: "المدفوعات", tr: "Ödemeler" },
  "admin.nav.operations": { de: "Betrieb", en: "Operations", ar: "العمليات", tr: "Operasyon" },
  "admin.nav.partners": { de: "Partner", en: "Partners", ar: "الشركاء", tr: "Ortaklar" },
  "admin.nav.quality": { de: "Qualität", en: "Quality", ar: "الجودة", tr: "Kalite" },
  "admin.nav.analytics": { de: "Analytics", en: "Analytics", ar: "التحليلات", tr: "Analitik" },
  "admin.nav.logs": { de: "Protokoll", en: "Logs", ar: "السجلّات", tr: "Kayıtlar" },
  "admin.nav.settings": { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },

  // ── Audit log ───────────────────────────────────────────────────────
  "admin.logs.lead": {
    de: "Jede Änderung im Backoffice – wer sie gemacht hat und wann. Einträge lassen sich weder bearbeiten noch löschen.",
    en: "Every change made in the back office — who made it and when. Entries cannot be edited or deleted.",
    ar: "كل تغيير أُجري في لوحة الإدارة، ومن أجراه ومتى. لا يمكن تعديل السجلات أو حذفها.",
    tr: "Yönetim panelinde yapılan her değişiklik; kimin ve ne zaman yaptığı. Kayıtlar düzenlenemez veya silinemez.",
  },
  "admin.logs.time": { de: "Zeitpunkt", en: "Time", ar: "الوقت", tr: "Zaman" },
  "admin.logs.actor": { de: "Ausgeführt von", en: "Actor", ar: "المنفِّذ", tr: "Kişi" },
  "admin.logs.action": { de: "Aktion", en: "Action", ar: "الإجراء", tr: "İşlem" },
  "admin.logs.target": { de: "Objekt", en: "Target", ar: "الهدف", tr: "Hedef" },
  "admin.logs.showDetails": {
    de: "Details anzeigen", en: "Show details", ar: "عرض التفاصيل", tr: "Ayrıntıları göster",
  },
  "admin.logs.hideDetails": {
    de: "Details ausblenden", en: "Hide details", ar: "إخفاء التفاصيل", tr: "Ayrıntıları gizle",
  },
  "admin.logs.allActions": {
    de: "Alle Aktionen", en: "All actions", ar: "كل الإجراءات", tr: "Tüm işlemler",
  },
  "admin.logs.allActors": { de: "Alle Personen", en: "Everyone", ar: "الجميع", tr: "Herkes" },
  "admin.logs.from": { de: "Von", en: "From", ar: "من", tr: "Başlangıç" },
  "admin.logs.to": { de: "Bis", en: "To", ar: "إلى", tr: "Bitiş" },
  "admin.logs.searchPlaceholder": {
    de: "Aktion, Objekt oder E-Mail suchen",
    en: "Search action, target or email",
    ar: "ابحث عن إجراء أو هدف أو بريد إلكتروني",
    tr: "İşlem, hedef veya e-posta ara",
  },
  "admin.logs.clearFilters": {
    de: "Filter zurücksetzen", en: "Clear filters", ar: "مسح عوامل التصفية", tr: "Filtreleri temizle",
  },
  "admin.logs.empty": {
    de: "Keine Einträge gefunden.", en: "No entries found.", ar: "لا توجد سجلات.", tr: "Kayıt bulunamadı.",
  },
  "admin.logs.loadFailed": {
    de: "Das Protokoll konnte nicht geladen werden.",
    en: "The log could not be loaded.",
    ar: "تعذّر تحميل السجل.",
    tr: "Kayıtlar yüklenemedi.",
  },
  "admin.logs.loadMore": {
    de: "Weitere laden", en: "Load more", ar: "تحميل المزيد", tr: "Daha fazla yükle",
  },
  "admin.logs.shown": {
    de: { one: "{count} Eintrag angezeigt", other: "{count} Einträge angezeigt" },
    en: { one: "{count} entry shown", other: "{count} entries shown" },
    ar: {
      zero: "لا سجلات معروضة", one: "سجل واحد معروض", two: "سجلان معروضان",
      few: "{count} سجلات معروضة", many: "{count} سجلًا معروضًا", other: "{count} سجل معروض",
    },
    tr: { one: "{count} kayıt gösteriliyor", other: "{count} kayıt gösteriliyor" },
  },
  "admin.logs.system": { de: "System", en: "System", ar: "النظام", tr: "Sistem" },
  "admin.logs.unknownActor": { de: "Unbekannt", en: "Unknown", ar: "غير معروف", tr: "Bilinmiyor" },
  "admin.logs.changes": { de: "Änderungen", en: "Changes", ar: "التغييرات", tr: "Değişiklikler" },
  "admin.logs.noChanges": {
    de: "Zu diesem Eintrag wurden keine Änderungsdaten gespeichert.",
    en: "No change data was recorded for this entry.",
    ar: "لم تُسجَّل بيانات تغيير لهذا السجل.",
    tr: "Bu kayıt için değişiklik verisi saklanmadı.",
  },
  "admin.logs.ip": { de: "IP-Adresse", en: "IP address", ar: "عنوان IP", tr: "IP adresi" },
  "admin.logs.requestId": { de: "Anfrage-ID", en: "Request ID", ar: "معرّف الطلب", tr: "İstek kimliği" },
  "admin.logs.entryId": { de: "Eintrags-ID", en: "Entry ID", ar: "معرّف السجل", tr: "Kayıt kimliği" },
  "admin.logs.rawAction": { de: "Schlüssel", en: "Key", ar: "المفتاح", tr: "Anahtar" },

  // One per action key the API writes. A key missing here is shown raw
  // rather than hidden, so a new action is readable before it is translated.
  "admin.logs.action.catalog.created": {
    de: "Katalogeintrag angelegt", en: "Catalogue item created", ar: "أُنشئ عنصر في الكتالوج", tr: "Katalog öğesi oluşturuldu",
  },
  "admin.logs.action.catalog.updated": {
    de: "Katalogeintrag geändert", en: "Catalogue item updated", ar: "عُدّل عنصر في الكتالوج", tr: "Katalog öğesi güncellendi",
  },
  "admin.logs.action.catalog.deactivated": {
    de: "Katalogeintrag deaktiviert", en: "Catalogue item deactivated", ar: "عُطّل عنصر في الكتالوج", tr: "Katalog öğesi devre dışı bırakıldı",
  },
  "admin.logs.action.complaint.status_changed": {
    de: "Reklamationsstatus geändert", en: "Complaint status changed", ar: "تغيّرت حالة الشكوى", tr: "Şikâyet durumu değiştirildi",
  },
  "admin.logs.action.discount.created": {
    de: "Rabattcode angelegt", en: "Discount code created", ar: "أُنشئ رمز خصم", tr: "İndirim kodu oluşturuldu",
  },
  "admin.logs.action.discount.enabled": {
    de: "Rabattcode aktiviert", en: "Discount code enabled", ar: "فُعّل رمز الخصم", tr: "İndirim kodu etkinleştirildi",
  },
  "admin.logs.action.discount.disabled": {
    de: "Rabattcode deaktiviert", en: "Discount code disabled", ar: "عُطّل رمز الخصم", tr: "İndirim kodu devre dışı bırakıldı",
  },
  "admin.logs.action.mail.test_sent": {
    de: "Test-E-Mail gesendet", en: "Test email sent", ar: "أُرسل بريد تجريبي", tr: "Test e-postası gönderildi",
  },
  "admin.logs.action.order.created": {
    de: "Auftrag angelegt", en: "Order created", ar: "أُنشئ طلب", tr: "Sipariş oluşturuldu",
  },
  "admin.logs.action.order.status_changed": {
    de: "Auftragsstatus geändert", en: "Order status changed", ar: "تغيّرت حالة الطلب", tr: "Sipariş durumu değiştirildi",
  },
  "admin.logs.action.payment.recorded": {
    de: "Zahlung erfasst", en: "Payment recorded", ar: "سُجّلت دفعة", tr: "Ödeme kaydedildi",
  },
  "admin.logs.action.pricing.updated": {
    de: "Preise geändert", en: "Pricing updated", ar: "عُدّلت الأسعار", tr: "Fiyatlar güncellendi",
  },
  "admin.logs.action.review.moderated": {
    de: "Bewertung moderiert", en: "Review moderated", ar: "رُوجع تقييم", tr: "Yorum denetlendi",
  },
  "admin.logs.action.site.content_updated": {
    de: "Website-Text geändert", en: "Website content updated", ar: "عُدّل محتوى الموقع", tr: "Web sitesi içeriği güncellendi",
  },
  "admin.logs.action.site.image_uploaded": {
    de: "Bild hochgeladen", en: "Image uploaded", ar: "رُفعت صورة", tr: "Görsel yüklendi",
  },
  "admin.logs.action.site.video_uploaded": {
    de: "Video hochgeladen", en: "Video uploaded", ar: "رُفع فيديو", tr: "Video yüklendi",
  },
  "admin.logs.action.site.setting_updated": {
    de: "Website-Einstellung geändert", en: "Site setting updated", ar: "عُدّل إعداد الموقع", tr: "Site ayarı güncellendi",
  },
  "admin.logs.action.site.theme_reset": {
    de: "Design zurückgesetzt", en: "Theme reset", ar: "أُعيد ضبط التصميم", tr: "Tema sıfırlandı",
  },
  "admin.logs.action.user.created": {
    de: "Nutzer angelegt", en: "User created", ar: "أُنشئ مستخدم", tr: "Kullanıcı oluşturuldu",
  },
  "admin.logs.action.user.updated": {
    de: "Nutzer geändert", en: "User updated", ar: "عُدّل مستخدم", tr: "Kullanıcı güncellendi",
  },

  "admin.logs.entity.catalog_item": {
    de: "Katalogeintrag", en: "Catalogue item", ar: "عنصر كتالوج", tr: "Katalog öğesi",
  },
  "admin.logs.entity.complaint": { de: "Reklamation", en: "Complaint", ar: "شكوى", tr: "Şikâyet" },
  "admin.logs.entity.content_block": {
    de: "Inhaltsblock", en: "Content block", ar: "كتلة محتوى", tr: "İçerik bloğu",
  },
  "admin.logs.entity.discount_code": {
    de: "Rabattcode", en: "Discount code", ar: "رمز خصم", tr: "İndirim kodu",
  },
  "admin.logs.entity.mail": { de: "E-Mail", en: "Email", ar: "بريد إلكتروني", tr: "E-posta" },
  "admin.logs.entity.order": { de: "Auftrag", en: "Order", ar: "طلب", tr: "Sipariş" },
  "admin.logs.entity.price_setting": {
    de: "Preiseinstellung", en: "Price setting", ar: "إعداد السعر", tr: "Fiyat ayarı",
  },
  "admin.logs.entity.review": { de: "Bewertung", en: "Review", ar: "تقييم", tr: "Yorum" },
  "admin.logs.entity.site_setting": {
    de: "Website-Einstellung", en: "Site setting", ar: "إعداد الموقع", tr: "Site ayarı",
  },
  "admin.logs.entity.upload": { de: "Upload", en: "Upload", ar: "ملف مرفوع", tr: "Yükleme" },
  "admin.logs.entity.user": { de: "Nutzer", en: "User", ar: "مستخدم", tr: "Kullanıcı" },

  "dash.comingSoon": {
    de: "In Vorbereitung", en: "Coming soon", ar: "قريبًا", tr: "Yakında",
  },

  // ── My orders ───────────────────────────────────────────────────────
  "orders.allOrders": { de: "Alle Aufträge", en: "All Orders", ar: "كل الطلبات", tr: "Tüm Siparişler" },
  "orders.dateRange": { de: "Zeitraum", en: "Date range", ar: "الفترة", tr: "Tarih aralığı" },
  "orders.range.3m": {
    de: "Letzte 3 Monate", en: "Last 3 months", ar: "آخر 3 أشهر", tr: "Son 3 ay",
  },
  "orders.range.6m": {
    de: "Letzte 6 Monate", en: "Last 6 months", ar: "آخر 6 أشهر", tr: "Son 6 ay",
  },
  "orders.range.12m": {
    de: "Letzte 12 Monate", en: "Last 12 months", ar: "آخر 12 شهرًا", tr: "Son 12 ay",
  },
  "orders.range.all": {
    de: "Gesamter Zeitraum", en: "All time", ar: "كل الفترات", tr: "Tüm zamanlar",
  },
  "orders.searchPlaceholder": {
    de: "Auftrag suchen…", en: "Search orders…", ar: "ابحث في الطلبات…", tr: "Sipariş ara…",
  },
  "orders.dateCreated": {
    de: "Erstellt am", en: "Date Created", ar: "تاريخ الإنشاء", tr: "Oluşturulma",
  },
  "orders.amount": { de: "Betrag", en: "Amount", ar: "المبلغ", tr: "Tutar" },
  "orders.details": { de: "Details", en: "Details", ar: "التفاصيل", tr: "Detaylar" },
  "orders.showing": {
    de: "{from}–{to} von {total}",
    en: "Showing {from}–{to} of {total}",
    ar: "{from}–{to} من {total}",
    tr: "{total} kayıttan {from}–{to}",
  },
  "common.previous": { de: "Zurück", en: "Previous", ar: "السابق", tr: "Önceki" },

  // ── Order detail ────────────────────────────────────────────────────
  "orders.detailTitle": {
    de: "Auftragsdetails", en: "Order Detail View", ar: "تفاصيل الطلب", tr: "Sipariş Detayı",
  },
  "orders.downloadInvoice": {
    de: "Rechnung herunterladen", en: "Download Invoice", ar: "تنزيل الفاتورة", tr: "Fatura İndir",
  },
  "orders.invoicePending": {
    de: "Die Rechnung erscheint hier, sobald wir sie versendet haben.",
    en: "Your invoice appears here once we have sent it.",
    ar: "تظهر فاتورتك هنا بعد أن نرسلها.",
    tr: "Faturanız gönderildikten sonra burada görünür.",
  },
  "orders.invoice": {
    de: "Rechnung {number}", en: "Invoice {number}", ar: "الفاتورة {number}", tr: "Fatura {number}",
  },
  "orders.invoiceStatus.paid": { de: "Bezahlt", en: "Paid", ar: "مدفوعة", tr: "Ödendi" },
  "orders.invoiceStatus.open": { de: "Offen", en: "Open", ar: "مستحقة", tr: "Açık" },
  "orders.invoiceStatus.overdue": { de: "Überfällig", en: "Overdue", ar: "متأخرة", tr: "Gecikmiş" },
  "orders.reschedule": {
    de: "Termin verschieben", en: "Reschedule Move", ar: "تغيير الموعد", tr: "Tarihi Değiştir",
  },
  "orders.tab.overview": { de: "Übersicht", en: "Overview", ar: "نظرة عامة", tr: "Genel" },
  "orders.tab.documents": { de: "Dokumente", en: "Documents", ar: "المستندات", tr: "Belgeler" },
  "orders.tab.messages": { de: "Nachrichten", en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "orders.includedServices": {
    de: "Enthaltene Leistungen", en: "Included Services", ar: "الخدمات المشمولة", tr: "Dahil Hizmetler",
  },
  "orders.included.transport": {
    de: "Transport inklusive gesetzlicher Haftung",
    en: "Transport including statutory liability cover",
    ar: "النقل شاملاً المسؤولية القانونية",
    tr: "Yasal sorumluluk dahil taşıma",
  },
  "orders.included.crew": {
    de: "{count} Mitarbeiter vor Ort",
    en: "{count}-person crew on site",
    ar: "{count} من العمّال في الموقع",
    tr: "Sahada {count} kişilik ekip",
  },
  "orders.coordinates": {
    de: "Adressen", en: "Move Coordinates", ar: "عناوين النقل", tr: "Taşınma Adresleri",
  },
  "orders.origin": { de: "Start (A)", en: "Origin (A)", ar: "البداية (أ)", tr: "Başlangıç (A)" },
  "orders.destination": {
    de: "Ziel (B)", en: "Destination (B)", ar: "الوجهة (ب)", tr: "Varış (B)",
  },
  "orders.floorN": {
    de: "{n}. Etage", en: "Floor {n}", ar: "الطابق {n}", tr: "{n}. kat",
  },
  "orders.groundFloor": {
    de: "Erdgeschoss", en: "Ground floor", ar: "الطابق الأرضي", tr: "Zemin kat",
  },
  "orders.grandTotal": { de: "Gesamtsumme", en: "Grand Total", ar: "الإجمالي الكلّي", tr: "Genel Toplam" },
  "orders.depositPaid": {
    de: "Anzahlung erhalten", en: "Deposit Paid", ar: "الدفعة المقدّمة المسدَّدة", tr: "Ödenen Kapora",
  },
  "orders.remaining": {
    de: "Restbetrag", en: "Remaining Balance", ar: "المبلغ المتبقّي", tr: "Kalan Bakiye",
  },
  "orders.settleBalance": {
    de: "Restbetrag begleichen", en: "Settle Balance Now", ar: "سدّد المتبقّي الآن", tr: "Bakiyeyi Öde",
  },

  // ── Price breakdown line labels ─────────────────────────────────────
  "line.base_rate": { de: "Grundpreis", en: "Base Moving Fee", ar: "السعر الأساسي", tr: "Taban Ücret" },
  "line.area": { de: "Fläche", en: "Area", ar: "المساحة", tr: "Alan" },
  "line.selected_items": {
    de: "Positionen", en: "Selected items", ar: "العناصر المختارة", tr: "Seçilen kalemler",
  },
  "line.travel_long_distance": {
    de: "Zuschlag Fernumzug",
    en: "Surcharges (Long Distance)",
    ar: "بدل المسافات الطويلة",
    tr: "Uzun mesafe farkı",
  },
  "line.floor_surcharge": {
    de: "Etagenzuschlag", en: "Floor surcharge", ar: "بدل الطوابق", tr: "Kat farkı",
  },
  "line.travel": {
    de: "Entfernung", en: "Travel distance", ar: "المسافة", tr: "Mesafe farkı",
  },
  "line.packing_service": {
    de: "Verpackungsservice", en: "Packing Service Add-on", ar: "خدمة التغليف", tr: "Paketleme hizmeti",
  },
  "line.parking_zone": {
    de: "Halteverbotszone", en: "No-parking zone", ar: "منطقة حظر الوقوف", tr: "Park yasağı bölgesi",
  },
  "line.transport_insurance": {
    de: "Transportversicherung", en: "Transport insurance", ar: "تأمين النقل", tr: "Nakliye sigortası",
  },
  "line.crew_of_three": {
    de: "3. Mitarbeiter", en: "Third crew member", ar: "عامل ثالث", tr: "Üçüncü işçi",
  },
  "line.second_van": {
    de: "2. Transporter", en: "Second van", ar: "شاحنة ثانية", tr: "İkinci araç",
  },
  "line.saturday_surcharge": {
    de: "Samstagszuschlag", en: "Saturday surcharge", ar: "بدل السبت", tr: "Cumartesi farkı",
  },
  "line.business_discount": {
    de: "Gewerberabatt", en: "Business discount", ar: "خصم الشركات", tr: "Ticari indirim",
  },
  "line.discount_code": {
    de: "Rabattcode", en: "Discount code", ar: "كود الخصم", tr: "İndirim kodu",
  },
  "line.minimum_order_value": {
    de: "Mindestauftragswert", en: "Minimum order value", ar: "الحد الأدنى للطلب", tr: "Asgari sipariş tutarı",
  },
  "line.assembly": { de: "Möbelmontage", en: "Assembly", ar: "تركيب الأثاث", tr: "Montaj" },
  "line.disassembly": { de: "Möbeldemontage", en: "Disassembly", ar: "تفكيك الأثاث", tr: "Demontaj" },
  // Pricing version 2 (the booking prototype's lines).
  "line.stairs_from": {
    de: "Treppen, alte Wohnung (ohne Aufzug)", en: "Stairs, old home (no elevator)",
    ar: "الدرج في المنزل القديم (بدون مصعد)", tr: "Merdiven, eski ev (asansörsüz)",
  },
  "line.stairs_to": {
    de: "Treppen, neue Wohnung (ohne Aufzug)", en: "Stairs, new home (no elevator)",
    ar: "الدرج في المنزل الجديد (بدون مصعد)", tr: "Merdiven, yeni ev (asansörsüz)",
  },
  "line.volume": {
    de: "Transport Ihres Inventars", en: "Transport of your inventory",
    ar: "نقل أغراضك", tr: "Eşyalarınızın taşınması",
  },
  "line.volume_estimated": {
    de: "Transport (nach Fläche geschätzt)", en: "Transport (estimated by area)",
    ar: "النقل (تقدير حسب المساحة)", tr: "Taşıma (alana göre tahmini)",
  },
  "line.crew": { de: "Umzugsteam", en: "Moving crew", ar: "فريق النقل", tr: "Taşıma ekibi" },
  "line.dismantling": { de: "Möbelabbau", en: "Disassembly", ar: "فك الأثاث", tr: "Söküm" },
  "line.reassembly": { de: "Möbelaufbau", en: "Reassembly", ar: "تركيب الأثاث", tr: "Montaj" },
  "line.assembly_both": {
    de: "Ab- & Aufbau", en: "Disassembly & reassembly", ar: "فك وتركيب", tr: "Söküm ve montaj",
  },
  "line.packing": { de: "Packservice", en: "Professional packing", ar: "خدمة التغليف", tr: "Profesyonel paketleme" },
  "line.insurance": {
    de: "Transportversicherung", en: "Transport insurance", ar: "تأمين النقل", tr: "Taşıma sigortası",
  },
  // Every special item quoted from now on. The six keys below it stay for the
  // breakdowns already stored against old orders, which still have to render.
  "line.special": { de: "Sonderhandling · {name}", en: "Special handling · {name}", ar: "عناية خاصة · {name}", tr: "Özel taşıma · {name}" },
  "line.special_piano": { de: "Sonderhandling · Klavier", en: "Special handling · Piano", ar: "عناية خاصة · بيانو", tr: "Özel taşıma · Piyano" },
  "line.special_safe": { de: "Sonderhandling · Tresor", en: "Special handling · Safe", ar: "عناية خاصة · خزنة", tr: "Özel taşıma · Kasa" },
  "line.special_aquarium": { de: "Sonderhandling · Aquarium", en: "Special handling · Aquarium", ar: "عناية خاصة · حوض أسماك", tr: "Özel taşıma · Akvaryum" },
  "line.special_gym": { de: "Sonderhandling · Fitnessgeräte", en: "Special handling · Gym equipment", ar: "عناية خاصة · أجهزة رياضية", tr: "Özel taşıma · Spor aletleri" },
  "line.special_heavy": { de: "Sonderhandling · Schwere Teile", en: "Special handling · Heavy items", ar: "عناية خاصة · قطع ثقيلة", tr: "Özel taşıma · Ağır eşyalar" },
  "line.special_artwork": { de: "Sonderhandling · Kunst & Spiegel", en: "Special handling · Artwork & mirrors", ar: "عناية خاصة · لوحات ومرايا", tr: "Özel taşıma · Sanat eserleri ve aynalar" },
  "line.saturday": { de: "Samstagszuschlag", en: "Saturday surcharge", ar: "رسوم يوم السبت", tr: "Cumartesi ek ücreti" },
  "line.holiday_surcharge": { de: "Feiertagszuschlag", en: "Public holiday surcharge", ar: "رسوم العطلة الرسمية", tr: "Resmî tatil ek ücreti" },
  "line.zone_surcharge": { de: "Anfahrtszuschlag", en: "Travel surcharge", ar: "رسوم الانتقال", tr: "Yol ek ücreti" },
  "line.cleaning_area": { de: "Umzugsreinigung", en: "Moving clean", ar: "تنظيف الانتقال", tr: "Taşınma temizliği" },
  "line.windows_standard": { de: "Standardfenster", en: "Standard windows", ar: "شبابيك عادية", tr: "Standart pencereler" },
  "line.windows_patio": { de: "Balkon- / Terrassentüren", en: "Balcony / patio doors", ar: "أبواب بلكون أو تراس", tr: "Balkon / teras kapıları" },
  "line.windows_large": { de: "Große Verglasung", en: "Large glass", ar: "زجاج كبير", tr: "Büyük camlar" },
  "line.windows_roof": { de: "Dachfenster", en: "Roof windows", ar: "شبابيك السقف", tr: "Çatı pencereleri" },

  "nav.openMenu": {
    de: "Menü öffnen", en: "Open menu", ar: "افتح القائمة", tr: "Menüyü aç",
  },
  "nav.closeMenu": {
    de: "Menü schließen", en: "Close menu", ar: "أغلق القائمة", tr: "Menüyü kapat",
  },

  // ── Calculator: the ten-step wizard ─────────────────────────────────
  // The heading of each screen, as the design writes it.
  "calc.step.service": {
    de: "Wählen Sie Ihre Leistung", en: "Select your required services",
    ar: "اختر الخدمة التي تحتاجها", tr: "İhtiyacınız olan hizmeti seçin",
  },
  "calc.step.customer": {
    de: "Privat oder gewerblich?", en: "Private or business?",
    ar: "شخصي أم تجاري؟", tr: "Bireysel mi, kurumsal mı?",
  },
  "calc.step.route": {
    de: "Kundenart & Adressen", en: "Customer type & Route details",
    ar: "نوع العميل وتفاصيل المسار", tr: "Müşteri tipi ve güzergâh",
  },
  "calc.step.property": {
    de: "Objekt- und Ladedetails", en: "Property & Loading Details",
    ar: "تفاصيل العقار والتحميل", tr: "Mülk ve yükleme detayları",
  },
  "calc.step.volume": {
    de: "Schätzen Sie Ihr Transportvolumen", en: "Estimate your cargo volume",
    ar: "قدّر حجم الشحنة", tr: "Taşınacak hacmi tahmin edin",
  },
  "calc.step.addons": {
    de: "Optionale Zusatzleistungen", en: "Optional Add-on Services",
    ar: "خدمات إضافية اختيارية", tr: "İsteğe bağlı ek hizmetler",
  },
  "calc.step.workers": {
    de: "Team und Transportmittel", en: "Workers & Transport Resources",
    ar: "الفريق ووسائل النقل", tr: "Ekip ve nakliye kaynakları",
  },
  "calc.step.special": {
    de: "Montage und Sonderbehandlung", en: "Assembly & Special Handling",
    ar: "التركيب والمعالجة الخاصة", tr: "Montaj ve özel taşıma",
  },
  "calc.step.photos": {
    de: "Visuelles Inventar & Fotos", en: "Visual Inventory & Photos",
    ar: "جرد مصوَّر وصور", tr: "Görsel envanter ve fotoğraflar",
  },
  "calc.step.date": {
    de: "Wunschtermin & Zeitfenster", en: "Preferred Date & Time Window",
    ar: "التاريخ المفضّل ونافذة الوصول", tr: "Tercih edilen tarih ve zaman aralığı",
  },
  "calc.step.review": {
    de: "Letzte Prüfung", en: "Final Review",
    ar: "المراجعة النهائية", tr: "Son kontrol",
  },

  // The short name of each step in the progress rail.
  "calc.rail.service": {
    de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler",
  },
  "calc.rail.route": {
    de: "Adressen", en: "Addresses", ar: "العناوين", tr: "Adresler",
  },
  "calc.rail.property": {
    de: "Objekte", en: "Properties", ar: "العقارات", tr: "Mülkler",
  },
  "calc.rail.volume": {
    de: "Volumen", en: "Volume", ar: "الحجم", tr: "Hacim",
  },
  "calc.rail.addons": {
    de: "Zusatzleistungen", en: "Add-ons", ar: "الإضافات", tr: "Ek hizmetler",
  },
  "calc.rail.workers": {
    de: "Team", en: "Workers", ar: "الفريق", tr: "Ekip",
  },
  "calc.rail.special": {
    de: "Montage", en: "Special", ar: "خاص", tr: "Özel",
  },
  "calc.rail.photos": {
    de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar",
  },
  "calc.rail.date": {
    de: "Termin", en: "Date", ar: "التاريخ", tr: "Tarih",
  },
  "calc.rail.review": {
    de: "Prüfung", en: "Review", ar: "المراجعة", tr: "Özet",
  },

  // The line under each heading that says what the step is for.
  "calc.lead.service": {
    de: "Wählen Sie die Leistung, die Sie brauchen. Mehrere auf einmal? Schreiben Sie uns, wir kombinieren sie.",
    en: "Choose the service you need. Need several at once? Write to us and we will combine them.",
    ar: "اختر الخدمة التي تحتاجها. تحتاج أكثر من واحدة؟ راسلنا وسنجمعها لك.",
    tr: "İhtiyacınız olan hizmeti seçin. Birden fazlası mı gerekiyor? Bize yazın, birleştirelim.",
  },
  "calc.lead.route": {
    de: "Bitte geben Sie an, ob es ein privater oder gewerblicher Umzug ist, und nennen Sie die Adressen.",
    en: "Please specify if this is a private or commercial move and provide the locations.",
    ar: "حدّد ما إذا كان النقل شخصياً أم تجارياً، ثم أدخل العناوين.",
    tr: "Taşınmanın bireysel mi ticari mi olduğunu belirtin ve adresleri girin.",
  },
  "calc.lead.property": {
    de: "Angaben zu beiden Adressen verhindern Verzögerungen und unerwartete Kosten.",
    en: "Specify details for both locations to prevent delays or unexpected charges.",
    ar: "أدخل تفاصيل الموقعين لتفادي التأخير أو رسوم غير متوقّعة.",
    tr: "Gecikmeleri ve beklenmedik ücretleri önlemek için her iki adresin detaylarını girin.",
  },
  "calc.lead.volume": {
    de: "Wie sollen wir das Volumen berechnen? Nach Fläche oder Stück für Stück.",
    en: "How would you like to calculate your volume? Choose by area or by itemised list.",
    ar: "كيف تريد حساب الحجم؟ حسب المساحة أو بقائمة الأغراض.",
    tr: "Hacmi nasıl hesaplayalım? Alana göre veya eşya listesiyle.",
  },
  "calc.lead.addons": {
    de: "Ergänzen Sie Ihren Umzug um Zusatzleistungen. Der Preis aktualisiert sich dabei.",
    en: "Customise your move with extra services. The price updates as you choose.",
    ar: "خصّص نقلتك بخدمات إضافية. يتحدّث السعر مع كل اختيار.",
    tr: "Taşınmanızı ek hizmetlerle özelleştirin. Fiyat seçiminizle birlikte güncellenir.",
  },
  "calc.lead.workers": {
    de: "Wählen Sie die Teamgröße und ob ein zweiter Transporter nötig ist.",
    en: "Choose how many movers come and whether a second van is needed.",
    ar: "اختر عدد العمّال وهل تحتاج مركبة ثانية.",
    tr: "Kaç taşıyıcı geleceğini ve ikinci araç gerekip gerekmediğini seçin.",
  },
  "calc.lead.special": {
    de: "Sagen Sie uns, welche Möbel ab- und wieder aufgebaut werden müssen.",
    en: "Tell us which furniture has to be taken apart and rebuilt.",
    ar: "أخبرنا أي أثاث يحتاج فكّاً وإعادة تركيب.",
    tr: "Hangi mobilyaların sökülüp yeniden kurulacağını belirtin.",
  },
  "calc.lead.photos": {
    de: "Zeigen Sie uns sperrige Möbel oder ein enges Treppenhaus, damit der Preis am Umzugstag hält.",
    en: "Show us awkward furniture or a tight stairwell so the price holds on moving day.",
    ar: "أرِنا الأثاث الصعب أو الدرج الضيّق ليبقى السعر ثابتاً يوم النقل.",
    tr: "Zor mobilyaları veya dar merdiveni gösterin ki fiyat taşınma günü değişmesin.",
  },
  "calc.lead.date": {
    de: "Wählen Sie im Verfügbarkeitskalender einen Termin und das gewünschte Zeitfenster.",
    en: "Pick a move date from our availability calendar and choose the arrival window.",
    ar: "اختر تاريخ النقل من تقويم التوفّر ثم نافذة الوصول.",
    tr: "Uygunluk takviminden bir tarih ve varış aralığını seçin.",
  },
  "calc.lead.review": {
    de: "Prüfen Sie Ihre Angaben, dann berechnen wir Ihren Festpreis.",
    en: "Check your answers, then we will calculate your fixed price.",
    ar: "راجع إجاباتك، ثم نحسب سعرك الثابت.",
    tr: "Yanıtlarınızı kontrol edin, ardından sabit fiyatınızı hesaplayalım.",
  },

  "calc.stepOf": {
    de: "Schritt {current} von {total}", en: "Step {current} of {total}",
    ar: "الخطوة {current} من {total}", tr: "Adım {current}/{total}",
  },

  // The name on each service card, and the line of copy under it.
  "calc.service.movingName": {
    de: "Umzugsservice", en: "Moving Service",
    ar: "خدمة النقل", tr: "Nakliye hizmeti",
  },
  "calc.service.disposalName": {
    de: "Entrümpelung", en: "Property Clearance",
    ar: "إخلاء العقار", tr: "Eşya boşaltma",
  },
  "calc.service.cleaningName": {
    de: "Premium-Reinigung", en: "Premium Cleaning",
    ar: "تنظيف ممتاز", tr: "Premium temizlik",
  },
  "calc.service.movingHint": {
    de: "Professionelles Packen, Transport und Aufbau Ihrer Einrichtung.",
    en: "Professional packing, transport and setup of your belongings.",
    ar: "تغليف ونقل وتركيب احترافي لأغراضك.",
    tr: "Eşyalarınızın profesyonelce paketlenmesi, taşınması ve kurulumu.",
  },
  "calc.service.disposalHint": {
    de: "Umweltgerechte Entsorgung, Kellerentrümpelung und besenreine Übergabe.",
    en: "Eco-friendly disposal, cellar clearance and a sweeping clean.",
    ar: "تخلّص صديق للبيئة، إخلاء الأقبية وتسليم نظيف.",
    tr: "Çevre dostu bertaraf, bodrum boşaltma ve süpürge temizliği.",
  },
  "calc.service.cleaningHint": {
    de: "Übergabereinigung mit garantierter Abnahme durch den Vermieter.",
    en: "Handover cleaning with guaranteed acceptance from your landlord.",
    ar: "تنظيف التسليم مع ضمان قبول المالك.",
    tr: "Ev sahibinin kabulü garantili teslim temizliği.",
  },

  "calc.customer.private": {
    de: "Privatkunde", en: "Private Customer", ar: "عميل خاص", tr: "Bireysel müşteri",
  },
  "calc.customer.privateHint": {
    de: "Rechnung auf Ihren Namen", en: "Invoiced to you personally",
    ar: "فاتورة باسمك", tr: "Fatura şahsınıza",
  },
  "calc.customer.business": {
    de: "Gewerblich / Büro", en: "Commercial / Office",
    ar: "تجاري / مكتب", tr: "Ticari / Ofis",
  },
  "calc.customer.businessHint": {
    de: "Mit Firmenrabatt und USt-Ausweis",
    en: "Business discount, VAT itemised",
    ar: "خصم الشركات وضريبة مفصّلة",
    tr: "Kurumsal indirim, KDV ayrıntılı",
  },

  "calc.addressHint": {
    de: "Straße, Hausnummer, PLZ und Ort",
    en: "Street, number, postcode and city",
    ar: "الشارع والرقم والرمز البريدي والمدينة",
    tr: "Sokak, numara, posta kodu ve şehir",
  },
  "calc.addressPlaceholder": {
    de: "Königsallee 1, 40212 Düsseldorf",
    en: "Königsallee 1, 40212 Düsseldorf",
    ar: "Königsallee 1, 40212 Düsseldorf",
    tr: "Königsallee 1, 40212 Düsseldorf",
  },
  "calc.distanceNote": {
    de: "Die Entfernung berechnen wir selbst — ein Aufschlag entsteht erst ab 50 km.",
    en: "We work out the distance ourselves; a surcharge only applies beyond 50 km.",
    ar: "نحسب المسافة بأنفسنا، والرسوم الإضافية تبدأ بعد 50 كم.",
    tr: "Mesafeyi biz hesaplarız; ek ücret yalnızca 50 km sonrası için geçerlidir.",
  },

  "calc.method": {
    de: "Wie möchten Sie rechnen?", en: "How would you like to estimate?",
    ar: "كيف تريد الحساب؟", tr: "Nasıl hesaplayalım?",
  },
  "calc.methodArea": {
    de: "Nach Fläche", en: "By area", ar: "حسب المساحة", tr: "Alana göre",
  },
  "calc.methodAreaHint": {
    de: "Schnell — Quadratmeter genügen", en: "Quick — square metres are enough",
    ar: "سريع — المساحة تكفي", tr: "Hızlı — metrekare yeterli",
  },
  "calc.methodItems": {
    de: "Nach Gegenständen", en: "By items",
    ar: "حسب الأغراض", tr: "Eşyaya göre",
  },
  "calc.methodItemsHint": {
    de: "Genauer — Sie wählen jedes Stück", en: "More precise — you pick each piece",
    ar: "أدقّ — تختار كل قطعة", tr: "Daha kesin — her parçayı seçersiniz",
  },
  "calc.areaHint": {
    de: "Die Wohnfläche, nicht die Grundstücksfläche.",
    en: "The living area, not the plot.",
    ar: "مساحة السكن، لا مساحة الأرض.",
    tr: "Yaşam alanı, arsa değil.",
  },

  "calc.packingHint": {
    de: "Komplettservice mit hochwertigem Packpapier, Luftpolsterfolie und besonders stabilen Kartons.",
    en: "Full service pack including premium wrapping paper, bubble wrap and extra-strength cartons.",
    ar: "خدمة تغليف كاملة تشمل ورق تغليف فاخر وفقاعات هوائية وصناديق شديدة التحمّل.",
    tr: "Kaliteli ambalaj kâğıdı, balonlu naylon ve ekstra dayanıklı kolileri içeren tam paketleme.",
  },
  "calc.parkingZoneHint": {
    de: "Wir richten an beiden Adressen eine amtliche Halteverbotszone ein, damit schnell geladen werden kann.",
    en: "We set up an official holding zone in front of both locations to keep loading quick.",
    ar: "نجهّز منطقة حظر وقوف رسمية أمام الموقعين ليتم التحميل بسرعة.",
    tr: "Yüklemenin hızlı olması için her iki adresin önüne resmi park yasağı alanı kurarız.",
  },
  "calc.insuranceHint": {
    de: "Erweiterter Schutz bis 50.000 € für besonders wertvolles Eigentum.",
    en: "Upgraded protection of up to €50,000 for high-value personal assets.",
    ar: "تغطية موسّعة حتى 50.000 يورو للممتلكات عالية القيمة.",
    tr: "Yüksek değerli eşyalar için 50.000 €'ya kadar genişletilmiş koruma.",
  },

  "calc.crewSize": {
    de: "Wie viele Mitarbeiter?", en: "How many movers?",
    ar: "كم عاملاً؟", tr: "Kaç kişi?",
  },
  "calc.crewTwo": { de: "2 Mitarbeiter", en: "2 movers", ar: "عاملان", tr: "2 kişi" },
  "calc.crewTwoHint": {
    de: "Standard für bis zu 3 Zimmer", en: "Standard for up to 3 rooms",
    ar: "المعتاد حتى 3 غرف", tr: "3 odaya kadar standart",
  },
  "calc.crewThree": { de: "3 Mitarbeiter", en: "3 movers", ar: "ثلاثة عمّال", tr: "3 kişi" },
  "calc.crewThreeHint": {
    de: "Schneller, bei großen Wohnungen günstiger",
    en: "Faster, and cheaper on large homes",
    ar: "أسرع، وأوفر للشقق الكبيرة",
    tr: "Daha hızlı, büyük evlerde daha uygun",
  },
  "calc.secondVan": {
    de: "Zweiter Transporter", en: "Second van",
    ar: "شاحنة ثانية", tr: "İkinci araç",
  },
  "calc.secondVanHint": {
    de: "Für alles über etwa 100 m² in einer Fahrt.",
    en: "Everything above roughly 100 m² in one trip.",
    ar: "لكل ما يزيد عن 100 م² في رحلة واحدة.",
    tr: "Yaklaşık 100 m² üzeri her şey tek seferde.",
  },

  "calc.specialHint": {
    de: "Möbel, die auf- oder abgebaut werden müssen.",
    en: "Furniture that needs assembling or taking apart.",
    ar: "أثاث يحتاج تركيباً أو فكّاً.",
    tr: "Montaj veya demontaj gereken mobilyalar.",
  },
  "calc.specialEmpty": {
    de: "Wählen Sie zuerst Gegenstände im vorherigen Schritt.",
    en: "Pick some items in the previous step first.",
    ar: "اختر أغراضاً في الخطوة السابقة أولاً.",
    tr: "Önce bir önceki adımda eşya seçin.",
  },

  "calc.photosHint": {
    de: "Fotos helfen uns, den Preis vorab zu bestätigen.",
    en: "Photos help us confirm the price in advance.",
    ar: "الصور تساعدنا على تأكيد السعر مسبقاً.",
    tr: "Fotoğraflar fiyatı önceden onaylamamıza yardımcı olur.",
  },
  "calc.photosChoose": {
    de: "Fotos auswählen", en: "Choose photos",
    ar: "اختر صوراً", tr: "Fotoğraf seç",
  },
  "calc.photosNotUploaded": {
    de: "Hinweis: Fotos werden noch nicht hochgeladen. Bringen Sie sie bitte zum Termin mit.",
    en: "Note: photos are not uploaded yet. Please bring them to the appointment.",
    ar: "ملاحظة: الصور لا تُرفع بعد. الرجاء إحضارها في الموعد.",
    tr: "Not: fotoğraflar henüz yüklenmiyor. Lütfen randevuya getirin.",
  },

  "calc.dateHint": {
    de: "Frühestens morgen.", en: "Tomorrow at the earliest.",
    ar: "غداً على أقرب تقدير.", tr: "En erken yarın.",
  },
  "calc.discountHint": {
    de: "Falls Sie einen haben.", en: "If you have one.",
    ar: "إن كان لديك واحد.", tr: "Varsa.",
  },

  "calc.getPrice": {
    de: "Preis berechnen", en: "Calculate my price",
    ar: "احسب السعر", tr: "Fiyatı hesapla",
  },
  "calc.pricing": {
    de: "Wird berechnet…", en: "Calculating…",
    ar: "يجري الحساب…", tr: "Hesaplanıyor…",
  },
  "calc.quoteTitle": {
    de: "Ihr Festpreis", en: "Your confirmed price",
    ar: "سعرك المؤكَّد", tr: "Kesin fiyatınız",
  },
  "calc.vatIncluded": {
    de: "Inklusive Mehrwertsteuer. Keine versteckten Kosten.",
    en: "VAT included. No hidden costs.",
    ar: "شامل ضريبة القيمة المضافة. بدون تكاليف خفية.",
    tr: "KDV dahil. Gizli maliyet yok.",
  },
  "calc.reviewTitle": {
    de: "Wir prüfen die Details", en: "We are checking the details",
    ar: "نحن نراجع التفاصيل", tr: "Detayları kontrol ediyoruz",
  },
  "calc.reviewBody": {
    de: "Ihr Auftrag braucht einen kurzen Blick von uns. Wir melden uns innerhalb eines Werktags mit einem Festpreis.",
    en: "Your job needs a quick look from us. We will come back within one working day with a fixed price.",
    ar: "طلبك يحتاج نظرة سريعة منّا. سنعود إليك خلال يوم عمل واحد بسعر ثابت.",
    tr: "İşiniz kısa bir incelemeye ihtiyaç duyuyor. Bir iş günü içinde sabit fiyatla döneceğiz.",
  },
  "calc.editAnswers": {
    de: "Angaben ändern", en: "Change my answers",
    ar: "عدّل إجاباتي", tr: "Yanıtlarımı değiştir",
  },
  "calc.bookNow": {
    de: "Jetzt verbindlich buchen", en: "Book this now",
    ar: "احجز الآن", tr: "Şimdi rezervasyon yap",
  },

  // ── Calculator: the five result chips and the confirmation screen ────
  "calc.tab.route": {
    de: "Routendetails", en: "Route Details",
    ar: "تفاصيل المسار", tr: "Rota Detayları",
  },
  "calc.tab.inventory": {
    de: "Umfang", en: "Inventory Size",
    ar: "حجم المنقولات", tr: "Eşya Miktarı",
  },
  "calc.tab.special": {
    de: "Sonderleistungen", en: "Special Services",
    ar: "خدمات خاصة", tr: "Özel Hizmetler",
  },
  "calc.tab.schedule": {
    de: "Termin & Uhrzeit", en: "Date & Time",
    ar: "التاريخ والوقت", tr: "Tarih ve Saat",
  },
  "calc.tab.quote": {
    de: "Ihr Angebot", en: "Your Quote",
    ar: "عرضك", tr: "Teklifiniz",
  },

  "calc.confirm.title": {
    de: "Buchung abschließen", en: "Complete your booking",
    ar: "أكمل حجزك", tr: "Rezervasyonunuzu tamamlayın",
  },
  "calc.confirm.needHelp": {
    de: "Fragen zur Buchung?", en: "Need help booking?",
    ar: "تحتاج مساعدة في الحجز؟", tr: "Rezervasyonda yardım mı lazım?",
  },
  "calc.confirm.callUs": {
    de: "Kontakt", en: "Contact",
    ar: "تواصل معنا", tr: "İletişim",
  },

  "calc.confirm.registerTitle": {
    de: "Schnell registrieren", en: "Quick Registration",
    ar: "تسجيل سريع", tr: "Hızlı Kayıt",
  },
  "calc.confirm.registerBody": {
    de: "Legen Sie ein Konto an, um Ihre Buchung zu verwalten und den Fortschritt zu verfolgen.",
    en: "Create an account to manage your booking and track progress.",
    ar: "أنشئ حساباً لإدارة حجزك ومتابعة التقدّم.",
    tr: "Rezervasyonunuzu yönetmek ve süreci izlemek için bir hesap oluşturun.",
  },
  "calc.confirm.alreadyRegistered": {
    de: "Schon registriert?", en: "Already registered?",
    ar: "لديك حساب؟", tr: "Zaten kayıtlı mısınız?",
  },
  "calc.confirm.loginHere": {
    de: "Hier anmelden", en: "Login here",
    ar: "سجّل الدخول هنا", tr: "Buradan giriş yapın",
  },

  "calc.confirm.firstName": {
    de: "Vorname",
    en: "First name",
    ar: "الاسم الأول",
    tr: "Ad",
  },
  "calc.confirm.firstNamePlaceholder": {
    de: "z. B. Max",
    en: "e.g. John",
    ar: "مثال: أحمد",
    tr: "örn. Ahmet",
  },
  "calc.confirm.lastName": {
    de: "Nachname",
    en: "Last name",
    ar: "الكنية",
    tr: "Soyad",
  },
  "calc.confirm.lastNamePlaceholder": {
    de: "z. B. Mustermann",
    en: "e.g. Doe",
    ar: "مثال: محمد",
    tr: "örn. Yılmaz",
  },
  "calc.confirm.phone": {
    de: "Telefonnummer", en: "Phone Number",
    ar: "رقم الهاتف", tr: "Telefon Numarası",
  },
  "calc.confirm.phonePlaceholder": {
    de: "z. B. +49 176 1234567", en: "e.g. +49 176 1234567",
    ar: "مثال: +49 176 1234567", tr: "örn. +49 176 1234567",
  },
  "calc.confirm.email": {
    de: "E-Mail-Adresse", en: "Email Address",
    ar: "البريد الإلكتروني", tr: "E-posta Adresi",
  },
  "calc.confirm.emailPlaceholder": {
    de: "z. B. max@beispiel.de", en: "e.g. john.doe@example.com",
    ar: "مثال: name@example.com", tr: "örn. ad.soyad@ornek.com",
  },
  "calc.confirm.passwordPlaceholder": {
    de: "Mindestens {count} Zeichen", en: "Min. {count} characters",
    ar: "‏{count} أحرف على الأقل", tr: "En az {count} karakter",
  },
  "calc.confirm.confirmPassword": {
    de: "Passwort bestätigen", en: "Confirm Password",
    ar: "تأكيد كلمة المرور", tr: "Şifreyi Onaylayın",
  },
  "calc.confirm.confirmPasswordPlaceholder": {
    de: "Passwort wiederholen", en: "Repeat password",
    ar: "أعد كتابة كلمة المرور", tr: "Şifreyi tekrarlayın",
  },
  "calc.confirm.showPassword": {
    de: "Passwort anzeigen", en: "Show password",
    ar: "إظهار كلمة المرور", tr: "Şifreyi göster",
  },
  "calc.confirm.hidePassword": {
    de: "Passwort verbergen", en: "Hide password",
    ar: "إخفاء كلمة المرور", tr: "Şifreyi gizle",
  },
  "calc.confirm.passwordMismatch": {
    de: "Die beiden Passwörter stimmen nicht überein.",
    en: "The two passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
    tr: "İki şifre birbiriyle eşleşmiyor.",
  },

  "calc.confirm.arrivalTime": {
    de: "Gewünschte Ankunftszeit", en: "Preferred arrival time",
    ar: "وقت الوصول المفضّل", tr: "Tercih edilen varış saati",
  },
  "calc.confirm.pickTime": {
    de: "Bitte wählen", en: "Please choose",
    ar: "الرجاء الاختيار", tr: "Lütfen seçin",
  },

  "calc.confirm.paymentTitle": {
    de: "Zahlungsart wählen", en: "Select Payment Method",
    ar: "اختر طريقة الدفع", tr: "Ödeme Yöntemi Seçin",
  },
  "calc.confirm.payCard": {
    de: "Kreditkarte", en: "Credit Card",
    ar: "بطاقة ائتمان", tr: "Kredi Kartı",
  },
  "calc.confirm.payCardHint": {
    de: "Visa, Mastercard", en: "Visa, Mastercard",
    ar: "فيزا، ماستركارد", tr: "Visa, Mastercard",
  },
  "calc.confirm.payPaypal": {
    de: "PayPal", en: "PayPal", ar: "باي بال", tr: "PayPal",
  },
  "calc.confirm.payPaypalHint": {
    de: "Direkt und sicher", en: "Direct secure transfer",
    ar: "تحويل مباشر وآمن", tr: "Doğrudan güvenli transfer",
  },
  "calc.confirm.payBank": {
    de: "Überweisung", en: "Bank Transfer",
    ar: "حوالة بنكية", tr: "Banka Havalesi",
  },
  "calc.confirm.payBankHint": {
    de: "SEPA-Überweisung", en: "SEPA wire transfer",
    ar: "تحويل SEPA", tr: "SEPA havalesi",
  },
  "calc.confirm.payCash": {
    de: "Zahlung bei Lieferung", en: "Pay on Delivery",
    ar: "الدفع عند التسليم", tr: "Teslimatta Ödeme",
  },
  "calc.confirm.payCashHint": {
    de: "Bar oder Karte nach dem Umzug", en: "Cash or card after the move",
    ar: "نقداً أو بالبطاقة بعد النقل", tr: "Taşınmadan sonra nakit veya kart",
  },
  // Stated because there is no checkout behind these cards: the payments
  // module is a staff ledger, not a provider integration.
  "calc.confirm.paymentNotice": {
    de: "Hier wird noch nichts abgebucht. Wir notieren Ihren Wunsch und rechnen nach dem Umzug ab.",
    en: "Nothing is charged here. We note your preference and invoice after the move.",
    ar: "لا يُخصم أي مبلغ هنا. نسجّل تفضيلك ونُصدر الفاتورة بعد النقل.",
    tr: "Burada hiçbir tahsilat yapılmaz. Tercihinizi not eder, taşınmadan sonra fatura ederiz.",
  },

  // Two placeholders, so each language keeps its own word order around the links.
  "calc.confirm.consent": {
    de: "Ich akzeptiere die {terms} und die {privacy} von m.on.",
    en: "I agree to the {terms} and {privacy} of m.on.",
    ar: "أوافق على {terms} و{privacy} الخاصة بـ m.on.",
    tr: "m.on'ın {terms} ve {privacy} belgelerini kabul ediyorum.",
  },
  "calc.confirm.terms": {
    de: "AGB", en: "Terms of Service",
    ar: "شروط الخدمة", tr: "Hizmet Şartları",
  },
  "calc.confirm.privacy": {
    de: "Datenschutzerklärung", en: "Privacy Policy",
    ar: "سياسة الخصوصية", tr: "Gizlilik Politikası",
  },
  "calc.confirm.cancellation": {
    de: "Bis 48 Stunden vor dem Umzugstermin ist die Stornierung kostenlos.",
    en: "Cancellation is free up to 48 hours before the scheduled moving date.",
    ar: "الإلغاء مجاني حتى 48 ساعة قبل موعد النقل.",
    tr: "Taşınma tarihinden 48 saat öncesine kadar iptal ücretsizdir.",
  },
  "calc.confirm.consentRequired": {
    de: "Bitte bestätigen Sie AGB und Datenschutzerklärung.",
    en: "Please accept the terms and the privacy policy.",
    ar: "الرجاء الموافقة على الشروط وسياسة الخصوصية.",
    tr: "Lütfen şartları ve gizlilik politikasını kabul edin.",
  },

  "calc.confirm.ssl": {
    de: "SSL-verschlüsselt gebucht", en: "SSL encrypted secure booking",
    ar: "حجز آمن مشفّر بـ SSL", tr: "SSL şifreli güvenli rezervasyon",
  },
  // Not "& Pay": this screen books, it does not take money.
  "calc.confirm.submit": {
    de: "Buchung verbindlich bestätigen", en: "Confirm booking",
    ar: "تأكيد الحجز", tr: "Rezervasyonu onayla",
  },
  "calc.confirm.submitting": {
    de: "Wird gebucht…", en: "Booking…",
    ar: "يجري الحجز…", tr: "Rezervasyon yapılıyor…",
  },

  "calc.confirm.service": {
    de: "Gewählte Leistung", en: "Selected service",
    ar: "الخدمة المختارة", tr: "Seçilen hizmet",
  },
  "calc.confirm.route": {
    de: "Route", en: "Route", ar: "المسار", tr: "Rota",
  },
  "calc.confirm.distance": {
    de: "{km} km Entfernung", en: "{km} km distance",
    ar: "{km} كم مسافة", tr: "{km} km mesafe",
  },
  "calc.confirm.moveDate": {
    de: "Umzugstermin", en: "Move date",
    ar: "تاريخ النقل", tr: "Taşınma tarihi",
  },
  "calc.confirm.startingAt": {
    de: "Beginn um {time} Uhr", en: "Starting at {time}",
    ar: "يبدأ الساعة {time}", tr: "{time} itibarıyla başlıyor",
  },
  "calc.confirm.inventory": {
    de: "Umfang", en: "Inventory size",
    ar: "حجم المنقولات", tr: "Eşya miktarı",
  },
  "calc.confirm.areaValue": {
    de: "Rund {area} m² Wohnfläche", en: "Approx. {area} m² living space",
    ar: "نحو {area} م² مساحة سكنية", tr: "Yaklaşık {area} m² yaşam alanı",
  },
  "calc.confirm.itemsValue": {
    de: { one: "{count} ausgewähltes Möbelstück", other: "{count} ausgewählte Möbelstücke" },
    en: { one: "{count} selected item", other: "{count} selected items" },
    ar: {
      zero: "لا أغراض مختارة",
      one: "غرض واحد مختار",
      two: "غرضان مختاران",
      few: "{count} أغراض مختارة",
      many: "{count} غرضاً مختاراً",
      other: "{count} غرض مختار",
    },
    tr: { one: "{count} seçili eşya", other: "{count} seçili eşya" },
  },
  "calc.confirm.crew": {
    de: "Team", en: "Helper crew", ar: "فريق العمل", tr: "Ekip",
  },
  "calc.confirm.crewValue": {
    de: "{crew} Mitarbeiter und {vans} Transporter",
    en: "{crew} movers and {vans} van(s)",
    ar: "{crew} عمّال و{vans} شاحنة",
    tr: "{crew} taşıyıcı ve {vans} araç",
  },
  "calc.confirm.loadingEstimate": {
    de: "Geschätzte Dauer: {hours} Stunden", en: "Estimated loading: {hours} hours",
    ar: "المدة المقدّرة: {hours} ساعة", tr: "Tahmini süre: {hours} saat",
  },
  "calc.confirm.included": {
    de: "In diesem Preis enthalten", en: "Included in this price",
    ar: "مشمول في هذا السعر", tr: "Bu fiyata dahil",
  },
  "calc.confirm.total": {
    de: "Gesamtpreis", en: "Total price",
    ar: "السعر الإجمالي", tr: "Toplam fiyat",
  },
  "calc.confirm.vatIncluded": {
    de: "Inkl. {rate} % MwSt.", en: "Incl. {rate}% German VAT",
    ar: "شامل ضريبة القيمة المضافة {rate}٪", tr: "KDV %{rate} dahil",
  },

  "calc.confirm.noQuote": {
    de: "Zu dieser Buchung gibt es kein gültiges Angebot.",
    en: "There is no valid quote for this booking.",
    ar: "لا يوجد عرض سعر صالح لهذا الحجز.",
    tr: "Bu rezervasyon için geçerli bir teklif yok.",
  },
  "calc.confirm.noDate": {
    de: "Für dieses Angebot ist noch kein Umzugstermin hinterlegt.",
    en: "This quote does not have a moving date yet.",
    ar: "لا يوجد بعد تاريخ نقل لهذا العرض.",
    tr: "Bu teklif için henüz bir taşınma tarihi yok.",
  },
  "calc.confirm.backToCalculator": {
    de: "Zurück zum Rechner", en: "Back to the calculator",
    ar: "العودة إلى الحاسبة", tr: "Hesaplayıcıya dön",
  },
  "calc.confirm.pickAnotherDate": {
    de: "Anderen Termin wählen", en: "Choose another date",
    ar: "اختر موعداً آخر", tr: "Başka bir tarih seçin",
  },
  "calc.confirm.quoteUsed": {
    de: "Dieses Angebot wurde bereits gebucht.",
    en: "This quote has already been booked.",
    ar: "تم حجز هذا العرض بالفعل.",
    tr: "Bu teklif zaten rezerve edildi.",
  },
  "calc.confirm.successBody": {
    de: "Ihre Auftragsnummer lautet {reference}. Wir bestätigen den Termin per E-Mail.",
    en: "Your reference is {reference}. We will confirm the appointment by email.",
    ar: "رقم طلبك هو {reference}. سنؤكّد الموعد عبر البريد الإلكتروني.",
    tr: "Sipariş numaranız {reference}. Randevuyu e-posta ile onaylayacağız.",
  },

  "calc.fromAddress": {
    de: "Startadresse", en: "From Address", ar: "عنوان الانطلاق", tr: "Çıkış adresi",
  },
  "calc.toAddress": {
    de: "Zieladresse", en: "To Address", ar: "عنوان الوصول", tr: "Varış adresi",
  },

  "calc.propertyFrom": {
    de: "Auszugsobjekt ({place})", en: "From Property ({place})",
    ar: "عقار المغادرة ({place})", tr: "Çıkış mülkü ({place})",
  },
  "calc.propertyTo": {
    de: "Einzugsobjekt ({place})", en: "To Property ({place})",
    ar: "عقار الوصول ({place})", tr: "Varış mülkü ({place})",
  },
  "calc.floorNth": {
    de: "{n}. Etage", en: "Floor {n}", ar: "الطابق {n}", tr: "{n}. kat",
  },

  "calc.livingArea": {
    de: "Wohnfläche (m²)", en: "Living Area (m²)",
    ar: "المساحة السكنية (م²)", tr: "Yaşam alanı (m²)",
  },
  "calc.adjustArea": {
    de: "Fläche genau einstellen", en: "Adjust Area Size Precisely",
    ar: "اضبط المساحة بدقّة", tr: "Alanı hassas ayarlayın",
  },
  "calc.sqmValue": { de: "{n} m²", en: "{n} m²", ar: "{n} م²", tr: "{n} m²" },

  "calc.roomFilter": { de: "Raum", en: "Room", ar: "الغرفة", tr: "Oda" },
  "calc.roomAll": {
    de: "Alle Räume", en: "All rooms", ar: "كل الغرف", tr: "Tüm odalar",
  },
  "calc.totalItemsAll": {
    de: "Gesamt: {count} Stück", en: "Total: {count} items",
    ar: "الإجمالي: {count} قطعة", tr: "Toplam: {count} parça",
  },
  "calc.totalRoomItems": {
    de: "{room}: {count} Stück", en: "{room}: {count} items",
    ar: "{room}: {count} قطعة", tr: "{room}: {count} parça",
  },

  "calc.addonsNote": {
    de: "Möbelmontage fragen wir später pro Möbelstück ab. Reinigung und Entrümpelung sind eigene Leistungen — wählen Sie sie im ersten Schritt.",
    en: "Furniture assembly is asked per item later on. Cleaning and clearance are services of their own — pick them in the first step.",
    ar: "نسأل عن تركيب الأثاث لاحقاً لكل قطعة. التنظيف والإخلاء خدمتان مستقلتان — اخترهما في الخطوة الأولى.",
    tr: "Mobilya montajını ilerleyen adımda parça parça soruyoruz. Temizlik ve boşaltma ayrı hizmetlerdir — ilk adımda seçin.",
  },
  "calc.crewRecommendation": {
    de: "Für eine Zweizimmerwohnung empfehlen wir drei Mitarbeiter.",
    en: "We recommend three movers for a two-bedroom flat.",
    ar: "نوصي بثلاثة عمّال لشقة بغرفتَي نوم.",
    tr: "İki yatak odalı bir daire için üç kişilik ekip öneririz.",
  },

  "calc.assembly": { de: "Aufbau", en: "Assembly", ar: "تركيب", tr: "Montaj" },
  "calc.disassembly": { de: "Abbau", en: "Disassembly", ar: "فكّ", tr: "Demontaj" },
  "calc.specialNoticeTitle": {
    de: "Hinweis zu Montage und schwerem Gut",
    en: "Additional Handling & Assembly Notice",
    ar: "تنبيه بشأن التركيب والأغراض الثقيلة",
    tr: "Montaj ve ağır eşya uyarısı",
  },
  "calc.specialNoticeBody": {
    de: "Stücke über 100 kg brauchen Gurte und geschultes Personal. Sagen Sie uns vorab Bescheid — mit einem Foto im nächsten Schritt oder über das Kontaktformular.",
    en: "Items over 100 kg need belts and trained helpers. Tell us in advance — with a photo in the next step or through the contact form.",
    ar: "الأغراض التي تتجاوز 100 كغ تحتاج أحزمة وعمّالاً مدرّبين. أخبرنا مسبقاً بصورة في الخطوة التالية أو عبر نموذج التواصل.",
    tr: "100 kg üzeri eşyalar kemer ve eğitimli eleman gerektirir. Bize önceden sonraki adımda bir fotoğrafla ya da iletişim formuyla bildirin.",
  },

  "calc.photosDropTitle": {
    de: "Fotos hierher ziehen", en: "Drag and drop your photos here",
    ar: "اسحب صورك إلى هنا", tr: "Fotoğraflarınızı buraya sürükleyin",
  },
  "calc.photosDropHint": {
    de: "JPG und PNG bis 10 MB pro Datei.",
    en: "Supports JPG and PNG up to 10 MB per file.",
    ar: "يدعم JPG وPNG حتى 10 ميغابايت لكل ملف.",
    tr: "Dosya başına 10 MB'a kadar JPG ve PNG.",
  },
  "calc.photosListTitle": {
    de: "Ausgewählte Fotos", en: "Selected photos",
    ar: "الصور المختارة", tr: "Seçilen fotoğraflar",
  },
  "calc.photosPending": {
    de: "Noch nicht übertragen", en: "Not sent yet",
    ar: "لم تُرسَل بعد", tr: "Henüz gönderilmedi",
  },
  "calc.photosRemove": {
    de: "{name} entfernen", en: "Remove {name}",
    ar: "إزالة {name}", tr: "{name} kaldır",
  },
  "calc.photosTooLarge": {
    de: "Zu groß und nicht übernommen: {names}. Maximal 10 MB pro Datei.",
    en: "Too large and not added: {names}. The limit is 10 MB per file.",
    ar: "أكبر من الحد ولم تُضَف: {names}. الحد 10 ميغابايت لكل ملف.",
    tr: "Çok büyük olduğu için eklenmedi: {names}. Sınır dosya başına 10 MB.",
  },
  "calc.photosTipsTitle": {
    de: "Nützliche Foto-Tipps", en: "Useful photo tips",
    ar: "نصائح مفيدة للتصوير", tr: "Faydalı fotoğraf ipuçları",
  },
  "calc.photosTip1": {
    de: "• Weitwinkelaufnahmen ganzer Räume, damit wir den Platz einschätzen können.",
    en: "• Take wide shots of whole rooms so we can judge the space.",
    ar: "• صوّر الغرف كاملة بزاوية واسعة لنقدّر المساحة.",
    tr: "• Alanı değerlendirebilmemiz için odaların geniş açılı fotoğrafını çekin.",
  },
  "calc.photosTip2": {
    de: "• Treppen und Aufzugsmaße festhalten, wenn sie ungewöhnlich eng sind.",
    en: "• Document stairs and lift dimensions if they are unusually tight.",
    ar: "• وثّق أبعاد الدرج والمصعد إن كانت ضيّقة بشكل غير معتاد.",
    tr: "• Merdiven ve asansör ölçülerini, alışılmadık derecede darsa belgeleyin.",
  },
  "calc.photosTip3": {
    de: "• Etiketten hochwertiger Designermöbel abfotografieren.",
    en: "• Shoot the labels on high-end designer furniture.",
    ar: "• صوّر ملصقات الأثاث المصمَّم الفاخر.",
    tr: "• Üst segment tasarım mobilyalarının etiketlerini çekin.",
  },

  "calc.dayFree": {
    de: "Voll verfügbar", en: "Fully available",
    ar: "متاح بالكامل", tr: "Tamamen uygun",
  },
  "calc.dayLimited": {
    de: "Wenige Plätze", en: "Limited slots",
    ar: "أماكن محدودة", tr: "Sınırlı kontenjan",
  },
  "calc.dayFull": {
    de: "Ausgebucht", en: "Fully booked", ar: "محجوز بالكامل", tr: "Dolu",
  },
  "calc.daySelected": {
    de: "Gewählter Termin", en: "Selected date",
    ar: "التاريخ المختار", tr: "Seçilen tarih",
  },

  "calc.arrivalWindow": {
    de: "Ankunftsfenster wählen", en: "Select arrival window",
    ar: "اختر نافذة الوصول", tr: "Varış aralığını seçin",
  },
  "calc.window.morning": {
    de: "Vormittags (08:00–12:00)", en: "Morning slot (08:00–12:00)",
    ar: "الفترة الصباحية (08:00–12:00)", tr: "Sabah (08:00–12:00)",
  },
  "calc.window.morningHint": {
    de: "Am beliebtesten für komplette Umzüge.",
    en: "Most popular for full relocations.",
    ar: "الأكثر طلباً لعمليات النقل الكاملة.",
    tr: "Tam taşınmalar için en çok tercih edilen.",
  },
  "calc.window.afternoon": {
    de: "Nachmittags (12:00–17:00)", en: "Afternoon slot (12:00–17:00)",
    ar: "فترة بعد الظهر (12:00–17:00)", tr: "Öğleden sonra (12:00–17:00)",
  },
  "calc.window.afternoonHint": {
    de: "Ideal für kurze Strecken.",
    en: "Ideal for short distance routes.",
    ar: "مثالية للمسافات القصيرة.",
    tr: "Kısa mesafeler için ideal.",
  },
  "calc.window.evening": {
    de: "Abends (17:00–20:00)", en: "Evening slot (17:00–20:00)",
    ar: "الفترة المسائية (17:00–20:00)", tr: "Akşam (17:00–20:00)",
  },
  "calc.window.eveningHint": {
    de: "Später Express-Service.",
    en: "Late express service.",
    ar: "خدمة سريعة في وقت متأخّر.",
    tr: "Geç saatte ekspres hizmet.",
  },

  "calc.summaryNone": { de: "Keine", en: "None", ar: "لا شيء", tr: "Yok" },
  "calc.percentComplete": {
    de: "{percent} % abgeschlossen", en: "{percent}% completed",
    ar: "اكتمل {percent}٪", tr: "%{percent} tamamlandı",
  },

  // The wizard's buttons, worded per screen as the frames word them (3:622 … 3:2018).
  "calc.nextStep": { de: "Nächster Schritt", en: "Next Step", ar: "الخطوة التالية", tr: "Sonraki adım" },
  /** The fourth node of the five-node rail (3:653); the ten-segment rail keeps the short name. */
  "calc.node.volume": {
    de: "Volumenschätzung", en: "Volume Estimate", ar: "تقدير الحجم", tr: "Hacim tahmini",
  },
  "calc.cta.continue": {
    de: "Speichern & weiter", en: "Save & Continue", ar: "حفظ ومتابعة", tr: "Kaydet ve devam et",
  },
  "calc.cta.toSpecial": {
    de: "Weiter zu Sondergegenständen", en: "Continue to Special Items",
    ar: "المتابعة إلى القطع الخاصة", tr: "Özel eşyalara geç",
  },
  "calc.cta.toPhotos": {
    de: "Weiter zu den Fotos", en: "Continue to Photos",
    ar: "المتابعة إلى الصور", tr: "Fotoğraflara geç",
  },
  "calc.cta.toDates": {
    de: "Weiter zum Termin", en: "Continue to Dates",
    ar: "المتابعة إلى المواعيد", tr: "Tarihlere geç",
  },
  "calc.cta.toReview": {
    de: "Endgültiges Angebot prüfen", en: "Review Final Offer",
    ar: "مراجعة العرض النهائي", tr: "Son teklifi incele",
  },
  "calc.cta.back": {
    de: "Zurück zum vorherigen Schritt", en: "Back to Previous Step",
    ar: "العودة إلى الخطوة السابقة", tr: "Önceki adıma dön",
  },

  // The two result screens (3:2348 instant quote, 3:2496 pending review).
  "calc.tab.pending": {
    de: "Vorläufige Schätzung", en: "Pending Estimate", ar: "تقدير قيد المراجعة", tr: "Bekleyen tahmin",
  },
  "calc.quote.badge": {
    de: "Sofortpreis — jetzt buchen", en: "Instant Price — Book Now",
    ar: "سعر فوري — احجز الآن", tr: "Anında fiyat — Hemen rezervasyon yap",
  },
  "calc.quote.title": {
    de: "Wir haben Ihren besten Preis berechnet!", en: "We calculated your best rate!",
    ar: "لقد حسبنا لك أفضل سعر!", tr: "Sizin için en iyi fiyatı hesapladık!",
  },
  "calc.quote.body": {
    de: "Garantierter Preis auf Basis Ihrer aktuellen Angaben. Keine versteckten Gebühren oder Überraschungen. Der Preis gilt bis {date}.",
    en: "Guaranteed price based on your current entries. No hidden fees or surprise charges. Price held until {date}.",
    ar: "سعر مضمون بناءً على بياناتك الحالية. لا رسوم خفية ولا مفاجآت. السعر ثابت حتى {date}.",
    tr: "Mevcut bilgilerinize dayalı garantili fiyat. Gizli ücret veya sürpriz masraf yok. Fiyat {date} tarihine kadar geçerlidir.",
  },
  "calc.quote.accept": {
    de: "Annehmen & jetzt buchen", en: "Accept & Book Now", ar: "قبول والحجز الآن", tr: "Kabul et ve rezervasyon yap",
  },
  "calc.quote.save": { de: "Angebot speichern", en: "Save Quote", ar: "حفظ العرض", tr: "Teklifi kaydet" },
  /** There is no PDF endpoint; the button opens the print dialog, which saves one. */
  "calc.quote.pdf": {
    de: "Als PDF speichern", en: "Download as PDF", ar: "تنزيل بصيغة PDF", tr: "PDF olarak indir",
  },
  "calc.quote.breakdown": {
    de: "Detaillierte Preisaufstellung", en: "Itemized Price Breakdown",
    ar: "تفصيل السعر", tr: "Ayrıntılı fiyat dökümü",
  },
  "calc.quote.total": {
    de: "Garantierter Gesamtbetrag", en: "Total Guaranteed Amount",
    ar: "المبلغ الإجمالي المضمون", tr: "Garantili toplam tutar",
  },
  "calc.pending.badge": {
    de: "Schätzung — Prüfung ausstehend", en: "Estimate — Pending Review",
    ar: "تقدير — بانتظار المراجعة", tr: "Tahmin — İnceleme bekliyor",
  },
  "calc.pending.title": {
    de: "Wir erstellen Ihr individuelles Angebot", en: "We are preparing your custom quote",
    ar: "نحن نُعدّ عرضك المخصّص", tr: "Size özel teklifinizi hazırlıyoruz",
  },
  "calc.pending.estimate": { de: "(Schätzung)", en: "(estimate)", ar: "(تقديري)", tr: "(tahmini)" },
  "calc.pending.body": {
    de: "Einige Ihrer Angaben muss unser Dispositionsteam kurz von Hand prüfen, bevor wir einen Preis garantieren. Der Betrag oben ist unsere aktuelle Schätzung.",
    en: "Some of your answers need a manual check by our dispatch team before we can guarantee a price. The figure above is our current estimate.",
    ar: "تحتاج بعض إجاباتك إلى تحقّق يدوي من فريق التنسيق لدينا قبل أن نضمن السعر. المبلغ أعلاه هو تقديرنا الحالي.",
    tr: "Bir fiyatı garanti edebilmemiz için bazı yanıtlarınızın sevk ekibimiz tarafından elle kontrol edilmesi gerekiyor. Yukarıdaki tutar güncel tahminimizdir.",
  },
  "calc.pending.whyTitle": {
    de: "Warum wird das geprüft?", en: "Why is this pending review?",
    ar: "لماذا يخضع هذا للمراجعة؟", tr: "Bu neden inceleniyor?",
  },
  "calc.pending.whyBody": {
    de: "Unsere Umzugsexperten prüfen die folgenden Punkte, damit es am Umzugstag keine Überraschungen gibt. Den endgültigen Preis bestätigen wir innerhalb eines Werktags.",
    en: "Our moving experts check the points below so there are no surprise complications on your moving day. We confirm the final price within one working day.",
    ar: "يتحقّق خبراء النقل لدينا من النقاط أدناه حتى لا تحدث مفاجآت يوم النقل. نؤكّد السعر النهائي خلال يوم عمل واحد.",
    tr: "Taşınma gününde sürpriz yaşanmaması için taşıma uzmanlarımız aşağıdaki noktaları kontrol eder. Nihai fiyatı bir iş günü içinde onaylarız.",
  },
  "calc.pending.timeline": {
    de: "Nächste Schritte", en: "Next Steps Timeline", ar: "الخطوات التالية", tr: "Sonraki adımlar",
  },
  "calc.pending.step1": {
    de: "Schätzung berechnet", en: "Estimate Calculated", ar: "تم حساب التقدير", tr: "Tahmin hesaplandı",
  },
  "calc.pending.step1Sub": { de: "Gerade erledigt", en: "Done just now", ar: "تمّ للتو", tr: "Az önce tamamlandı" },
  "calc.pending.step2": {
    de: "Prüfung durch Experten", en: "Expert Assessment", ar: "تقييم الخبراء", tr: "Uzman değerlendirmesi",
  },
  "calc.pending.step2Sub": {
    de: "In Bearbeitung (innerhalb 24 h)", en: "In progress (within 24h)",
    ar: "قيد التنفيذ (خلال 24 ساعة)", tr: "Devam ediyor (24 saat içinde)",
  },
  "calc.pending.step3": {
    de: "Endgültiges Angebot", en: "Final Quote Sent", ar: "إرسال العرض النهائي", tr: "Nihai teklif gönderildi",
  },
  "calc.pending.step3Sub": { de: "Per E-Mail", en: "By email", ar: "عبر البريد الإلكتروني", tr: "E-posta ile" },
  "calc.pending.step4": { de: "Sicher buchen", en: "Safe Booking", ar: "حجز آمن", tr: "Güvenli rezervasyon" },
  "calc.pending.step4Sub": {
    de: "Termin sofort sichern", en: "Secure your date instantly", ar: "احجز موعدك فورًا", tr: "Tarihinizi hemen ayırtın",
  },
  /** Signing up with the quote id adopts the quote, which gives dispatch a way to reply. */
  "calc.pending.save": {
    de: "Schätzung speichern & Konto erstellen", en: "Save Estimate & Create Account",
    ar: "حفظ التقدير وإنشاء حساب", tr: "Tahmini kaydet ve hesap oluştur",
  },

  "common.skip": { de: "Überspringen", en: "Skip", ar: "تخطَّ", tr: "Atla" },
  "common.yes": { de: "Ja", en: "Yes", ar: "نعم", tr: "Evet" },
  "common.no": { de: "Nein", en: "No", ar: "لا", tr: "Hayır" },

  // Why a quote went to manual review. The server decides; these only name it.
  "calc.review.area_above_200_sqm": {
    de: "Über 200 m² Wohnfläche",
    en: "More than 200 m² of living space",
    ar: "أكثر من 200 م² مساحة سكنية",
    tr: "200 m² üzeri yaşam alanı",
  },
  "calc.review.more_than_60_items": {
    de: "Mehr als 60 Einzelstücke",
    en: "More than 60 individual items",
    ar: "أكثر من 60 قطعة",
    tr: "60 parçadan fazla eşya",
  },
  "calc.review.distance_above_400_km": {
    de: "Über 400 km Entfernung",
    en: "More than 400 km to travel",
    ar: "مسافة تزيد عن 400 كم",
    tr: "400 km üzeri mesafe",
  },
  "calc.review.extensive_assembly_work": {
    de: "Umfangreiche Möbelmontage",
    en: "Extensive furniture assembly",
    ar: "أعمال تركيب أثاث واسعة",
    tr: "Kapsamlı mobilya montajı",
  },
  "calc.review.large_commercial_job": {
    de: "Großer gewerblicher Auftrag",
    en: "A large commercial job",
    ar: "طلب تجاري كبير",
    tr: "Büyük ticari iş",
  },

  // ── The live price panel beside every calculator step ────────────────
  // Chrome only. The figures it frames are the server's, never assembled here.
  "calc.panel.liveEstimate": {
    de: "Live-Preisschätzung", en: "Live Price Estimate",
    ar: "تقدير السعر المباشر", tr: "Canlı Fiyat Tahmini",
  },
  "calc.panel.inclVat": {
    de: "inkl. MwSt.", en: "incl. VAT", ar: "شامل الضريبة", tr: "KDV dahil",
  },
  "calc.panel.noPriceYet": {
    de: "Beantworte noch ein paar Fragen — dann steht dein Preis hier.",
    en: "Answer a few more questions and your price appears here.",
    ar: "أجب عن بضعة أسئلة إضافية ليظهر سعرك هنا.",
    tr: "Birkaç soruyu daha yanıtlayın, fiyatınız burada görünür.",
  },
  "calc.panel.calculating": {
    de: "Preis wird berechnet…", en: "Calculating your price…",
    ar: "يجري حساب السعر…", tr: "Fiyatınız hesaplanıyor…",
  },
  "calc.panel.refreshFailed": {
    de: "Der Preis konnte gerade nicht aktualisiert werden. Deine Angaben bleiben erhalten.",
    en: "The price could not be updated just now. Your answers are kept.",
    ar: "تعذّر تحديث السعر الآن. إجاباتك محفوظة.",
    tr: "Fiyat şu anda güncellenemedi. Yanıtlarınız korunuyor.",
  },
  "calc.panel.selectedServices": {
    de: "Gewählte Leistungen", en: "Selected Services",
    ar: "الخدمات المختارة", tr: "Seçilen Hizmetler",
  },
  "calc.panel.routeSpecs": {
    de: "Strecke & Eckdaten", en: "Route & Specs",
    ar: "المسار والمواصفات", tr: "Güzergâh ve Detaylar",
  },
  "calc.panel.awaitingSpecs": {
    de: "Adresse und Angaben eingeben, um den Preis zu verfeinern.",
    en: "Enter address & specifications to refine price.",
    ar: "أدخل العنوان والمواصفات لتحديد السعر بدقّة.",
    tr: "Fiyatı netleştirmek için adres ve bilgileri girin.",
  },
  "calc.panel.guaranteeTitle": {
    de: "m.on Garantie", en: "m.on Guarantee",
    ar: "ضمان m.on", tr: "m.on Garantisi",
  },
  "calc.panel.guaranteeBody": {
    de: "Keine versteckten Kosten. Transportversicherung inklusive.",
    en: "No hidden fees. Full transport insurance included.",
    ar: "لا رسوم خفيّة. تأمين نقل شامل مضمَّن.",
    tr: "Gizli ücret yok. Tam nakliye sigortası dahil.",
  },
  "calc.panel.instantLivePrice": {
    de: "Sofortpreis live", en: "Instant Live Price",
    ar: "السعر الفوري المباشر", tr: "Anında Canlı Fiyat",
  },
  "calc.panel.breakdown": {
    de: "Preisaufschlüsselung", en: "Price Breakdown",
    ar: "تفصيل السعر", tr: "Fiyat Dökümü",
  },
  "calc.panel.estimatedTotal": {
    de: "Geschätzte Gesamtsumme", en: "Estimated Total",
    ar: "الإجمالي التقديري", tr: "Tahmini Toplam",
  },
  "calc.panel.totalNote": {
    de: "Inkl. Steuern und Versicherung", en: "Incl. all taxes & insurance",
    ar: "شامل كل الضرائب والتأمين", tr: "Tüm vergiler ve sigorta dahil",
  },
  "calc.panel.bestPrice": {
    de: "Bestpreis-Garantie & Sofortbuchung", en: "Best Price Guarantee & Instant Booking",
    ar: "ضمان أفضل سعر وحجز فوري", tr: "En İyi Fiyat Garantisi ve Anında Rezervasyon",
  },
  "calc.panel.distance": {
    de: "Entfernung", en: "Distance", ar: "المسافة", tr: "Mesafe",
  },
  "calc.panel.kmValue": {
    de: "{km} km", en: "{km} km", ar: "{km} كم", tr: "{km} km",
  },
  "calc.panel.customerType": {
    de: "Kundentyp", en: "Customer Type", ar: "نوع العميل", tr: "Müşteri Tipi",
  },
  "calc.panel.fromFloor": {
    de: "Etage / Aufzug (von)", en: "From Floor / Elevator",
    ar: "الطابق/المصعد (من)", tr: "Kat / Asansör (çıkış)",
  },
  "calc.panel.toFloor": {
    de: "Etage / Aufzug (nach)", en: "To Floor / Elevator",
    ar: "الطابق/المصعد (إلى)", tr: "Kat / Asansör (varış)",
  },
  "calc.panel.groundFloor": {
    de: "EG", en: "Ground", ar: "أرضي", tr: "Zemin",
  },
  "calc.panel.floorNumber": {
    de: "{floor}. OG", en: "Floor {floor}", ar: "الطابق {floor}", tr: "{floor}. kat",
  },
  "calc.panel.livingArea": {
    de: "Wohnfläche", en: "Living Area", ar: "المساحة السكنية", tr: "Yaşam Alanı",
  },
  "calc.panel.sqmValue": {
    de: "{sqm} m²", en: "{sqm} m²", ar: "{sqm} م²", tr: "{sqm} m²",
  },
  "calc.panel.calcMethod": {
    de: "Berechnungsart", en: "Calc Method", ar: "طريقة الحساب", tr: "Hesaplama Yöntemi",
  },
  "calc.panel.totalItems": {
    de: "Artikel gesamt", en: "Total Items", ar: "إجمالي العناصر", tr: "Toplam Eşya",
  },
  "calc.panel.itemsValue": {
    de: { one: "{count} Artikel", other: "{count} Artikel" },
    en: { one: "{count} item", other: "{count} items" },
    ar: {
      zero: "لا عناصر", one: "عنصر واحد", two: "عنصران",
      few: "{count} عناصر", many: "{count} عنصرًا", other: "{count} عنصر",
    },
    tr: { one: "{count} parça", other: "{count} parça" },
  },

  // The sub-caption under each breakdown line. The engine ships the numbers in
  // `params`; these only put words around them.
  "line.base_rate.caption": {
    de: "Grundleistung vor Zuschlägen", en: "Core service before surcharges",
    ar: "الخدمة الأساسية قبل الرسوم الإضافية", tr: "Ek ücretlerden önce temel hizmet",
  },
  "line.area.caption": {
    de: "Nach Wohnfläche: {sqm} m²", en: "By living area: {sqm} m²",
    ar: "حسب المساحة السكنية: {sqm} م²", tr: "Yaşam alanına göre: {sqm} m²",
  },
  "line.selected_items.caption": {
    de: "{count} ausgewählte Positionen", en: "{count} selected item types",
    ar: "{count} أصناف مختارة", tr: "{count} seçili kalem türü",
  },
  "line.travel.caption": {
    de: "{km} km Fahrstrecke", en: "{km} km driving route",
    ar: "{km} كم مسافة قيادة", tr: "{km} km sürüş güzergâhı",
  },
  "line.travel_long_distance.caption": {
    de: "Fernumzug über {km} km", en: "Long-distance move over {km} km",
    ar: "نقل لمسافة طويلة تبلغ {km} كم", tr: "{km} km uzun mesafe taşıma",
  },
  "line.floor_surcharge.caption": {
    de: "{floors} Etagen ohne Aufzug", en: "{floors} floors without a lift",
    ar: "{floors} طوابق بدون مصعد", tr: "Asansörsüz {floors} kat",
  },
  "line.packing_service.caption": {
    de: "Zusatzleistung gewählt", en: "Add-on selected",
    ar: "خدمة إضافية مختارة", tr: "Ek hizmet seçildi",
  },
  "line.parking_zone.caption": {
    de: "Halteverbotszone beantragt", en: "No-parking zone requested",
    ar: "طلب منطقة منع وقوف", tr: "Park yasağı bölgesi talep edildi",
  },
  "line.transport_insurance.caption": {
    de: "{percent} % des Leistungswerts", en: "{percent}% of the service value",
    ar: "{percent}٪ من قيمة الخدمة", tr: "Hizmet bedelinin %{percent} kadarı",
  },
  "line.crew_of_three.caption": {
    de: "Dritter Mitarbeiter eingeplant", en: "Third mover scheduled",
    ar: "عامل ثالث مُدرج", tr: "Üçüncü taşıyıcı planlandı",
  },
  "line.second_van.caption": {
    de: "Zweites Fahrzeug eingeplant", en: "Second van scheduled",
    ar: "مركبة ثانية مُدرجة", tr: "İkinci araç planlandı",
  },
  "line.assembly.caption": {
    de: "Montage ausgewählter Möbel", en: "Assembly of selected furniture",
    ar: "تركيب الأثاث المختار", tr: "Seçilen mobilyaların montajı",
  },
  "line.disassembly.caption": {
    de: "Demontage ausgewählter Möbel", en: "Disassembly of selected furniture",
    ar: "تفكيك الأثاث المختار", tr: "Seçilen mobilyaların demontajı",
  },
  "line.saturday_surcharge.caption": {
    de: "Samstagszuschlag {percent} %", en: "Saturday premium of {percent}%",
    ar: "رسوم السبت {percent}٪", tr: "%{percent} cumartesi farkı",
  },
  "line.business_discount.caption": {
    de: "Gewerberabatt {percent} %", en: "Business discount of {percent}%",
    ar: "خصم الشركات {percent}٪", tr: "%{percent} kurumsal indirim",
  },
  "line.discount_code.caption": {
    de: "Code {code}", en: "Code {code}", ar: "الرمز {code}", tr: "Kod {code}",
  },
  "line.minimum_order_value.caption": {
    de: "Mindestauftragswert erreicht", en: "Minimum order value applied",
    ar: "تم تطبيق الحد الأدنى لقيمة الطلب", tr: "Asgari sipariş tutarı uygulandı",
  },
  // Pricing version 2: each line says what it was worked out from.
  "line.stairs_from.caption": {
    de: "{floors} Etagen × {rate} € pro Etage", en: "{floors} floors × €{rate} per floor",
    ar: "{floors} طوابق × {rate}€ لكل طابق", tr: "{floors} kat × kat başına €{rate}",
  },
  "line.stairs_to.caption": {
    de: "{floors} Etagen × {rate} € pro Etage", en: "{floors} floors × €{rate} per floor",
    ar: "{floors} طوابق × {rate}€ لكل طابق", tr: "{floors} kat × kat başına €{rate}",
  },
  "line.volume.caption": {
    de: "{m3} m³ × {rate} € pro m³", en: "{m3} m³ × €{rate} per m³",
    ar: "{m3} م³ × {rate}€ لكل م³", tr: "{m3} m³ × m³ başına €{rate}",
  },
  "line.volume_estimated.caption": {
    de: "{m3} m³ × {rate} € pro m³", en: "{m3} m³ × €{rate} per m³",
    ar: "{m3} م³ × {rate}€ لكل م³", tr: "{m3} m³ × m³ başına €{rate}",
  },
  "line.crew.caption": {
    de: "{movers} Träger × {hours} Std. × {rate} € pro Stunde", en: "{movers} movers × {hours} h × €{rate} per hour",
    ar: "{movers} عمّال × {hours} ساعات × {rate}€ للساعة", tr: "{movers} taşıyıcı × {hours} sa × saat başı €{rate}",
  },
  "line.dismantling.caption": {
    de: "{count} Stück × {rate} €", en: "{count} pieces × €{rate}",
    ar: "{count} قطع × {rate}€", tr: "{count} parça × €{rate}",
  },
  "line.reassembly.caption": {
    de: "{count} Stück × {rate} €", en: "{count} pieces × €{rate}",
    ar: "{count} قطع × {rate}€", tr: "{count} parça × €{rate}",
  },
  "line.assembly_both.caption": {
    de: "{count} Stück × {rate} €", en: "{count} pieces × €{rate}",
    ar: "{count} قطع × {rate}€", tr: "{count} parça × €{rate}",
  },
  "line.packing.caption": {
    de: "{m3} m³ × {rate} € pro m³ (Gesamtvolumen)", en: "{m3} m³ × €{rate} per m³ (total volume)",
    ar: "{m3} م³ × {rate}€ لكل م³ (الحجم الكلي)", tr: "{m3} m³ × m³ başına €{rate} (toplam hacim)",
  },
  "line.insurance.caption": { de: "Pauschal", en: "Flat rate", ar: "سعر ثابت", tr: "Sabit ücret" },
  "line.special_piano.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.special_safe.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.special_aquarium.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.special_gym.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.special_heavy.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.special_artwork.caption": { de: "{count} × {rate} € pro Stück", en: "{count} × €{rate} per item", ar: "{count} × {rate}€ لكل قطعة", tr: "{count} × adet başına €{rate}" },
  "line.saturday.caption": { de: "Pauschal pro Einsatz", en: "Flat rate per job", ar: "سعر ثابت لكل موعد", tr: "İş başına sabit ücret" },
  "line.holiday_surcharge.caption": { de: "Pauschal pro Einsatz", en: "Flat rate per job", ar: "سعر ثابت لكل موعد", tr: "İş başına sabit ücret" },
  "line.zone_surcharge.caption": { de: "Pauschal für {zone}", en: "Flat rate for {zone}", ar: "سعر ثابت لمنطقة {zone}", tr: "{zone} için sabit ücret" },
  "line.cleaning_area.caption": {
    de: "{sqm} m² × {rate} € pro m²", en: "{sqm} m² × €{rate} per m²",
    ar: "{sqm} م² × {rate}€ لكل م²", tr: "{sqm} m² × m² başına €{rate}",
  },
  "line.windows_standard.caption": { de: "{count} Fenster × {rate} €", en: "{count} windows × €{rate}", ar: "{count} شبابيك × {rate}€", tr: "{count} pencere × €{rate}" },
  "line.windows_patio.caption": { de: "{count} Türen × {rate} €", en: "{count} doors × €{rate}", ar: "{count} أبواب × {rate}€", tr: "{count} kapı × €{rate}" },
  "line.windows_large.caption": { de: "{count} Elemente × {rate} €", en: "{count} units × €{rate}", ar: "{count} قطع × {rate}€", tr: "{count} adet × €{rate}" },
  "line.windows_roof.caption": { de: "{count} Fenster × {rate} €", en: "{count} windows × €{rate}", ar: "{count} شبابيك × {rate}€", tr: "{count} pencere × €{rate}" },

  "brand.name": { de: "m.on", en: "m.on", ar: "m.on", tr: "m.on" },
  // The wordmark is two runs: the lead in ink, the accent in brand red.
  "brand.nameLead": { de: "Umzug", en: "Umzug", ar: "Umzug", tr: "Umzug" },
  "brand.nameAccent": { de: "Plus", en: "Plus", ar: "Plus", tr: "Plus" },
  "brand.tagline": {
    de: "Premium Service", en: "Premium Service", ar: "خدمة مميّزة", tr: "Premium Hizmet",
  },
  "nav.faq": {
    de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS",
  },
  // FAQ topics, one per key in FAQ_CATEGORIES (@mon/core). Interface labels
  // rather than CMS rows: the set of topics is fixed in code, so a CMS row
  // could rename a topic but never add one. `all` backs the "all topics" chip
  // when the homepage's `faq.all` row is missing.
  "faq.category.all": { de: "Alle", en: "All", ar: "الكل", tr: "Tümü" },
  "faq.category.insurance": {
    de: "Versicherung", en: "Insurance", ar: "التأمين", tr: "Sigorta",
  },
  "faq.category.billing": {
    de: "Abrechnung", en: "Billing", ar: "الفوترة", tr: "Faturalandırma",
  },
  "faq.category.booking": {
    de: "Buchung", en: "Booking", ar: "الحجز", tr: "Rezervasyon",
  },
  "faq.category.cleaning": {
    de: "Reinigung", en: "Cleaning", ar: "التنظيف", tr: "Temizlik",
  },
  "faq.category.moving": { de: "Umzug", en: "Moving", ar: "النقل", tr: "Taşınma" },
  "faq.category.general": { de: "Allgemein", en: "General", ar: "عام", tr: "Genel" },
  "nav.contact": {
    de: "Kontakt", en: "Contact", ar: "اتصل بنا", tr: "İletişim",
  },
  "nav.search": {
    de: "Suchen", en: "Search", ar: "بحث", tr: "Ara",
  },
  "nav.instantQuote": {
    de: "Sofort-Angebot", en: "Instant Quote", ar: "عرض فوري", tr: "Anında Teklif",
  },
  "nav.pricing": {
    de: "Preise", en: "Pricing", ar: "الأسعار", tr: "Fiyatlar",
  },
  "nav.business": {
    de: "Für Unternehmen", en: "For Business", ar: "للشركات", tr: "Kurumsal",
  },
  "nav.guide": {
    de: "Ratgeber", en: "Guide", ar: "دليل", tr: "Rehber",
  },
  "nav.partner": {
    de: "Partner werden", en: "Become a Partner", ar: "كن شريكاً", tr: "Ortak Ol",
  },
  // ── v2 chrome: "Double navigation" + "Footer / Inherited inverted" (357:23886)
  /** Names the utility bar (357:23892) for screen readers, apart from the main row. */
  "nav.utility.label": {
    de: "Service-Links", en: "Service links", ar: "روابط الخدمة", tr: "Hizmet bağlantıları",
  },
  "nav.utility.jobs": { de: "Jobs", en: "Jobs", ar: "الوظائف", tr: "Kariyer" },
  "nav.utility.business": {
    de: "Geschäftskunden", en: "Business accounts", ar: "حسابات الشركات", tr: "Kurumsal hesaplar",
  },
  "nav.utility.locations": { de: "Standorte", en: "Locations", ar: "المواقع", tr: "Konumlar" },
  // The frame's "About" — shorter than the "About us" nav.about carries.
  "nav.utility.about": { de: "Über uns", en: "About", ar: "من نحن", tr: "Hakkımızda" },
  "nav.utility.partnerships": {
    de: "Partnerschaften", en: "Partnerships", ar: "الشراكات", tr: "Ortaklıklar",
  },
  "nav.utility.manageBooking": {
    de: "Buchung verwalten", en: "Manage booking", ar: "إدارة الحجز", tr: "Rezervasyonu yönet",
  },
  /**
   * The main row's links (357:23913): sections of the homepage. "Services"
   * and "Reviews" reuse nav.services and nav.reviews.
   */
  "nav.section.questions": { de: "Fragen", en: "Questions", ar: "أسئلة", tr: "Sorular" },
  "nav.section.movingPlan": {
    de: "Umzugsplan", en: "Moving plan", ar: "خطة النقل", tr: "Taşınma planı",
  },
  "nav.section.sixWays": { de: "Sechs Wege", en: "Six ways", ar: "ست طرق", tr: "Altı yol" },
  "nav.section.faqs": { de: "FAQ", en: "FAQs", ar: "الأسئلة الشائعة", tr: "SSS" },
  "nav.mainLabel": {
    de: "Hauptnavigation", en: "Main navigation", ar: "التنقل الرئيسي", tr: "Ana gezinme",
  },
  /** The red pill of the header (357:23934) and the footer (358:24234). */
  "nav.bookNow": {
    de: "Jetzt buchen", en: "Book now", ar: "احجز الآن", tr: "Rezervasyon yap",
  },
  /** The heading of the small-screen menu (245:53035). */
  "nav.menu": { de: "Menü", en: "Menu", ar: "القائمة", tr: "Menü" },
  /** The heading over the account rows of the small-screen menu (245:53048). */
  "nav.account": { de: "Konto", en: "Account", ar: "الحساب", tr: "Hesap" },
  /** The nav-bar's shopping cart (86:5339), which opens the calculator. */
  "nav.cart": {
    de: "Ihr Angebot", en: "Your quote", ar: "عرض السعر الخاص بك", tr: "Teklifiniz",
  },
  /** Names the footer's link row for screen readers, apart from the header's. */
  "footer.navLabel": {
    de: "Fußzeilen-Navigation", en: "Footer navigation", ar: "روابط التذييل", tr: "Alt bilgi gezinmesi",
  },

  // ── Admin: the order list and order detail ──────────────────────────
  "adminOrders.lead": {
    de: "Alle Aufträge. Nach Status filtern oder nach Referenz, Name oder E-Mail suchen.",
    en: "Every order. Filter by status, or search by reference, name or email.",
    ar: "جميع الطلبات. صفِّ حسب الحالة أو ابحث بالمرجع أو الاسم أو البريد الإلكتروني.",
    tr: "Tüm siparişler. Duruma göre filtreleyin veya referans, ad ya da e-posta ile arayın.",
  },
  "adminOrders.viewAll": {
    de: "Alle Aufträge anzeigen", en: "View all orders", ar: "عرض كل الطلبات", tr: "Tüm siparişleri görüntüle",
  },
  "adminOrders.sort": { de: "Sortierung", en: "Sort", ar: "الترتيب", tr: "Sıralama" },
  "adminOrders.sort.newest": {
    de: "Neueste zuerst", en: "Newest first", ar: "الأحدث أولًا", tr: "Önce en yeni",
  },
  "adminOrders.sort.oldest": {
    de: "Älteste zuerst", en: "Oldest first", ar: "الأقدم أولًا", tr: "Önce en eski",
  },
  "adminOrders.bookedOn": {
    de: "Gebucht am {date}", en: "Booked {date}", ar: "حُجز في {date}", tr: "Rezervasyon: {date}",
  },
  "adminOrders.page": { de: "Seite {n}", en: "Page {n}", ar: "الصفحة {n}", tr: "Sayfa {n}" },
  // Verbs, not the status names: the button says what pressing it does.
  "adminOrders.moveTo.confirmed": { de: "Bestätigen", en: "Confirm", ar: "تأكيد", tr: "Onayla" },
  "adminOrders.moveTo.completed": {
    de: "Abschließen", en: "Mark completed", ar: "تحديد كمكتمل", tr: "Tamamlandı olarak işaretle",
  },
  "adminOrders.moveTo.quoted": {
    de: "Auf Angebot zurücksetzen", en: "Back to quote", ar: "إعادة إلى عرض السعر", tr: "Teklife geri al",
  },
  "adminOrders.cancelBody": {
    de: "Der Kunde wird per E-Mail informiert. Eine Stornogebühr nach den AGB wird automatisch berechnet. Ein stornierter Auftrag kann nicht wieder aufgenommen werden.",
    en: "The customer is emailed. Any cancellation fee under the terms is calculated automatically. A cancelled order cannot be reopened.",
    ar: "سيتم إبلاغ العميل بالبريد الإلكتروني. تُحتسب أي رسوم إلغاء وفق الشروط تلقائيًا. لا يمكن إعادة فتح طلب ملغى.",
    tr: "Müşteriye e-posta gönderilir. Koşullara göre iptal ücreti otomatik hesaplanır. İptal edilen sipariş yeniden açılamaz.",
  },
  "adminOrders.cancelReason": {
    de: "Grund (optional, wird am Auftrag gespeichert)",
    en: "Reason (optional, kept on the order)",
    ar: "السبب (اختياري، يُحفظ مع الطلب)",
    tr: "Neden (isteğe bağlı, siparişte saklanır)",
  },
  "adminOrders.cancelReasonShort": {
    de: "Stornogrund", en: "Cancellation reason", ar: "سبب الإلغاء", tr: "İptal nedeni",
  },
  "adminOrders.readOnly": {
    de: "Mit dieser Rolle lassen sich Aufträge ansehen, aber nicht ändern.",
    en: "Your role can view orders but not change them.",
    ar: "يمكن لدورك عرض الطلبات دون تعديلها.",
    tr: "Rolünüz siparişleri görüntüleyebilir ancak değiştiremez.",
  },
  "adminOrders.language": { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },
  "adminOrders.schedule": { de: "Termin", en: "Schedule", ar: "الموعد", tr: "Program" },
  "adminOrders.time": { de: "Uhrzeit", en: "Time", ar: "الوقت", tr: "Saat" },
  "adminOrders.secondDay": {
    de: "Fortsetzung am", en: "Continues on", ar: "يستمر في", tr: "Devam tarihi",
  },
  "adminOrders.crew": { de: "Team", en: "Crew", ar: "الفريق", tr: "Ekip" },
  "adminOrders.crewCount": {
    de: { one: "{count} Person", other: "{count} Personen" },
    en: { one: "{count} mover", other: "{count} movers" },
    ar: {
      zero: "لا أحد", one: "شخص واحد", two: "شخصان",
      few: "{count} أشخاص", many: "{count} شخصًا", other: "{count} شخص",
    },
    tr: { one: "{count} kişi", other: "{count} kişi" },
  },
  "adminOrders.hours": {
    de: "Geschätzte Dauer", en: "Estimated time", ar: "المدة المقدّرة", tr: "Tahmini süre",
  },
  "adminOrders.hoursValue": {
    de: "{hours} Std.", en: "{hours} h", ar: "{hours} ساعة", tr: "{hours} sa",
  },
  "adminOrders.distance": { de: "Entfernung", en: "Distance", ar: "المسافة", tr: "Mesafe" },
  "adminOrders.distanceValue": {
    de: "{km} km", en: "{km} km", ar: "{km} كم", tr: "{km} km",
  },
  "adminOrders.scope": { de: "Umfang", en: "Scope", ar: "نطاق العمل", tr: "Kapsam" },
  "adminOrders.area": { de: "Fläche", en: "Area", ar: "المساحة", tr: "Alan" },
  "adminOrders.areaValue": {
    de: "{sqm} m²", en: "{sqm} m²", ar: "{sqm} م²", tr: "{sqm} m²",
  },
  "adminOrders.notes": {
    de: "Anmerkungen des Kunden", en: "Customer notes", ar: "ملاحظات العميل", tr: "Müşteri notları",
  },
  "adminOrders.discountCode": {
    de: "Rabattcode", en: "Discount code", ar: "رمز الخصم", tr: "İndirim kodu",
  },
  "adminOrders.deposit": { de: "Anzahlung", en: "Deposit", ar: "العربون", tr: "Kapora" },
  "adminOrders.history": { de: "Verlauf", en: "History", ar: "السجل", tr: "Geçmiş" },
  "adminOrders.event.booked": { de: "Gebucht", en: "Booked", ar: "تم الحجز", tr: "Rezerve edildi" },
  "adminOrders.elevator": { de: "mit Aufzug", en: "lift", ar: "يوجد مصعد", tr: "asansörlü" },
  "adminOrders.noElevator": { de: "ohne Aufzug", en: "no lift", ar: "بدون مصعد", tr: "asansörsüz" },

  // ── Homepage: the services carousel's dots and arrow (357:23886) ─────
  "home.carousel.pages": {
    de: "Leistungen durchblättern", en: "Browse the services", ar: "تصفّح الخدمات", tr: "Hizmetlere göz atın",
  },
  "home.carousel.page": {
    de: "Seite {n} von {total}", en: "Page {n} of {total}", ar: "الصفحة {n} من {total}", tr: "Sayfa {n} / {total}",
  },
  "home.carousel.next": {
    de: "Weitere Leistungen", en: "More services", ar: "المزيد من الخدمات", tr: "Diğer hizmetler",
  },
  "home.carousel.restart": {
    de: "Zurück zur ersten Leistung", en: "Back to the first service", ar: "العودة إلى الخدمة الأولى", tr: "İlk hizmete dön",
  },
  // The video strip's pause button, which stops its clips and its cycling.
  "home.strip.pause": {
    de: "Videoleiste anhalten", en: "Pause the video strip", ar: "إيقاف شريط الفيديو مؤقتًا", tr: "Video şeridini duraklat",
  },
  "home.strip.play": {
    de: "Videoleiste abspielen", en: "Play the video strip", ar: "تشغيل شريط الفيديو", tr: "Video şeridini oynat",
  },

  // ── Errors ──────────────────────────────────────────────────────────
  "error.invalidCredentials": {
    de: "E-Mail oder Passwort ist falsch.",
    en: "Email or password is incorrect.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    tr: "E-posta veya şifre yanlış.",
  },
  "error.emailNotVerified": {
    de: "Dein Konto ist noch nicht bestätigt. Bitte prüfe deinen Posteingang.",
    en: "Your account is not confirmed yet. Please check your inbox.",
    ar: "لم يُفعَّل حسابك بعد. الرجاء التحقّق من بريدك.",
    tr: "Hesabınız henüz onaylanmadı. Lütfen gelen kutunuzu kontrol edin.",
  },
  "error.accountBlocked": {
    de: "Dieses Konto wurde gesperrt. Bitte wende dich an den Support.",
    en: "This account has been blocked. Please contact support.",
    ar: "هذا الحساب محظور. الرجاء التواصل مع الدعم.",
    tr: "Bu hesap engellendi. Lütfen destekle iletişime geçin.",
  },
  "error.emailTaken": {
    de: "Für diese E-Mail existiert bereits ein Konto.",
    en: "An account with this email already exists.",
    ar: "يوجد حساب بهذا البريد الإلكتروني بالفعل.",
    tr: "Bu e-posta ile bir hesap zaten var.",
  },
  "error.rateLimited": {
    de: "Zu viele Versuche. Bitte warte einen Moment.",
    en: "Too many attempts. Please wait a moment.",
    ar: "محاولات كثيرة. الرجاء الانتظار قليلاً.",
    tr: "Çok fazla deneme. Lütfen biraz bekleyin.",
  },
  "error.network": {
    de: "Keine Verbindung zum Server.",
    en: "Could not reach the server.",
    ar: "تعذّر الوصول إلى الخادم.",
    tr: "Sunucuya ulaşılamadı.",
  },
  "error.slotTaken": {
    de: "Dieser Termin wurde gerade vergeben. Bitte wähle einen anderen Tag.",
    en: "That date was just taken. Please choose another day.",
    ar: "حُجز هذا الموعد للتوّ. الرجاء اختيار يوم آخر.",
    tr: "Bu tarih az önce doldu. Lütfen başka bir gün seçin.",
  },
  "error.quoteExpired": {
    de: "Dein Angebot ist abgelaufen. Bitte berechne den Preis erneut.",
    en: "Your quote has expired. Please calculate the price again.",
    ar: "انتهت صلاحية عرضك. الرجاء حساب السعر مرّة أخرى.",
    tr: "Teklifiniz süresi doldu. Lütfen fiyatı tekrar hesaplayın.",
  },
  "error.checkFields": {
    de: "Bitte prüfe deine Eingaben.",
    en: "Please check your input.",
    ar: "الرجاء التحقّق من مدخلاتك.",
    tr: "Lütfen girdilerinizi kontrol edin.",
  },
  "error.generic": {
    de: "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. الرجاء المحاولة مرّة أخرى.",
    tr: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
  },
  "error.availabilityFailed": {
    de: "Die Verfügbarkeit konnte nicht geladen werden.",
    en: "Availability could not be loaded.",
    ar: "تعذّر تحميل الأوقات المتاحة.",
    tr: "Müsaitlik yüklenemedi.",
  },
  "error.priceFailed": {
    de: "Der Preis konnte nicht berechnet werden.",
    en: "The price could not be calculated.",
    ar: "تعذّر حساب السعر.",
    tr: "Fiyat hesaplanamadı.",
  },
  "error.missingArea": {
    de: "Bitte gib die Fläche an.",
    en: "Please enter the area.",
    ar: "الرجاء إدخال المساحة.",
    tr: "Lütfen alanı girin.",
  },
  "error.profileLoadFailed": {
    de: "Dein Profil konnte nicht geladen werden.",
    en: "Your profile could not be loaded.",
    ar: "تعذّر تحميل ملفك الشخصي.",
    tr: "Profiliniz yüklenemedi.",
  },
  "error.saveFailed": {
    de: "Speichern fehlgeschlagen. Bitte versuch es erneut.",
    en: "Saving failed. Please try again.",
    ar: "فشل الحفظ. الرجاء المحاولة مرّة أخرى.",
    tr: "Kaydetme başarısız. Lütfen tekrar deneyin.",
  },
  // ── Booking planner (/rechner) ───────────────────────────────────────
  "plan.skip": {
    de: "Zum Buchungsinhalt springen",
    en: "Skip to booking content",
    ar: "انتقل إلى محتوى الحجز",
    tr: "Rezervasyon içeriğine geç",
  },
  "plan.homeLink": {
    de: "m.on Startseite",
    en: "m.on home page",
    ar: "الصفحة الرئيسية لـ m.on",
    tr: "m.on ana sayfa",
  },
  "plan.header.booking": {
    de: "Deine Buchung",
    en: "Your booking",
    ar: "حجزك",
    tr: "Rezervasyonunuz",
  },
  "plan.header.private": {
    de: "Privatkunde",
    en: "Private customer",
    ar: "عميل خاص",
    tr: "Bireysel müşteri",
  },
  "plan.header.business": {
    de: "Geschäftskunde",
    en: "Business customer",
    ar: "عميل تجاري",
    tr: "Kurumsal müşteri",
  },
  "plan.header.site": {
    de: "Website",
    en: "Site",
    ar: "الموقع",
    tr: "Site",
  },
  "plan.header.home": {
    de: "Startseite",
    en: "Home",
    ar: "الرئيسية",
    tr: "Ana sayfa",
  },
  "plan.header.help": {
    de: "Wir helfen gern",
    en: "We’re here to help",
    ar: "نحن هنا للمساعدة",
    tr: "Yardım için buradayız",
  },
  "plan.header.guide": {
    de: "Buchungshilfe",
    en: "Booking guide",
    ar: "دليل الحجز",
    tr: "Rezervasyon rehberi",
  },
  "plan.header.signIn": {
    de: "Anmelden",
    en: "Sign in",
    ar: "تسجيل الدخول",
    tr: "Giriş yap",
  },
  "plan.header.signOut": {
    de: "Abmelden",
    en: "Sign out",
    ar: "تسجيل الخروج",
    tr: "Çıkış yap",
  },
  "plan.sidebar.eyebrow": {
    de: "Deine Buchung",
    en: "Your booking",
    ar: "حجزك",
    tr: "Rezervasyonunuz",
  },
  "plan.sidebar.title": {
    de: "Ein Stück näher an deinem nächsten Kapitel.",
    en: "A little closer to your next chapter.",
    ar: "خطوة أقرب إلى فصلك القادم.",
    tr: "Yeni sayfanıza bir adım daha yakın.",
  },
  "plan.sidebar.steps": {
    de: "Buchungsschritte",
    en: "Booking steps",
    ar: "خطوات الحجز",
    tr: "Rezervasyon adımları",
  },
  "plan.sidebar.stepsShort": {
    de: "Schritte",
    en: "Steps",
    ar: "الخطوات",
    tr: "Adımlar",
  },
  "plan.sidebar.motto": {
    de: "Große Umzüge. Kleine Details. Wir kümmern uns.",
    en: "Big moves. Little details. We’re on it.",
    ar: "انتقالات كبيرة. تفاصيل صغيرة. نحن نهتم بها.",
    tr: "Büyük taşınmalar. Küçük ayrıntılar. Biz hallederiz.",
  },
  "plan.nrw": {
    de: "Nordrhein-Westfalen",
    en: "North Rhine-Westphalia",
    ar: "شمال الراين-وستفاليا",
    tr: "Kuzey Ren-Vestfalya",
  },
  "plan.phase.plan": {
    de: "Leistung planen",
    en: "Plan your service",
    ar: "خطّط لخدمتك",
    tr: "Hizmetinizi planlayın",
  },
  "plan.phase.details": {
    de: "Details",
    en: "Make it yours",
    ar: "التفاصيل",
    tr: "Ayrıntılar",
  },
  "plan.phase.schedule": {
    de: "Dein Termin",
    en: "Your schedule",
    ar: "موعدك",
    tr: "Takviminiz",
  },
  "plan.phase.review": {
    de: "Prüfen & buchen",
    en: "Review & book",
    ar: "المراجعة والحجز",
    tr: "Gözden geçir ve rezerve et",
  },
  "plan.stepOf": {
    de: "Schritt {current} von {total}",
    en: "Step {current} of {total}",
    ar: "الخطوة {current} من {total}",
    tr: "Adım {current}/{total}",
  },
  "plan.previous": {
    de: "Vorheriger Schritt",
    en: "Previous step",
    ar: "الخطوة السابقة",
    tr: "Önceki adım",
  },
  "plan.madeForYou": {
    de: "Für deinen Umzug gemacht. Um dich herum gebaut.",
    en: "Made for your move. Built around you.",
    ar: "صُمّم لانتقالك. بُني حولك.",
    tr: "Taşınmanız için tasarlandı. Size göre kuruldu.",
  },
  "plan.fixFields": {
    de: "Bitte korrigiere die markierten Felder, um fortzufahren.",
    en: "Please fix the highlighted fields to continue.",
    ar: "يرجى تصحيح الحقول المحدّدة للمتابعة.",
    tr: "Devam etmek için işaretli alanları düzeltin.",
  },
  "plan.notice.complete": {
    de: "Bitte schließe zuerst „{step}“ ab.",
    en: "Please complete “{step}” first.",
    ar: "يرجى إكمال «{step}» أولاً.",
    tr: "Lütfen önce “{step}” adımını tamamlayın.",
  },
  "plan.optional": {
    de: "Optional",
    en: "Optional",
    ar: "اختياري",
    tr: "İsteğe bağlı",
  },
  "plan.close": {
    de: "Schließen",
    en: "Close",
    ar: "إغلاق",
    tr: "Kapat",
  },
  "plan.add": {
    de: "Hinzufügen",
    en: "Add",
    ar: "إضافة",
    tr: "Ekle",
  },
  "plan.done": {
    de: "Fertig",
    en: "Done",
    ar: "تم",
    tr: "Tamam",
  },
  "plan.yes": {
    de: "Ja",
    en: "Yes",
    ar: "نعم",
    tr: "Evet",
  },
  "plan.no": {
    de: "Nein",
    en: "No",
    ar: "لا",
    tr: "Hayır",
  },
  "plan.quantityOf": {
    de: "Anzahl: {name}",
    en: "Quantity: {name}",
    ar: "الكمية: {name}",
    tr: "Adet: {name}",
  },
  "plan.decrease": {
    de: "{name} verringern",
    en: "Decrease {name}",
    ar: "إنقاص {name}",
    tr: "{name} azalt",
  },
  "plan.increase": {
    de: "{name} erhöhen",
    en: "Increase {name}",
    ar: "زيادة {name}",
    tr: "{name} artır",
  },
  "plan.removeItem": {
    de: "{name} entfernen",
    en: "Remove {name}",
    ar: "إزالة {name}",
    tr: "{name} kaldır",
  },
  "plan.cta.continue": {
    de: "Weiter",
    en: "Continue",
    ar: "متابعة",
    tr: "Devam",
  },
  "plan.cta.toPayment": {
    de: "Weiter zur Zahlung",
    en: "Continue to payment",
    ar: "المتابعة إلى الدفع",
    tr: "Ödemeye geç",
  },
  "plan.cta.request": {
    de: "Besichtigung anfragen",
    en: "Request site visit",
    ar: "طلب زيارة ميدانية",
    tr: "Yerinde inceleme talep et",
  },
  "plan.cta.confirm": {
    de: "Buchung bestätigen",
    en: "Confirm booking",
    ar: "تأكيد الحجز",
    tr: "Rezervasyonu onayla",
  },
  "plan.cta.sending": {
    de: "Wird gesendet…",
    en: "Sending…",
    ar: "جارٍ الإرسال…",
    tr: "Gönderiliyor…",
  },
  "plan.step.services": {
    de: "Leistungen",
    en: "Services",
    ar: "الخدمات",
    tr: "Hizmetler",
  },
  "plan.step.account": {
    de: "Konto",
    en: "Account",
    ar: "الحساب",
    tr: "Hesap",
  },
  "plan.step.address": {
    de: "Adresse",
    en: "Address",
    ar: "العنوان",
    tr: "Adres",
  },
  "plan.step.property": {
    de: "Zugang",
    en: "Property",
    ar: "الوصول إلى العقار",
    tr: "Mülk",
  },
  "plan.step.home": {
    de: "Dein Zuhause",
    en: "Your home",
    ar: "منزلك",
    tr: "Eviniz",
  },
  "plan.step.extras": {
    de: "Team & Extras",
    en: "Crew & extras",
    ar: "الفريق والإضافات",
    tr: "Ekip ve ekstralar",
  },
  "plan.step.renovation": {
    de: "Renovierung",
    en: "Renovation",
    ar: "الترميم",
    tr: "Tadilat",
  },
  "plan.step.cleaning": {
    de: "Reinigung",
    en: "Cleaning",
    ar: "التنظيف",
    tr: "Temizlik",
  },
  "plan.step.disposal": {
    de: "Entrümpelung",
    en: "Junk removal",
    ar: "إزالة المخلّفات",
    tr: "Eşya tahliyesi",
  },
  "plan.step.photos": {
    de: "Fotos",
    en: "Photos",
    ar: "الصور",
    tr: "Fotoğraflar",
  },
  "plan.step.schedule": {
    de: "Termin",
    en: "Schedule",
    ar: "الموعد",
    tr: "Takvim",
  },
  "plan.step.visit": {
    de: "Besichtigung",
    en: "Site visit",
    ar: "الزيارة الميدانية",
    tr: "Yerinde inceleme",
  },
  "plan.step.review": {
    de: "Prüfen & Preis",
    en: "Review & price",
    ar: "المراجعة والسعر",
    tr: "Kontrol ve fiyat",
  },
  "plan.step.reviewRequest": {
    de: "Anfrage prüfen",
    en: "Review request",
    ar: "مراجعة الطلب",
    tr: "Talebi gözden geçir",
  },
  "plan.step.payment": {
    de: "Zahlung",
    en: "Payment",
    ar: "الدفع",
    tr: "Ödeme",
  },
  "plan.copy.services.title": {
    de: "Wobei dürfen wir helfen?",
    en: "What can we take care of?",
    ar: "بماذا يمكننا أن نساعدك؟",
    tr: "Neyle ilgilenebiliriz?",
  },
  "plan.copy.services.lead": {
    de: "Wähle die Leistungen, die du brauchst. Wir bringen sie in einem Plan zusammen.",
    en: "Choose the services you need. We’ll bring them together in one plan.",
    ar: "اختر الخدمات التي تحتاجها. سنجمعها في خطة واحدة.",
    tr: "İhtiyacınız olan hizmetleri seçin. Hepsini tek bir planda birleştirelim.",
  },
  "plan.copy.account.title": {
    de: "Dein Geschäftskonto.",
    en: "Your business account.",
    ar: "حسابك التجاري.",
    tr: "Kurumsal hesabınız.",
  },
  "plan.copy.account.lead": {
    de: "Einmal anmelden. Deine Angaben nutzen wir für die Besichtigung.",
    en: "Sign in once. Your details are reused for the visit.",
    ar: "سجّل الدخول مرة واحدة. سنستخدم بياناتك للزيارة.",
    tr: "Bir kez giriş yapın. Bilgileriniz inceleme için kullanılır.",
  },
  "plan.copy.address.title": {
    de: "Wohin soll es gehen?",
    en: "Where are we taking you?",
    ar: "إلى أين ننقلك؟",
    tr: "Sizi nereye taşıyoruz?",
  },
  "plan.copy.address.lead": {
    de: "Wähle deine Adressen. Wir zeigen sie auf der Karte; die Fahrstrecke berechnen wir mit dem Preis.",
    en: "Choose your locations. We map them and work out the driving distance with your price.",
    ar: "اختر عناوينك. سنعرضها على الخريطة ونحسب مسافة القيادة مع السعر.",
    tr: "Adreslerinizi seçin. Haritada gösteriyor, sürüş mesafesini fiyatla birlikte hesaplıyoruz.",
  },
  "plan.copy.addressAlt.title": {
    de: "Wo können wir helfen?",
    en: "Where can we help you?",
    ar: "أين يمكننا مساعدتك؟",
    tr: "Size nerede yardımcı olabiliriz?",
  },
  "plan.copy.addressAlt.lead": {
    de: "Wähle die Adressen, an denen du unsere Leistungen brauchst.",
    en: "Choose the places where you need our services.",
    ar: "اختر الأماكن التي تحتاج فيها خدماتنا.",
    tr: "Hizmetlerimize ihtiyaç duyduğunuz yerleri seçin.",
  },
  "plan.copy.property.title": {
    de: "Wie kommen wir zu dir?",
    en: "How can we access your places?",
    ar: "كيف نصل إلى أماكنك؟",
    tr: "Mekânlarınıza nasıl ulaşırız?",
  },
  "plan.copy.property.lead": {
    de: "Ein paar kurze Angaben, damit das richtige Team ohne Überraschungen kommt.",
    en: "A few quick details help us bring the right team, without surprises.",
    ar: "بعض التفاصيل السريعة تساعدنا على إحضار الفريق المناسب دون مفاجآت.",
    tr: "Birkaç kısa bilgi, doğru ekibi sürprizsiz getirmemizi sağlar.",
  },
  "plan.copy.home.title": {
    de: "Dein Zuhause, Raum für Raum.",
    en: "Your home, mapped out.",
    ar: "منزلك، غرفة بغرفة.",
    tr: "Eviniz, oda oda.",
  },
  "plan.copy.home.lead": {
    de: "Lege deine Räume an, fülle sie mit dem, was du besitzt, und sag uns, wo wir mit anpacken.",
    en: "Add your spaces, fill them with what you own, and tell us what needs a helping hand.",
    ar: "أضف غرفك، واملأها بما تملك، وأخبرنا بما يحتاج إلى مساعدة.",
    tr: "Odalarınızı ekleyin, eşyalarınızla doldurun ve neyin yardıma ihtiyacı olduğunu söyleyin.",
  },
  "plan.copy.extras.title": {
    de: "Die richtigen Hände für den Job.",
    en: "The right hands for the job.",
    ar: "الأيدي المناسبة للمهمة.",
    tr: "İş için doğru eller.",
  },
  "plan.copy.extras.lead": {
    de: "Wähle dein Umzugsteam und die Extras, die deine Sachen brauchen.",
    en: "Choose your moving team and the extra care your belongings need.",
    ar: "اختر فريق النقل والعناية الإضافية التي تحتاجها أغراضك.",
    tr: "Taşıma ekibinizi ve eşyalarınızın ihtiyaç duyduğu ekstra özeni seçin.",
  },
  "plan.copy.renovation.title": {
    de: "Erzähl uns von der Arbeit.",
    en: "Tell us the work.",
    ar: "أخبرنا عن العمل.",
    tr: "İşi bize anlatın.",
  },
  "plan.copy.renovation.lead": {
    de: "Wähle die Arbeiten und die ungefähre Fläche. Wir schauen sie uns vor Ort an.",
    en: "Choose the work and its approximate area. We’ll assess it on site.",
    ar: "اختر الأعمال ومساحتها التقريبية. سنقيّمها في الموقع.",
    tr: "İşi ve yaklaşık alanını seçin. Yerinde değerlendireceğiz.",
  },
  "plan.copy.cleaning.title": {
    de: "Ein frischer Raum. Ganz nach dir.",
    en: "A fresh space. On your terms.",
    ar: "مساحة نظيفة. على طريقتك.",
    tr: "Ferah bir alan. Sizin koşullarınızda.",
  },
  "plan.copy.cleaning.lead": {
    de: "Sag uns, was gereinigt werden soll. Um die Details kümmern wir uns.",
    en: "Tell us what needs cleaning. We’ll take care of the details.",
    ar: "أخبرنا بما يحتاج إلى تنظيف. سنهتم بالتفاصيل.",
    tr: "Neyin temizlenmesi gerektiğini söyleyin. Ayrıntıları biz hallederiz.",
  },
  "plan.copy.disposal.title": {
    de: "Weniger Kram. Mehr Platz.",
    en: "A little less clutter. A little more space.",
    ar: "فوضى أقل. مساحة أكثر.",
    tr: "Biraz daha az dağınıklık. Biraz daha fazla alan.",
  },
  "plan.copy.disposal.lead": {
    de: "Sag uns, was weg soll und wie wir es erreichen.",
    en: "Tell us what needs to go and how we can reach it.",
    ar: "أخبرنا بما يجب التخلص منه وكيف نصل إليه.",
    tr: "Neyin gideceğini ve ona nasıl ulaşacağımızı söyleyin.",
  },
  "plan.copy.photos.title": {
    de: "Zeig uns die kleinen Details.",
    en: "Show us the little details.",
    ar: "أرنا التفاصيل الصغيرة.",
    tr: "Bize küçük ayrıntıları gösterin.",
  },
  "plan.copy.photos.lead": {
    de: "Optional — Fotos von Räumen, Treppen und engen Stellen helfen uns beim Planen.",
    en: "Optional — photos of rooms, stairs and tight spots help us plan.",
    ar: "اختياري — صور الغرف والسلالم والأماكن الضيقة تساعدنا في التخطيط.",
    tr: "İsteğe bağlı — oda, merdiven ve dar yerlerin fotoğrafları planlamamıza yardımcı olur.",
  },
  "plan.copy.schedule.title": {
    de: "Lass uns einen Termin finden.",
    en: "Let’s make a date of it.",
    ar: "لنحدّد موعداً.",
    tr: "Bir tarih belirleyelim.",
  },
  "plan.copy.schedule.lead": {
    de: "Wähle Tag und Ankunftsfenster, die für dich passen.",
    en: "Choose the day and arrival window that work for you.",
    ar: "اختر اليوم ونافذة الوصول المناسبين لك.",
    tr: "Size uygun günü ve varış aralığını seçin.",
  },
  "plan.copy.visit.title": {
    de: "Ein Termin für die Besichtigung.",
    en: "A time to visit.",
    ar: "موعد للزيارة.",
    tr: "İnceleme için bir zaman.",
  },
  "plan.copy.visit.lead": {
    de: "Wähle einen Wunschtermin für die Besichtigung. Das Team bestätigt ihn.",
    en: "Choose a preferred assessment date. The team will confirm availability.",
    ar: "اختر موعداً مفضلاً للمعاينة. سيؤكد الفريق التوفر.",
    tr: "Tercih ettiğiniz inceleme tarihini seçin. Ekip uygunluğu onaylayacak.",
  },
  "plan.copy.review.title": {
    de: "Dein Plan. Bereit zur Prüfung.",
    en: "Your plan. Ready to review.",
    ar: "خطتك. جاهزة للمراجعة.",
    tr: "Planınız. Gözden geçirmeye hazır.",
  },
  "plan.copy.review.lead": {
    de: "Nimm dir einen Moment und prüfe alles, bevor du weitermachst.",
    en: "Take a moment to check everything before continuing.",
    ar: "خذ لحظة لمراجعة كل شيء قبل المتابعة.",
    tr: "Devam etmeden önce her şeyi kontrol etmek için bir dakikanızı ayırın.",
  },
  "plan.copy.reviewRequest.title": {
    de: "Deine Anfrage im Überblick.",
    en: "Review your visit.",
    ar: "راجع طلب زيارتك.",
    tr: "İnceleme talebinizi gözden geçirin.",
  },
  "plan.copy.reviewRequest.lead": {
    de: "Prüfe die wichtigsten Angaben und fordere dann deine Besichtigung an.",
    en: "Check the main details, then request your assessment.",
    ar: "تحقق من التفاصيل الأساسية ثم اطلب المعاينة.",
    tr: "Temel bilgileri kontrol edin, ardından incelemenizi talep edin.",
  },
  "plan.copy.payment.title": {
    de: "Die letzten Angaben.",
    en: "The last details.",
    ar: "التفاصيل الأخيرة.",
    tr: "Son ayrıntılar.",
  },
  "plan.copy.payment.lead": {
    de: "Prüfe deine Rechnungsdaten und wähle, wie du bezahlen möchtest.",
    en: "Check your billing details and choose how you’d like to pay.",
    ar: "تحقق من بيانات الفوترة واختر طريقة الدفع.",
    tr: "Fatura bilgilerinizi kontrol edin ve nasıl ödemek istediğinizi seçin.",
  },
  "plan.welcome.eyebrow": {
    de: "Dein nächstes Kapitel beginnt hier",
    en: "Your next chapter starts here",
    ar: "فصلك القادم يبدأ هنا",
    tr: "Yeni sayfanız burada başlıyor",
  },
  "plan.welcome.title": {
    de: "Ein Neuanfang. Ganz einfach.",
    en: "A fresh start. Made simple.",
    ar: "بداية جديدة. بكل بساطة.",
    tr: "Yeni bir başlangıç. Basitçe.",
  },
  "plan.welcome.lead": {
    de: "Sag uns, für wen du buchst. Wir bauen den passenden Plan gemeinsam – Schritt für Schritt.",
    en: "Tell us who you’re booking for. We’ll build the right plan together, one small detail at a time.",
    ar: "أخبرنا لمن تحجز. سنبني الخطة المناسبة معاً، خطوة بخطوة.",
    tr: "Kimin için rezervasyon yaptığınızı söyleyin. Doğru planı birlikte, adım adım oluşturalım.",
  },
  "plan.welcome.private.tag": {
    de: "Für dich & dein Zuhause",
    en: "For you & your home",
    ar: "لك ولمنزلك",
    tr: "Sizin ve eviniz için",
  },
  "plan.welcome.private.title": {
    de: "Privatkunde",
    en: "Private customer",
    ar: "عميل خاص",
    tr: "Bireysel müşteri",
  },
  "plan.welcome.private.desc": {
    de: "Umziehen, auffrischen oder ausmisten. Wir kümmern uns um die Details.",
    en: "Moving home, freshening up or clearing out. Let’s take care of the details.",
    ar: "انتقال أو تجديد أو تفريغ. دعنا نهتم بالتفاصيل.",
    tr: "Taşınma, yenileme veya boşaltma. Ayrıntıları biz halledelim.",
  },
  "plan.welcome.private.point1": {
    de: "Ein visuelles Inventar deines Zuhauses",
    en: "A visual inventory of your home",
    ar: "جرد مرئي لمنزلك",
    tr: "Evinizin görsel envanteri",
  },
  "plan.welcome.private.point2": {
    de: "Genau die Hilfe, die du brauchst",
    en: "Choose exactly the help you need",
    ar: "اختر المساعدة التي تحتاجها بالضبط",
    tr: "Tam ihtiyacınız olan yardımı seçin",
  },
  "plan.welcome.private.point3": {
    de: "Ein klarer, aufgeschlüsselter Plan",
    en: "One clear, itemised plan",
    ar: "خطة واضحة ومفصّلة",
    tr: "Tek, net ve ayrıntılı bir plan",
  },
  "plan.welcome.private.cta": {
    de: "Meine Leistungen planen",
    en: "Plan my home services",
    ar: "خطّط لخدمات منزلي",
    tr: "Ev hizmetlerimi planla",
  },
  "plan.welcome.business.tag": {
    de: "Für dein Unternehmen",
    en: "For your organisation",
    ar: "لمؤسستك",
    tr: "Kuruluşunuz için",
  },
  "plan.welcome.business.title": {
    de: "Geschäftskunde",
    en: "Business customer",
    ar: "عميل تجاري",
    tr: "Kurumsal müşteri",
  },
  "plan.welcome.business.desc": {
    de: "Büros, Läden und Gewerbeflächen. Wähle deine Leistungen und vereinbare eine Besichtigung.",
    en: "Offices, shops and commercial spaces. Choose your services and arrange a site visit.",
    ar: "مكاتب ومتاجر ومساحات تجارية. اختر خدماتك ورتّب زيارة ميدانية.",
    tr: "Ofisler, mağazalar ve ticari alanlar. Hizmetlerinizi seçin ve yerinde inceleme ayarlayın.",
  },
  "plan.welcome.business.point1": {
    de: "Deine Kontodaten, wiederverwendet",
    en: "Your account details, reused",
    ar: "بيانات حسابك، تُستخدم من جديد",
    tr: "Hesap bilgileriniz, yeniden kullanılır",
  },
  "plan.welcome.business.point2": {
    de: "Eine Adresse und eine Besichtigung",
    en: "One address and a site visit",
    ar: "عنوان واحد وزيارة ميدانية",
    tr: "Tek adres ve bir yerinde inceleme",
  },
  "plan.welcome.business.point3": {
    de: "Ein maßgeschneidertes Angebot nach Prüfung",
    en: "A tailored quote after assessment",
    ar: "عرض سعر مخصص بعد المعاينة",
    tr: "İncelemeden sonra size özel teklif",
  },
  "plan.welcome.business.cta": {
    de: "Geschäftsbesichtigung vereinbaren",
    en: "Arrange a business visit",
    ar: "رتّب زيارة للشركة",
    tr: "Kurumsal inceleme ayarla",
  },
  "plan.welcome.footTitle": {
    de: "Ein Plan. Alles, was du brauchst.",
    en: "One plan. Everything you need.",
    ar: "خطة واحدة. كل ما تحتاجه.",
    tr: "Tek plan. İhtiyacınız olan her şey.",
  },
  "plan.welcome.footServices": {
    de: "Umzug · Renovierung · Reinigung · Entrümpelung",
    en: "Moving · Renovation · Cleaning · Junk removal",
    ar: "نقل · ترميم · تنظيف · إزالة المخلّفات",
    tr: "Taşınma · Tadilat · Temizlik · Eşya tahliyesi",
  },
  "plan.service.moving": {
    de: "Umzug",
    en: "Moving",
    ar: "النقل",
    tr: "Taşınma",
  },
  "plan.service.renovation": {
    de: "Renovierung",
    en: "Renovation",
    ar: "الترميم",
    tr: "Tadilat",
  },
  "plan.service.cleaning": {
    de: "Reinigung",
    en: "Cleaning",
    ar: "التنظيف",
    tr: "Temizlik",
  },
  "plan.service.disposal": {
    de: "Entrümpelung",
    en: "Junk removal",
    ar: "إزالة المخلّفات",
    tr: "Eşya tahliyesi",
  },
  "plan.service.moving.tagline": {
    de: "Privat- & Firmenumzüge",
    en: "Private & business moves",
    ar: "نقل للأفراد والشركات",
    tr: "Bireysel ve kurumsal taşınma",
  },
  "plan.service.renovation.tagline": {
    de: "Reparaturen & Verschönerungen",
    en: "Repairs & upgrades",
    ar: "إصلاحات وتحسينات",
    tr: "Onarım ve yenileme",
  },
  "plan.service.cleaning.tagline": {
    de: "Wohnungen & Büros",
    en: "Homes & offices",
    ar: "منازل ومكاتب",
    tr: "Evler ve ofisler",
  },
  "plan.service.disposal.tagline": {
    de: "Ausmisten & entsorgen",
    en: "Declutter & dispose",
    ar: "التخلص من الأغراض الزائدة",
    tr: "Ayıklama ve atma",
  },
  "plan.services.groupLabel": {
    de: "Wähle deine Leistungen",
    en: "Choose your services",
    ar: "اختر خدماتك",
    tr: "Hizmetlerinizi seçin",
  },
  "plan.services.getStarted": {
    de: "Loslegen",
    en: "Get started",
    ar: "ابدأ",
    tr: "Başlayın",
  },
  "plan.services.selected": {
    de: "Ausgewählt",
    en: "Selected",
    ar: "تم الاختيار",
    tr: "Seçildi",
  },
  "plan.services.hint": {
    de: "Wähle eine oder mehrere Leistungen. Gemeinsame Angaben fragen wir nur einmal ab.",
    en: "Select one or more services. Shared details are asked only once.",
    ar: "اختر خدمة أو أكثر. نسأل عن التفاصيل المشتركة مرة واحدة فقط.",
    tr: "Bir veya daha fazla hizmet seçin. Ortak bilgiler yalnızca bir kez sorulur.",
  },
  "plan.services.businessHint": {
    de: "Eine Besichtigung für alle ausgewählten Geschäftsleistungen.",
    en: "One site visit for your selected business services.",
    ar: "زيارة ميدانية واحدة لجميع خدماتك التجارية المختارة.",
    tr: "Seçtiğiniz tüm kurumsal hizmetler için tek bir yerinde inceleme.",
  },
  "plan.address.placeholder": {
    de: "Straße, Hausnummer, Ort",
    en: "Street, number, town",
    ar: "الشارع، الرقم، المدينة",
    tr: "Sokak, numara, şehir",
  },
  "plan.address.searching": {
    de: "Suche…",
    en: "Searching…",
    ar: "جارٍ البحث…",
    tr: "Aranıyor…",
  },
  "plan.address.confirmed": {
    de: "Adresse bestätigt",
    en: "Address confirmed",
    ar: "تم تأكيد العنوان",
    tr: "Adres doğrulandı",
  },
  "plan.address.typed": {
    de: "So übernommen, wie eingegeben",
    en: "Kept as typed",
    ar: "تم حفظه كما كُتب",
    tr: "Yazıldığı gibi kaydedildi",
  },
  "plan.address.typedHint": {
    de: "Diese Adresse wurde nicht in der Suche gefunden. Wir übernehmen sie so und prüfen sie mit dem Preis.",
    en: "This address wasn’t found in the search. We’ll keep it as typed and check it with your price.",
    ar: "لم يُعثر على هذا العنوان في البحث. سنحفظه كما كُتب ونتحقق منه مع السعر.",
    tr: "Bu adres aramada bulunamadı. Yazıldığı gibi kaydedip fiyatla birlikte kontrol edeceğiz.",
  },
  "plan.address.noResults": {
    de: "Keine Adresse gefunden. Versuche Straße, Hausnummer und Ort.",
    en: "No address found. Try the full street, number and town.",
    ar: "لم يُعثر على عنوان. جرّب الشارع والرقم والمدينة كاملة.",
    tr: "Adres bulunamadı. Sokak, numara ve şehri tam yazmayı deneyin.",
  },
  "plan.address.unavailable": {
    de: "Die Adresssuche ist gerade nicht verfügbar. Drücke Enter, um die Adresse so zu übernehmen.",
    en: "Address search is unavailable. Press Enter to keep the address as typed.",
    ar: "البحث عن العناوين غير متاح حالياً. اضغط Enter لحفظ العنوان كما كتبته.",
    tr: "Adres araması şu an kullanılamıyor. Adresi yazıldığı gibi kaydetmek için Enter'a basın.",
  },
  "plan.address.outsideNrw": {
    de: "Wähle eine Adresse in Nordrhein-Westfalen.",
    en: "Choose an address within North Rhine-Westphalia.",
    ar: "اختر عنواناً داخل شمال الراين-وستفاليا.",
    tr: "Kuzey Ren-Vestfalya içinde bir adres seçin.",
  },
  "plan.address.outside": {
    de: "Außerhalb von NRW",
    en: "Outside NRW",
    ar: "خارج NRW",
    tr: "NRW dışında",
  },
  "plan.address.tooShort": {
    de: "Bitte gib die vollständige Adresse ein.",
    en: "Please enter the full address.",
    ar: "يرجى إدخال العنوان كاملاً.",
    tr: "Lütfen adresin tamamını girin.",
  },
  "plan.address.collectFrom": {
    de: "Abholen bei",
    en: "Collect from",
    ar: "الاستلام من",
    tr: "Alınacak adres",
  },
  "plan.address.deliverTo": {
    de: "Liefern nach",
    en: "Deliver to",
    ar: "التسليم إلى",
    tr: "Teslim adresi",
  },
  "plan.address.serviceAddress": {
    de: "Adresse für den Einsatz",
    en: "Service address",
    ar: "عنوان الخدمة",
    tr: "Hizmet adresi",
  },
  "plan.address.yourRoute": {
    de: "Deine Strecke",
    en: "Your route",
    ar: "مسارك",
    tr: "Güzergâhınız",
  },
  "plan.address.location": {
    de: "Standort",
    en: "Location",
    ar: "الموقع",
    tr: "Konum",
  },
  "plan.address.distanceLater": {
    de: "Fahrstrecke kommt mit dem Preis",
    en: "Driving distance comes with your price",
    ar: "مسافة القيادة تأتي مع السعر",
    tr: "Sürüş mesafesi fiyatla birlikte gelir",
  },
  "plan.address.emptyRouteTitle": {
    de: "Deine Strecke auf einen Blick",
    en: "Your journey, mapped out",
    ar: "رحلتك على الخريطة",
    tr: "Yolculuğunuz haritada",
  },
  "plan.address.emptyRouteText": {
    de: "Wähle Abhol- und Zieladresse, um sie auf der Karte zu sehen.",
    en: "Select your pickup and destination to see them on the map.",
    ar: "اختر عنوان الاستلام والوجهة لرؤيتهما على الخريطة.",
    tr: "Haritada görmek için alış ve varış adresinizi seçin.",
  },
  "plan.address.emptyLocationTitle": {
    de: "Dein Standort auf einen Blick",
    en: "Your location, at a glance",
    ar: "موقعك بنظرة واحدة",
    tr: "Konumunuz bir bakışta",
  },
  "plan.address.emptyLocationText": {
    de: "Wähle die Adresse, an der du unsere Leistung brauchst.",
    en: "Choose the address where you need our service.",
    ar: "اختر العنوان الذي تحتاج فيه خدمتنا.",
    tr: "Hizmetimize ihtiyaç duyduğunuz adresi seçin.",
  },
  "plan.address.nrwOnly": {
    de: "Wir sind nur in Nordrhein-Westfalen (NRW) tätig. Alle Adressen müssen in NRW liegen.",
    en: "We operate in North Rhine-Westphalia (NRW) only. All addresses must be in NRW.",
    ar: "نعمل في شمال الراين-وستفاليا (NRW) فقط. يجب أن تكون جميع العناوين في NRW.",
    tr: "Yalnızca Kuzey Ren-Vestfalya'da (NRW) hizmet veriyoruz. Tüm adresler NRW'de olmalıdır.",
  },
  "plan.address.whereEach": {
    de: "Wo brauchst du welche Leistung?",
    en: "Where do you need each service?",
    ar: "أين تحتاج كل خدمة؟",
    tr: "Her hizmete nerede ihtiyacınız var?",
  },
  "plan.address.whereEachSub": {
    de: "Wähle eine Adresse oder füge eine weitere hinzu. Jeder Ort hat eigene Angaben und einen eigenen Termin.",
    en: "Select an address, or add another. Each location has its own details and date.",
    ar: "اختر عنواناً أو أضف آخر. لكل موقع تفاصيله وموعده الخاص.",
    tr: "Bir adres seçin veya başka ekleyin. Her konumun kendi ayrıntıları ve tarihi vardır.",
  },
  "plan.address.chooseFor": {
    de: "Adressen für {service}",
    en: "Locations for {service}",
    ar: "مواقع {service}",
    tr: "{service} için konumlar",
  },
  "plan.address.newFor": {
    de: "Neue Adresse für {service}",
    en: "New address for {service}",
    ar: "عنوان جديد لـ {service}",
    tr: "{service} için yeni adres",
  },
  "plan.address.addNew": {
    de: "Neue Adresse hinzufügen",
    en: "Add a new address",
    ar: "إضافة عنوان جديد",
    tr: "Yeni adres ekle",
  },
  "plan.map.pick": {
    de: "Auf der Karte wählen",
    en: "Pick on the map",
    ar: "حدّد على الخريطة",
    tr: "Haritada seç",
  },
  "plan.map.kicker": {
    de: "Adresse auf der Karte",
    en: "Address on the map",
    ar: "العنوان على الخريطة",
    tr: "Haritada adres",
  },
  "plan.map.pickHint": {
    de: "Klicke auf die Karte oder zieh die Markierung zu deinem Eingang.",
    en: "Click the map or drag the pin to your entrance.",
    ar: "انقر على الخريطة أو اسحب الدبوس إلى مدخلك.",
    tr: "Haritaya tıklayın veya iğneyi girişinize sürükleyin.",
  },
  "plan.map.searchLabel": {
    de: "Adresse auf der Karte suchen",
    en: "Search an address on the map",
    ar: "ابحث عن عنوان على الخريطة",
    tr: "Haritada adres ara",
  },
  "plan.map.search": {
    de: "Suchen",
    en: "Search",
    ar: "بحث",
    tr: "Ara",
  },
  "plan.map.use": {
    de: "Diese Adresse verwenden",
    en: "Use this address",
    ar: "استخدم هذا العنوان",
    tr: "Bu adresi kullan",
  },
  "plan.map.resolving": {
    de: "Adresse wird ermittelt…",
    en: "Finding the address…",
    ar: "جارٍ تحديد العنوان…",
    tr: "Adres bulunuyor…",
  },
  "plan.map.notFound": {
    de: "Hier gibt es keine Straßenadresse. Setze die Markierung auf ein Gebäude.",
    en: "There is no street address here. Place the pin on a building.",
    ar: "لا يوجد عنوان شارع هنا. ضع الدبوس على مبنى.",
    tr: "Burada sokak adresi yok. İğneyi bir binanın üzerine koyun.",
  },
  "plan.map.lookupFailed": {
    de: "Die Adresse konnte gerade nicht ermittelt werden. Bitte versuch es noch einmal.",
    en: "The address could not be found right now. Please try again.",
    ar: "تعذّر تحديد العنوان الآن. يرجى المحاولة مرة أخرى.",
    tr: "Adres şu anda bulunamadı. Lütfen tekrar deneyin.",
  },
  "plan.map.loadFailed": {
    de: "Die Karte kann gerade nicht geladen werden. Gib die Adresse stattdessen im Adressfeld ein.",
    en: "The map can’t be loaded right now. Type the address in the address field instead.",
    ar: "تعذّر تحميل الخريطة الآن. اكتب العنوان في حقل العنوان بدلاً من ذلك.",
    tr: "Harita şu anda yüklenemiyor. Bunun yerine adresi adres alanına yazın.",
  },
  "plan.map.label": {
    de: "Karte deiner Adressen. Mit den Pfeiltasten verschieben, mit Plus und Minus zoomen.",
    en: "Map of your addresses. Use the arrow keys to pan and plus or minus to zoom.",
    ar: "خريطة عناوينك. استخدم مفاتيح الأسهم للتحريك و+ أو - للتكبير.",
    tr: "Adreslerinizin haritası. Kaydırmak için ok tuşlarını, yakınlaştırmak için artı ve eksiyi kullanın.",
  },
  "plan.map.zoomIn": {
    de: "Vergrößern",
    en: "Zoom in",
    ar: "تكبير",
    tr: "Yakınlaştır",
  },
  "plan.map.zoomOut": {
    de: "Verkleinern",
    en: "Zoom out",
    ar: "تصغير",
    tr: "Uzaklaştır",
  },
  "plan.map.fit": {
    de: "Alle Orte zeigen",
    en: "Fit all locations",
    ar: "عرض كل المواقع",
    tr: "Tüm konumları göster",
  },
  "plan.map.schematic": {
    de: "Schematische Karte · Lage nach Koordinaten",
    en: "Schematic map · placed by coordinates",
    ar: "خريطة تخطيطية · المواقع حسب الإحداثيات",
    tr: "Şematik harita · koordinatlara göre",
  },
  "plan.property.pickup.title": {
    de: "Abholort",
    en: "Pickup location",
    ar: "موقع الاستلام",
    tr: "Alış noktası",
  },
  "plan.property.pickup.sub": {
    de: "Wie erreichen wir deine Sachen?",
    en: "How can we reach your belongings?",
    ar: "كيف نصل إلى أغراضك؟",
    tr: "Eşyalarınıza nasıl ulaşırız?",
  },
  "plan.property.delivery.title": {
    de: "Lieferort",
    en: "Delivery location",
    ar: "موقع التسليم",
    tr: "Teslim noktası",
  },
  "plan.property.delivery.sub": {
    de: "Wie erreichen wir dein neues Zuhause?",
    en: "How can we reach your new place?",
    ar: "كيف نصل إلى مكانك الجديد؟",
    tr: "Yeni yerinize nasıl ulaşırız?",
  },
  "plan.property.collection.title": {
    de: "Abholort für die Entrümpelung",
    en: "Collection location",
    ar: "موقع جمع المخلّفات",
    tr: "Toplama noktası",
  },
  "plan.property.collection.sub": {
    de: "Wie erreichen wir die Sachen, die weg sollen?",
    en: "How can we reach the collection point?",
    ar: "كيف نصل إلى مكان الجمع؟",
    tr: "Toplama noktasına nasıl ulaşırız?",
  },
  "plan.property.address": {
    de: "Adresse",
    en: "Address",
    ar: "العنوان",
    tr: "Adres",
  },
  "plan.property.floor": {
    de: "Welches Stockwerk?",
    en: "Which floor?",
    ar: "أي طابق؟",
    tr: "Hangi kat?",
  },
  "plan.property.chooseFloor": {
    de: "Stockwerk wählen",
    en: "Select a floor",
    ar: "اختر الطابق",
    tr: "Kat seçin",
  },
  "plan.property.lift": {
    de: "Aufzug vorhanden",
    en: "Elevator available",
    ar: "يوجد مصعد",
    tr: "Asansör var",
  },
  "plan.property.fit": {
    de: "Was passt in den Aufzug?",
    en: "What will fit in the elevator?",
    ar: "ما الذي يتسع في المصعد؟",
    tr: "Asansöre ne sığar?",
  },
  "plan.property.fit.all": {
    de: "Alle Möbel",
    en: "All furniture",
    ar: "كل الأثاث",
    tr: "Tüm mobilyalar",
  },
  "plan.property.fit.small": {
    de: "Nur kleine Teile",
    en: "Small items only",
    ar: "القطع الصغيرة فقط",
    tr: "Yalnızca küçük eşyalar",
  },
  "plan.property.fit.unsure": {
    de: "Ich bin nicht sicher",
    en: "I’m not sure",
    ar: "لست متأكداً",
    tr: "Emin değilim",
  },
  "plan.property.parking": {
    de: "Parken für den LKW",
    en: "Truck parking",
    ar: "موقف الشاحنة",
    tr: "Kamyon parkı",
  },
  "plan.property.chooseParking": {
    de: "Wo kann der LKW parken?",
    en: "Where can the truck park?",
    ar: "أين يمكن أن تقف الشاحنة؟",
    tr: "Kamyon nereye park edebilir?",
  },
  "plan.parking.driveway": {
    de: "Einfahrt",
    en: "Driveway",
    ar: "ممر خاص",
    tr: "Garaj yolu",
  },
  "plan.parking.streetClose": {
    de: "Auf der Straße — kurzer Weg",
    en: "On the street — close walk",
    ar: "في الشارع — مسافة قصيرة",
    tr: "Sokakta — kısa yürüme",
  },
  "plan.parking.streetMedium": {
    de: "Auf der Straße — mittlerer Weg",
    en: "On the street — somewhat close walk",
    ar: "في الشارع — مسافة متوسطة",
    tr: "Sokakta — orta mesafe",
  },
  "plan.parking.lotClose": {
    de: "Parkplatz / Laderampe — kurzer Weg",
    en: "Parking lot / loading dock — close walk",
    ar: "موقف / رصيف تحميل — مسافة قصيرة",
    tr: "Otopark / yükleme rampası — kısa yürüme",
  },
  "plan.parking.lotMedium": {
    de: "Parkplatz / Laderampe — mittlerer Weg",
    en: "Parking lot / loading dock — somewhat close walk",
    ar: "موقف / رصيف تحميل — مسافة متوسطة",
    tr: "Otopark / yükleme rampası — orta mesafe",
  },
  "plan.parking.lotFar": {
    de: "Parkplatz / Laderampe — weiter Weg",
    en: "Parking lot / loading dock — far walk",
    ar: "موقف / رصيف تحميل — مسافة بعيدة",
    tr: "Otopark / yükleme rampası — uzak",
  },
  "plan.property.notes": {
    de: "Hinweise zum Zugang",
    en: "Access notes",
    ar: "ملاحظات الوصول",
    tr: "Erişim notları",
  },
  "plan.property.notesPlaceholder": {
    de: "z. B. enge Treppe, Innenhof oder Halteverbot",
    en: "e.g. narrow stairs, a courtyard or parking restrictions",
    ar: "مثلاً: سلالم ضيقة، فناء داخلي أو قيود على الوقوف",
    tr: "örn. dar merdiven, avlu veya park kısıtlaması",
  },
  "plan.property.methodTitle": {
    de: "Wie sollen wir deinen Umzug berechnen?",
    en: "How should we calculate your move?",
    ar: "كيف نحسب انتقالك؟",
    tr: "Taşınmanızı nasıl hesaplayalım?",
  },
  "plan.property.byItems": {
    de: "Nach Gegenständen",
    en: "By items",
    ar: "حسب الأغراض",
    tr: "Eşyaya göre",
  },
  "plan.property.byItemsHint": {
    de: "Liste auf, was du mitnimmst — Stück für Stück",
    en: "List what you’re moving, item by item",
    ar: "اذكر ما ستنقله، قطعة بقطعة",
    tr: "Taşıyacaklarınızı tek tek listeleyin",
  },
  "plan.property.byArea": {
    de: "Nach Wohnfläche",
    en: "By area",
    ar: "حسب المساحة",
    tr: "Alana göre",
  },
  "plan.property.byAreaHint": {
    de: "Schätzung anhand der Größe deines Zuhauses",
    en: "Estimate based on the size of your home",
    ar: "تقدير بناءً على مساحة منزلك",
    tr: "Evinizin büyüklüğüne göre tahmin",
  },
  "plan.floor.basement": {
    de: "Keller",
    en: "Basement",
    ar: "القبو",
    tr: "Bodrum",
  },
  "plan.floor.ground": {
    de: "Erdgeschoss",
    en: "Ground floor",
    ar: "الطابق الأرضي",
    tr: "Zemin kat",
  },
  "plan.floor.nth": {
    de: "{n}. Stock",
    en: "Floor {n}",
    ar: "الطابق {n}",
    tr: "{n}. kat",
  },
  "plan.floor.tenPlus": {
    de: "10. Stock oder höher",
    en: "10th floor or higher",
    ar: "الطابق العاشر أو أعلى",
    tr: "10. kat veya üstü",
  },
  "plan.room.living": {
    de: "Wohnzimmer",
    en: "Living room",
    ar: "غرفة المعيشة",
    tr: "Oturma odası",
  },
  "plan.room.bedroom": {
    de: "Schlafzimmer",
    en: "Bedroom",
    ar: "غرفة النوم",
    tr: "Yatak odası",
  },
  "plan.room.kitchen": {
    de: "Küche",
    en: "Kitchen",
    ar: "المطبخ",
    tr: "Mutfak",
  },
  "plan.room.dining": {
    de: "Esszimmer",
    en: "Dining room",
    ar: "غرفة الطعام",
    tr: "Yemek odası",
  },
  "plan.room.office": {
    de: "Arbeitszimmer",
    en: "Home office",
    ar: "المكتب المنزلي",
    tr: "Çalışma odası",
  },
  "plan.room.kids": {
    de: "Kinderzimmer",
    en: "Kids’ room",
    ar: "غرفة الأطفال",
    tr: "Çocuk odası",
  },
  "plan.room.bathroom": {
    de: "Badezimmer",
    en: "Bathroom",
    ar: "الحمّام",
    tr: "Banyo",
  },
  "plan.room.hallway": {
    de: "Flur",
    en: "Hallway",
    ar: "الممر",
    tr: "Koridor",
  },
  "plan.room.balcony": {
    de: "Balkon / Terrasse",
    en: "Balcony / terrace",
    ar: "الشرفة / التراس",
    tr: "Balkon / teras",
  },
  "plan.room.cellar": {
    de: "Keller / Abstellraum",
    en: "Cellar / storage",
    ar: "القبو / المخزن",
    tr: "Bodrum / depo",
  },
  "plan.room.garage": {
    de: "Garage",
    en: "Garage",
    ar: "المرآب",
    tr: "Garaj",
  },
  "plan.room.other": {
    de: "Weiterer Raum",
    en: "Other space",
    ar: "مساحة أخرى",
    tr: "Diğer alan",
  },
  "plan.home.kicker": {
    de: "Dein Zuhause, dein Weg",
    en: "Your home, your way",
    ar: "منزلك، على طريقتك",
    tr: "Eviniz, sizin tarzınız",
  },
  "plan.home.statRooms": {
    de: "Räume & Bereiche",
    en: "rooms & spaces",
    ar: "غرف ومساحات",
    tr: "oda ve alan",
  },
  "plan.home.statItems": {
    de: "Teile zum Umzug",
    en: "items to move",
    ar: "أغراض للنقل",
    tr: "taşınacak eşya",
  },
  "plan.home.statVolume": {
    de: "geschätztes Volumen",
    en: "estimated volume",
    ar: "الحجم المقدّر",
    tr: "tahmini hacim",
  },
  "plan.home.checkedOf": {
    de: "{checked} von {total}",
    en: "{checked} of {total}",
    ar: "{checked} من {total}",
    tr: "{checked}/{total}",
  },
  "plan.home.roomsChecked": {
    de: "Räume geprüft",
    en: "rooms checked",
    ar: "غرف تمت مراجعتها",
    tr: "oda kontrol edildi",
  },
  "plan.home.mapTitle": {
    de: "Dein Zuhause, Raum für Raum",
    en: "Your home, room by room",
    ar: "منزلك، غرفة بغرفة",
    tr: "Eviniz, oda oda",
  },
  "plan.home.mapHint": {
    de: "Wähle einen Raum, um zu sehen, was drin ist",
    en: "Choose a room to see what’s inside",
    ar: "اختر غرفة لترى ما بداخلها",
    tr: "İçinde ne olduğunu görmek için bir oda seçin",
  },
  "plan.home.itemsCount": {
    de: { one: "{count} Teil", other: "{count} Teile" },
    en: { one: "{count} item", other: "{count} items" },
    ar: { zero: "لا أغراض", one: "غرض واحد", two: "غرضان", few: "{count} أغراض", many: "{count} غرضاً", other: "{count} غرض" },
    tr: { one: "{count} eşya", other: "{count} eşya" },
  },
  "plan.home.addRoom": {
    de: "Raum hinzufügen",
    en: "Add a room",
    ar: "إضافة غرفة",
    tr: "Oda ekle",
  },
  "plan.home.addRoomHint": {
    de: "Noch ein Raum zum Umziehen?",
    en: "Another space to move?",
    ar: "مساحة أخرى للنقل؟",
    tr: "Taşınacak başka bir alan mı?",
  },
  "plan.home.addRoomTitle": {
    de: "Welchen Raum möchtest du hinzufügen?",
    en: "Which space would you like to add?",
    ar: "أي مساحة تريد إضافتها؟",
    tr: "Hangi alanı eklemek istersiniz?",
  },
  "plan.home.noRooms": {
    de: "Lege deinen ersten Raum an, um dein Zuhause zu erfassen.",
    en: "Add your first room to start listing your home.",
    ar: "أضف غرفتك الأولى لتبدأ جرد منزلك.",
    tr: "Evinizi listelemeye başlamak için ilk odanızı ekleyin.",
  },
  "plan.home.roomName": {
    de: "Name des Raums",
    en: "Room name",
    ar: "اسم الغرفة",
    tr: "Oda adı",
  },
  "plan.home.rename": {
    de: "Raum umbenennen",
    en: "Rename room",
    ar: "إعادة تسمية الغرفة",
    tr: "Odayı yeniden adlandır",
  },
  "plan.home.duplicate": {
    de: "Raum duplizieren",
    en: "Duplicate room",
    ar: "تكرار الغرفة",
    tr: "Odayı çoğalt",
  },
  "plan.home.removeRoom": {
    de: "Raum entfernen",
    en: "Remove room",
    ar: "إزالة الغرفة",
    tr: "Odayı kaldır",
  },
  "plan.home.removeRoomConfirm": {
    de: "Diesen Raum mit allen Teilen entfernen?",
    en: "Remove this room and everything in it?",
    ar: "هل تريد إزالة هذه الغرفة وكل ما فيها؟",
    tr: "Bu oda ve içindeki her şey kaldırılsın mı?",
  },
  "plan.home.whatsInside": {
    de: "Was ist in diesem Raum?",
    en: "What’s in this room?",
    ar: "ماذا يوجد في هذه الغرفة؟",
    tr: "Bu odada ne var?",
  },
  "plan.home.customItem": {
    de: "Eigener Eintrag",
    en: "Custom item",
    ar: "غرض مخصص",
    tr: "Özel eşya",
  },
  "plan.home.addItems": {
    de: "Teile hinzufügen",
    en: "Add items",
    ar: "إضافة أغراض",
    tr: "Eşya ekle",
  },
  "plan.home.searchLabel": {
    de: "Teil für {room} suchen",
    en: "Search an item for {room}",
    ar: "ابحث عن غرض لـ {room}",
    tr: "{room} için eşya ara",
  },
  "plan.home.searchPlaceholder": {
    de: "Teil für {room} suchen oder hinzufügen",
    en: "Search or add an item to {room}",
    ar: "ابحث أو أضف غرضاً إلى {room}",
    tr: "{room} için eşya ara veya ekle",
  },
  "plan.home.noMatch": {
    de: "Nicht im Katalog gefunden.",
    en: "Not found in the catalogue.",
    ar: "غير موجود في الكتالوج.",
    tr: "Katalogda bulunamadı.",
  },
  "plan.home.addAsCustom": {
    de: "„{name}“ als eigenen Eintrag hinzufügen",
    en: "Add “{name}” as a custom item",
    ar: "أضف «{name}» كغرض مخصص",
    tr: "“{name}” özel eşya olarak ekle",
  },
  "plan.home.emptyRoom": {
    de: "Noch leer. Suche ein Teil oder öffne den Katalog.",
    en: "Nothing here yet. Search for an item or open the catalogue.",
    ar: "لا شيء هنا بعد. ابحث عن غرض أو افتح الكتالوج.",
    tr: "Henüz boş. Bir eşya arayın veya kataloğu açın.",
  },
  "plan.home.perItem": {
    de: "ca. {volume} m³ / Stück",
    en: "~{volume} m³ / item",
    ar: "حوالي {volume} م³ / قطعة",
    tr: "~{volume} m³ / adet",
  },
  "plan.home.volumeUnknown": {
    de: "Volumen unbekannt",
    en: "Volume unknown",
    ar: "الحجم غير معروف",
    tr: "Hacim bilinmiyor",
  },
  "plan.home.customBadge": {
    de: "eigener Eintrag",
    en: "custom item",
    ar: "غرض مخصص",
    tr: "özel eşya",
  },
  "plan.home.preparation": {
    de: "Vorbereitung",
    en: "Preparation",
    ar: "التحضير",
    tr: "Hazırlık",
  },
  "plan.home.roomChecked": {
    de: "Ich habe diesen Raum geprüft. Es fehlt nichts.",
    en: "I’ve checked this room. Nothing to add.",
    ar: "راجعت هذه الغرفة. لا شيء لإضافته.",
    tr: "Bu odayı kontrol ettim. Eklenecek bir şey yok.",
  },
  "plan.home.nextRoom": {
    de: "Nächster Raum",
    en: "Next room",
    ar: "الغرفة التالية",
    tr: "Sonraki oda",
  },
  "plan.home.catalogTitle": {
    de: "Teile für {room}",
    en: "Items for {room}",
    ar: "أغراض لـ {room}",
    tr: "{room} için eşyalar",
  },
  "plan.home.categories": {
    de: "Kategorien",
    en: "Categories",
    ar: "الفئات",
    tr: "Kategoriler",
  },
  "plan.home.addAnother": {
    de: "Noch eins ({count})",
    en: "Add another ({count})",
    ar: "إضافة واحد آخر ({count})",
    tr: "Bir tane daha ({count})",
  },
  "plan.home.customTitle": {
    de: "Eigenen Eintrag hinzufügen",
    en: "Add a custom item",
    ar: "إضافة غرض مخصص",
    tr: "Özel eşya ekle",
  },
  "plan.home.customNote": {
    de: "Nicht im Katalog? Kein Problem. Eigene Einträge sind nicht im Preis enthalten — das Team prüft sie und bestätigt den Aufwand.",
    en: "Not in the catalogue? No problem. Custom items aren’t in the price — the team reviews them and confirms the effort.",
    ar: "غير موجود في الكتالوج؟ لا مشكلة. الأغراض المخصصة ليست ضمن السعر — سيراجعها الفريق ويؤكد الجهد المطلوب.",
    tr: "Katalogda yok mu? Sorun değil. Özel eşyalar fiyata dahil değildir — ekip inceleyip gereken eforu onaylar.",
  },
  "plan.home.customName": {
    de: "Bezeichnung",
    en: "Name",
    ar: "الاسم",
    tr: "Ad",
  },
  "plan.home.customCount": {
    de: "Anzahl",
    en: "Quantity",
    ar: "الكمية",
    tr: "Adet",
  },
  "plan.home.customVolume": {
    de: "Volumen pro Stück",
    en: "Volume per item",
    ar: "الحجم لكل قطعة",
    tr: "Adet başına hacim",
  },
  "plan.home.customNotes": {
    de: "Beschreibung",
    en: "Description",
    ar: "الوصف",
    tr: "Açıklama",
  },
  "plan.home.customNotesPlaceholder": {
    de: "z. B. Maße, Gewicht, empfindlich",
    en: "e.g. size, weight, fragile",
    ar: "مثلاً: المقاسات، الوزن، قابل للكسر",
    tr: "örn. ölçü, ağırlık, kırılgan",
  },
  "plan.home.customSave": {
    de: "Eintrag hinzufügen",
    en: "Add item",
    ar: "إضافة الغرض",
    tr: "Eşyayı ekle",
  },
  "plan.home.acceptExtra": {
    de: "Ich verstehe: Findet das Team am Umzugstag Gegenstände, die nicht in meinem Inventar stehen, werden sie zusätzlich berechnet.",
    en: "I understand that if the team finds items on moving day that are not listed in my inventory, they will be charged as extra.",
    ar: "أفهم أنه إذا وجد الفريق يوم النقل أغراضاً غير مدرجة في الجرد، فسيتم احتسابها كإضافة.",
    tr: "Taşınma günü envanterimde olmayan eşyalar bulunursa ek ücretlendirileceğini anlıyorum.",
  },
  "plan.home.specialTitle": {
    de: "Besondere Gegenstände",
    en: "Special items",
    ar: "أغراض خاصة",
    tr: "Özel eşyalar",
  },
  "plan.home.specialSub": {
    de: "Zum Beispiel ein Klavier oder ein Tresor",
    en: "For example a piano or a safe",
    ar: "مثلاً بيانو أو خزنة",
    tr: "Örneğin piyano veya kasa",
  },
  "plan.home.specialAdd": {
    de: "Besonderen Gegenstand hinzufügen",
    en: "Add a special item",
    ar: "إضافة غرض خاص",
    tr: "Özel eşya ekle",
  },
  "plan.home.specialChoose": {
    de: "Art wählen",
    en: "Choose a type",
    ar: "اختر النوع",
    tr: "Tür seçin",
  },
  "plan.home.specialNotes": {
    de: "Hinweise zu {name}",
    en: "Notes on {name}",
    ar: "ملاحظات حول {name}",
    tr: "{name} hakkında notlar",
  },
  "plan.home.specialNotesPlaceholder": {
    de: "z. B. Gewicht, Maße, Stockwerk",
    en: "e.g. weight, size, floor",
    ar: "مثلاً: الوزن، المقاسات، الطابق",
    tr: "örn. ağırlık, ölçü, kat",
  },
  "plan.home.specialPriceNote": {
    de: "Besondere Gegenstände brauchen besondere Handhabung. Das Team bestätigt Aufwand und Preis vor dem Umzug.",
    en: "Special items need special handling. The team confirms the effort and price before the move.",
    ar: "تحتاج الأغراض الخاصة إلى تعامل خاص. سيؤكد الفريق الجهد والسعر قبل النقل.",
    tr: "Özel eşyalar özel taşıma gerektirir. Ekip, taşınmadan önce efor ve fiyatı onaylar.",
  },
  "plan.home.areaTitle": {
    de: "Wie groß ist dein Zuhause?",
    en: "How big is your home?",
    ar: "ما مساحة منزلك؟",
    tr: "Eviniz ne büyüklükte?",
  },
  "plan.home.areaSub": {
    de: "Die Wohnfläche ist die Grundlage für den Preis.",
    en: "The living area is the basis of your price.",
    ar: "المساحة السكنية هي أساس السعر.",
    tr: "Yaşam alanı fiyatınızın temelidir.",
  },
  "plan.home.livingArea": {
    de: "Wohnfläche",
    en: "Living area",
    ar: "المساحة السكنية",
    tr: "Yaşam alanı",
  },
  "plan.home.areaEstimate": {
    de: "Das sind etwa {volume} m³ Umzugsgut — für die Team-Empfehlung, nicht für den Preis.",
    en: "That is roughly {volume} m³ of belongings — used for the crew advice, not the price.",
    ar: "هذا يعادل تقريباً {volume} م³ من الأغراض — يُستخدم لتوصية الفريق وليس للسعر.",
    tr: "Bu yaklaşık {volume} m³ eşya demek — ekip önerisi için kullanılır, fiyat için değil.",
  },
  "plan.home.assemblyTitle": {
    de: "Muss etwas ab- oder aufgebaut werden?",
    en: "Does anything need dismantling?",
    ar: "هل يحتاج شيء إلى فك أو تركيب؟",
    tr: "Sökülmesi gereken bir şey var mı?",
  },
  "plan.home.assemblySub": {
    de: "Zum Beispiel Betten, Schränke oder die Küche.",
    en: "For example beds, wardrobes or the kitchen.",
    ar: "مثلاً الأسرّة أو الخزائن أو المطبخ.",
    tr: "Örneğin yataklar, dolaplar veya mutfak.",
  },
  "plan.home.assemblyAdd": {
    de: "Möbelstück hinzufügen",
    en: "Add a piece of furniture",
    ar: "إضافة قطعة أثاث",
    tr: "Mobilya ekle",
  },
  "plan.home.assemblyChoose": {
    de: "Möbelstück wählen",
    en: "Choose an item",
    ar: "اختر قطعة",
    tr: "Eşya seçin",
  },
  "plan.prep.unanswered": {
    de: "Vorbereitung wählen",
    en: "Choose preparation",
    ar: "اختر التحضير",
    tr: "Hazırlık seçin",
  },
  "plan.prep.ready": {
    de: "Transportbereit",
    en: "Ready to move",
    ar: "جاهز للنقل",
    tr: "Taşımaya hazır",
  },
  "plan.prep.dis": {
    de: "Team baut ab",
    en: "Team dismantles",
    ar: "الفريق يفكّ",
    tr: "Ekip söker",
  },
  "plan.prep.re": {
    de: "Team baut auf",
    en: "Team reassembles",
    ar: "الفريق يركّب",
    tr: "Ekip kurar",
  },
  "plan.prep.both": {
    de: "Team baut ab & auf",
    en: "Team dismantles & reassembles",
    ar: "الفريق يفكّ ويركّب",
    tr: "Ekip söker ve kurar",
  },
  "plan.special.piano": {
    de: "Klavier / Flügel",
    en: "Piano (upright/grand)",
    ar: "بيانو",
    tr: "Piyano",
  },
  "plan.special.safe": {
    de: "Tresor",
    en: "Safe / strongbox",
    ar: "خزنة",
    tr: "Kasa",
  },
  "plan.special.aquarium": {
    de: "Aquarium / Terrarium",
    en: "Aquarium / vivarium",
    ar: "حوض أسماك",
    tr: "Akvaryum / teraryum",
  },
  "plan.special.gym": {
    de: "Fitnessgerät",
    en: "Gym equipment",
    ar: "معدات رياضية",
    tr: "Spor aleti",
  },
  "plan.special.heavy": {
    de: "Sehr schwerer Gegenstand (>100 kg)",
    en: "Very heavy item (>100 kg)",
    ar: "غرض ثقيل جداً (أكثر من 100 كغ)",
    tr: "Çok ağır eşya (>100 kg)",
  },
  "plan.special.artwork": {
    de: "Kunstwerk / Spiegel",
    en: "Fragile artwork / mirror",
    ar: "عمل فني / مرآة",
    tr: "Sanat eseri / ayna",
  },
  "plan.extras.title": {
    de: "Team & Extras",
    en: "Crew & extras",
    ar: "الفريق والإضافات",
    tr: "Ekip ve ekstralar",
  },
  "plan.extras.sub": {
    de: "Wähle die Hilfe, die du brauchst. Die Möbel-Details bleiben in deinem Inventar.",
    en: "Choose the extra help you need. Item details stay in your home inventory.",
    ar: "اختر المساعدة الإضافية التي تحتاجها. تفاصيل الأغراض تبقى في جرد منزلك.",
    tr: "İhtiyacınız olan ek yardımı seçin. Eşya ayrıntıları ev envanterinizde kalır.",
  },
  "plan.extras.insurance": {
    de: "Transportversicherung",
    en: "Transport insurance",
    ar: "تأمين النقل",
    tr: "Taşıma sigortası",
  },
  "plan.extras.insuranceHint": {
    de: "Zusätzlicher Schutz für deine Sachen während des Umzugs.",
    en: "Extra cover for your belongings during the move.",
    ar: "حماية إضافية لأغراضك أثناء النقل.",
    tr: "Taşınma sırasında eşyalarınız için ek güvence.",
  },
  "plan.extras.packing": {
    de: "Packservice",
    en: "Packing service",
    ar: "خدمة التغليف",
    tr: "Paketleme hizmeti",
  },
  "plan.extras.packingHint": {
    de: "Wir packen und schützen deine Sachen fachgerecht.",
    en: "We pack and protect your belongings professionally.",
    ar: "نغلّف أغراضك ونحميها باحترافية.",
    tr: "Eşyalarınızı profesyonelce paketleyip koruruz.",
  },
  "plan.extras.parkingZone": {
    de: "Halteverbotszone",
    en: "No-parking zone",
    ar: "منطقة منع الوقوف",
    tr: "Park yasağı alanı",
  },
  "plan.extras.parkingZoneHint": {
    de: "Wir beantragen und stellen die Halteverbotsschilder für den LKW.",
    en: "We apply for and set up the no-parking signs for the truck.",
    ar: "نتقدم بطلب ونضع لافتات منع الوقوف للشاحنة.",
    tr: "Kamyon için park yasağı tabelalarını başvurup kurarız.",
  },
  "plan.extras.team": {
    de: "Umzugsteam",
    en: "Moving team",
    ar: "فريق النقل",
    tr: "Taşıma ekibi",
  },
  "plan.extras.teamAdvice": {
    de: "Für {volume} m³ empfehlen wir {crew} Umzugshelfer.",
    en: "For {volume} m³ we recommend {crew} movers.",
    ar: "لـ {volume} م³ نوصي بـ {crew} عمّال.",
    tr: "{volume} m³ için {crew} taşıyıcı öneriyoruz.",
  },
  "plan.extras.teamHint": {
    de: "Zwei oder drei Umzugshelfer.",
    en: "Two or three movers.",
    ar: "عاملان أو ثلاثة.",
    tr: "İki veya üç taşıyıcı.",
  },
  "plan.extras.useAdvice": {
    de: "Empfehlung übernehmen",
    en: "Use the advice",
    ar: "اعتماد التوصية",
    tr: "Öneriyi kullan",
  },
  "plan.extras.secondVan": {
    de: "Zweiter Transporter",
    en: "Second van",
    ar: "شاحنة ثانية",
    tr: "İkinci kamyonet",
  },
  "plan.extras.secondVanHint": {
    de: "Für große Umzüge, damit alles in einer Fahrt kommt.",
    en: "For larger moves, so everything arrives in one trip.",
    ar: "للانتقالات الكبيرة، ليصل كل شيء في رحلة واحدة.",
    tr: "Büyük taşınmalarda her şey tek seferde gelsin diye.",
  },
  "plan.extras.secondVanAdvice": {
    de: "{volume} m³ sind mehr, als ein Transporter fasst — wir empfehlen einen zweiten.",
    en: "{volume} m³ is more than one van holds — we recommend a second.",
    ar: "{volume} م³ أكثر مما تتسع له شاحنة واحدة — نوصي بشاحنة ثانية.",
    tr: "{volume} m³ tek kamyonete sığmaz — ikincisini öneriyoruz.",
  },
  "plan.extras.notes": {
    de: "Was sollte das Team noch wissen?",
    en: "Anything else the team should know?",
    ar: "هل هناك شيء آخر يجب أن يعرفه الفريق؟",
    tr: "Ekibin bilmesi gereken başka bir şey var mı?",
  },
  "plan.extras.notesPlaceholder": {
    de: "Zugangshinweise oder alles, was wir einplanen sollten.",
    en: "Access instructions or anything we should plan for.",
    ar: "تعليمات الوصول أو أي شيء يجب أن نخطط له.",
    tr: "Erişim talimatları veya planlamamız gereken her şey.",
  },
  "plan.jobs.noLocation": {
    de: "Wähle zuerst, wo du diese Leistung brauchst.",
    en: "Choose where you need this service first.",
    ar: "اختر أولاً أين تحتاج هذه الخدمة.",
    tr: "Önce bu hizmete nerede ihtiyacınız olduğunu seçin.",
  },
  "plan.jobs.chooseLocation": {
    de: "Ort wählen",
    en: "Choose a location",
    ar: "اختر الموقع",
    tr: "Konum seçin",
  },
  "plan.jobs.location": {
    de: "Einsatzort",
    en: "Service location",
    ar: "موقع الخدمة",
    tr: "Hizmet konumu",
  },
  "plan.jobs.atLocations": {
    de: "{service} an {count} Orten",
    en: "{service} at {count} locations",
    ar: "{service} في {count} مواقع",
    tr: "{count} konumda {service}",
  },
  "plan.jobs.editLocations": {
    de: "Orte bearbeiten",
    en: "Edit locations",
    ar: "تعديل المواقع",
    tr: "Konumları düzenle",
  },
  "plan.jobs.chooseTab": {
    de: "Ort zum Bearbeiten wählen",
    en: "Choose a location to configure",
    ar: "اختر موقعاً لإعداده",
    tr: "Yapılandırılacak konumu seçin",
  },
  "plan.jobs.chooseAddress": {
    de: "Adresse wählen",
    en: "Choose address",
    ar: "اختر العنوان",
    tr: "Adres seçin",
  },
  "plan.jobs.position": {
    de: "Ort {index} von {total} · Angaben und Termin werden einzeln gespeichert.",
    en: "Location {index} of {total} · Details and appointment are saved separately.",
    ar: "الموقع {index} من {total} · تُحفظ التفاصيل والموعد بشكل منفصل.",
    tr: "Konum {index}/{total} · Ayrıntılar ve randevu ayrı kaydedilir.",
  },
  "plan.renovation.title": {
    de: "Was sollen wir uns ansehen?",
    en: "What would you like us to assess?",
    ar: "ما الذي تريدنا أن نقيّمه؟",
    tr: "Neyi değerlendirmemizi istersiniz?",
  },
  "plan.renovation.sub": {
    de: "Wähle die Arbeiten und eine ungefähre Fläche. Umfang und Angebot bestätigen wir nach der Besichtigung.",
    en: "Select the work and add an approximate area. We confirm the scope and quote after a site visit.",
    ar: "اختر الأعمال وأضف مساحة تقريبية. نؤكد النطاق والسعر بعد الزيارة الميدانية.",
    tr: "İşi seçip yaklaşık alanı ekleyin. Kapsamı ve teklifi yerinde incelemeden sonra onaylarız.",
  },
  "plan.renovation.painting": {
    de: "Malerarbeiten",
    en: "Painting",
    ar: "الدهان",
    tr: "Boya",
  },
  "plan.renovation.flooring": {
    de: "Parkett & Boden",
    en: "Parquet & flooring",
    ar: "الباركيه والأرضيات",
    tr: "Parke ve zemin",
  },
  "plan.renovation.repairs": {
    de: "Löcher & Wandreparaturen",
    en: "Filling holes & wall repairs",
    ar: "سدّ الثقوب وإصلاح الجدران",
    tr: "Delik doldurma ve duvar onarımı",
  },
  "plan.renovation.paintingArea": {
    de: "Fläche zum Streichen",
    en: "Painting area",
    ar: "مساحة الدهان",
    tr: "Boyanacak alan",
  },
  "plan.renovation.flooringArea": {
    de: "Bodenfläche",
    en: "Floor area",
    ar: "مساحة الأرضية",
    tr: "Zemin alanı",
  },
  "plan.renovation.repairsArea": {
    de: "Betroffene Wandfläche",
    en: "Wall area to repair",
    ar: "مساحة الجدار المطلوب إصلاحها",
    tr: "Onarılacak duvar alanı",
  },
  "plan.renovation.paintingHint": {
    de: "Ungefähre Wand- und Deckenfläche.",
    en: "Approximate wall and ceiling area to paint.",
    ar: "المساحة التقريبية للجدران والسقف.",
    tr: "Yaklaşık duvar ve tavan alanı.",
  },
  "plan.renovation.flooringHint": {
    de: "Ungefähre Fläche des Bodens.",
    en: "Approximate floor area.",
    ar: "المساحة التقريبية للأرضية.",
    tr: "Yaklaşık zemin alanı.",
  },
  "plan.renovation.repairsHint": {
    de: "Ungefähre Fläche, die ausgebessert werden soll.",
    en: "Approximate area to repair.",
    ar: "المساحة التقريبية المطلوب إصلاحها.",
    tr: "Onarılacak yaklaşık alan.",
  },
  "plan.renovation.next": {
    de: "Als Nächstes: Wunschtermin für die Besichtigung. In diesem Schritt wird nichts bezahlt.",
    en: "Next: choose a preferred site-visit date. No payment at this stage.",
    ar: "التالي: اختر موعداً مفضلاً للزيارة. لا دفع في هذه المرحلة.",
    tr: "Sırada: tercih ettiğiniz inceleme tarihini seçin. Bu aşamada ödeme yok.",
  },
  "plan.cleaning.title": {
    de: "Welche Reinigung brauchst du?",
    en: "What kind of clean do you need?",
    ar: "ما نوع التنظيف الذي تحتاجه؟",
    tr: "Ne tür bir temizliğe ihtiyacınız var?",
  },
  "plan.cleaning.sub": {
    de: "Wähle eine oder beide.",
    en: "Choose one or both.",
    ar: "اختر واحداً أو كليهما.",
    tr: "Birini veya ikisini seçin.",
  },
  "plan.cleaning.moveClean": {
    de: "Umzugsreinigung",
    en: "Moving clean",
    ar: "تنظيف الانتقال",
    tr: "Taşınma temizliği",
  },
  "plan.cleaning.moveCleanHint": {
    de: "Vor dem Einzug oder nach dem Auszug.",
    en: "Before moving in or after moving out.",
    ar: "قبل الانتقال إلى المنزل أو بعد مغادرته.",
    tr: "Taşınmadan önce veya taşındıktan sonra.",
  },
  "plan.cleaning.windows": {
    de: "Fenster",
    en: "Windows",
    ar: "النوافذ",
    tr: "Pencereler",
  },
  "plan.cleaning.windowsHint": {
    de: "Fenster und Glas, innen oder außen.",
    en: "Windows and glass, inside or out.",
    ar: "النوافذ والزجاج، من الداخل أو الخارج.",
    tr: "Pencere ve camlar, içten veya dıştan.",
  },
  "plan.cleaning.spaceTitle": {
    de: "Die zu reinigende Fläche",
    en: "The space to clean",
    ar: "المساحة المراد تنظيفها",
    tr: "Temizlenecek alan",
  },
  "plan.cleaning.area": {
    de: "Zu reinigende Fläche",
    en: "Floor area to clean",
    ar: "مساحة الأرضية المراد تنظيفها",
    tr: "Temizlenecek alan",
  },
  "plan.cleaning.included": {
    de: "Wir reinigen alles in deinem Zuhause – Türen, Böden, Oberflächen und mehr – außer den Fenstern. Fensterreinigung kannst du oben zusätzlich wählen.",
    en: "We’ll clean everything in your home — doors, floors, surfaces and more — except the windows. Window cleaning is a separate service you can add above.",
    ar: "سننظف كل شيء في منزلك — الأبواب والأرضيات والأسطح وغيرها — باستثناء النوافذ. تنظيف النوافذ خدمة منفصلة يمكنك إضافتها أعلاه.",
    tr: "Evinizdeki her şeyi temizleriz — kapılar, zeminler, yüzeyler ve daha fazlası — pencereler hariç. Pencere temizliğini yukarıdan ekleyebilirsiniz.",
  },
  "plan.cleaning.includedWithWindows": {
    de: "Wir reinigen alles in deinem Zuhause, die Fenster eingeschlossen.",
    en: "We’ll clean everything in your home, including the windows.",
    ar: "سننظف كل شيء في منزلك، بما في ذلك النوافذ.",
    tr: "Pencereler dahil evinizdeki her şeyi temizleriz.",
  },
  "plan.cleaning.windowsTitle": {
    de: "Fenster & Glas",
    en: "Windows & glass",
    ar: "النوافذ والزجاج",
    tr: "Pencere ve cam",
  },
  "plan.cleaning.windowsSub": {
    de: "Zähle die Fenster, die gereinigt werden sollen.",
    en: "Count the windows you’d like cleaned.",
    ar: "عدّ النوافذ التي تريد تنظيفها.",
    tr: "Temizlenmesini istediğiniz pencereleri sayın.",
  },
  "plan.cleaning.windowCount": {
    de: { one: "{count} Fenster", other: "{count} Fenster" },
    en: { one: "{count} window", other: "{count} windows" },
    ar: { zero: "لا نوافذ", one: "نافذة واحدة", two: "نافذتان", few: "{count} نوافذ", many: "{count} نافذة", other: "{count} نافذة" },
    tr: { one: "{count} pencere", other: "{count} pencere" },
  },
  "plan.cleaning.window.standard": {
    de: "Standardfenster",
    en: "Standard window",
    ar: "نافذة عادية",
    tr: "Standart pencere",
  },
  "plan.cleaning.window.patio": {
    de: "Balkon- / Terrassentür",
    en: "Balcony / patio door",
    ar: "باب شرفة / تراس",
    tr: "Balkon / teras kapısı",
  },
  "plan.cleaning.window.large": {
    de: "Große / bodentiefe Glasfläche",
    en: "Large / floor-to-ceiling glass",
    ar: "زجاج كبير / من الأرض للسقف",
    tr: "Büyük / tavana kadar cam",
  },
  "plan.cleaning.window.roof": {
    de: "Dachfenster",
    en: "Roof window / skylight",
    ar: "نافذة سقف",
    tr: "Çatı penceresi",
  },
  "plan.cleaning.windowsQuote": {
    de: "Die Fensterreinigung bepreist das Team nach Anzahl, Größe und Zugang – du bekommst das Angebot mit der Bestätigung.",
    en: "The team prices window cleaning by count, size and access — you’ll get the quote with your confirmation.",
    ar: "يسعّر الفريق تنظيف النوافذ حسب العدد والحجم وسهولة الوصول — ستحصل على السعر مع التأكيد.",
    tr: "Ekip pencere temizliğini sayı, boyut ve erişime göre fiyatlar — teklifi onayla birlikte alırsınız.",
  },
  "plan.disposal.title": {
    de: "Was sollen wir abholen?",
    en: "What should we collect?",
    ar: "ماذا نجمع؟",
    tr: "Neyi toplayalım?",
  },
  "plan.disposal.sub": {
    de: "Gib die Mengen an. Was du nicht brauchst, bleibt auf null.",
    en: "Add the quantities. Leave anything you don’t need at zero.",
    ar: "أضف الكميات. اترك ما لا تحتاجه عند الصفر.",
    tr: "Miktarları ekleyin. İhtiyacınız olmayanları sıfırda bırakın.",
  },
  "plan.disposal.largeFurniture": {
    de: "Große Möbel",
    en: "Large furniture",
    ar: "أثاث كبير",
    tr: "Büyük mobilya",
  },
  "plan.disposal.largeFurnitureHint": {
    de: "Sofas, Schränke, Betten",
    en: "Sofas, wardrobes, beds",
    ar: "كنب، خزائن، أسرّة",
    tr: "Kanepe, dolap, yatak",
  },
  "plan.disposal.smallFurniture": {
    de: "Kleine Möbel",
    en: "Small furniture",
    ar: "أثاث صغير",
    tr: "Küçük mobilya",
  },
  "plan.disposal.smallFurnitureHint": {
    de: "Stühle, kleine Tische, Regale",
    en: "Chairs, small tables, shelves",
    ar: "كراسٍ، طاولات صغيرة، رفوف",
    tr: "Sandalye, küçük masa, raf",
  },
  "plan.disposal.largeElectronics": {
    de: "Großgeräte & Elektronik",
    en: "Large appliances & electronics",
    ar: "أجهزة كبيرة وإلكترونيات",
    tr: "Büyük cihaz ve elektronik",
  },
  "plan.disposal.largeElectronicsHint": {
    de: "Kühlschränke, Waschmaschinen, große Fernseher",
    en: "Fridges, washers, large TVs",
    ar: "ثلاجات، غسالات، شاشات كبيرة",
    tr: "Buzdolabı, çamaşır makinesi, büyük TV",
  },
  "plan.disposal.smallElectronics": {
    de: "Kleinelektronik",
    en: "Small electronics",
    ar: "إلكترونيات صغيرة",
    tr: "Küçük elektronik",
  },
  "plan.disposal.smallElectronicsHint": {
    de: "Lampen, Monitore, Kleingeräte",
    en: "Lamps, monitors, small appliances",
    ar: "مصابيح، شاشات، أجهزة صغيرة",
    tr: "Lamba, monitör, küçük ev aleti",
  },
  "plan.disposal.total": {
    de: { one: "{count} Teil zum Abholen", other: "{count} Teile zum Abholen" },
    en: { one: "{count} item to collect", other: "{count} items to collect" },
    ar: { zero: "لا أغراض للجمع", one: "غرض واحد للجمع", two: "غرضان للجمع", few: "{count} أغراض للجمع", many: "{count} غرضاً للجمع", other: "{count} غرض للجمع" },
    tr: { one: "Toplanacak {count} eşya", other: "Toplanacak {count} eşya" },
  },
  "plan.disposal.quoteNote": {
    de: "Das Abholangebot bestätigt das Team.",
    en: "Collection quote confirmed by the team.",
    ar: "يؤكد الفريق سعر الجمع.",
    tr: "Toplama teklifini ekip onaylar.",
  },
  "plan.disposal.notes": {
    de: "Sonst noch etwas?",
    en: "Anything else?",
    ar: "شيء آخر؟",
    tr: "Başka bir şey?",
  },
  "plan.disposal.notesPlaceholder": {
    de: "z. B. die Sachen stehen im Keller",
    en: "e.g. the items are in the cellar",
    ar: "مثلاً: الأغراض في القبو",
    tr: "örn. eşyalar bodrumda",
  },
  "plan.photos.title": {
    de: "Fotos hinzufügen",
    en: "Add photos",
    ar: "إضافة صور",
    tr: "Fotoğraf ekle",
  },
  "plan.photos.lead": {
    de: "Zeig uns Räume, Treppen und enge Stellen. Wir melden uns innerhalb von 48 Stunden.",
    en: "Show us rooms, stairs and tight spots. We’ll reply within 48 hours.",
    ar: "أرنا الغرف والسلالم والأماكن الضيقة. سنرد خلال 48 ساعة.",
    tr: "Bize odaları, merdivenleri ve dar yerleri gösterin. 48 saat içinde yanıt veririz.",
  },
  "plan.photos.add": {
    de: "Fotos hinzufügen",
    en: "Add photos",
    ar: "إضافة صور",
    tr: "Fotoğraf ekle",
  },
  "plan.photos.limits": {
    de: "Hierher ziehen · bis zu {max} Fotos, je 10 MB",
    en: "Drop here · up to {max} photos, 10 MB each",
    ar: "اسحب هنا · حتى {max} صور، 10 ميغابايت لكل صورة",
    tr: "Buraya bırakın · en fazla {max} fotoğraf, her biri 10 MB",
  },
  "plan.photos.rejected": {
    de: "Einige Dateien wurden nicht übernommen: nur Bilder bis 10 MB, höchstens {max}.",
    en: "Some files were not added: images up to 10 MB only, {max} at most.",
    ar: "لم تُضَف بعض الملفات: صور حتى 10 ميغابايت فقط، بحد أقصى {max}.",
    tr: "Bazı dosyalar eklenmedi: yalnızca 10 MB'a kadar görseller, en fazla {max}.",
  },
  "plan.photos.remove": {
    de: "{name} entfernen",
    en: "Remove {name}",
    ar: "إزالة {name}",
    tr: "{name} kaldır",
  },
  "plan.photos.localOnly": {
    de: "Deine Fotos bleiben in diesem Browser und werden nicht hochgeladen. Wir sehen, dass du welche hast, und fragen bei Bedarf danach.",
    en: "Your photos stay in this browser and are not uploaded. We’ll see that you have some and ask for them if we need them.",
    ar: "تبقى صورك في هذا المتصفح ولا تُرفع. سنعرف أن لديك صوراً ونطلبها عند الحاجة.",
    tr: "Fotoğraflarınız bu tarayıcıda kalır ve yüklenmez. Fotoğrafınız olduğunu görür, gerekirse isteriz.",
  },
  "plan.schedule.nothing": {
    de: "Wähle zuerst eine Leistung und einen Ort.",
    en: "Choose a service and a location first.",
    ar: "اختر خدمة وموقعاً أولاً.",
    tr: "Önce bir hizmet ve konum seçin.",
  },
  "plan.schedule.preview": {
    de: "Das Team bestätigt deine gewünschten Termine.",
    en: "The team will confirm your requested dates.",
    ar: "سيؤكد الفريق المواعيد التي طلبتها.",
    tr: "Ekip talep ettiğiniz tarihleri onaylayacak.",
  },
  "plan.schedule.renovationNote": {
    de: "Renovierungstermine sind Besichtigungen, keine Arbeitstage.",
    en: "Renovation appointments are site visits, not work dates.",
    ar: "مواعيد الترميم هي زيارات ميدانية وليست أيام عمل.",
    tr: "Tadilat randevuları yerinde incelemedir, iş günü değildir.",
  },
  "plan.schedule.renovationVisit": {
    de: "Renovierung – Besichtigung",
    en: "Renovation site visit",
    ar: "زيارة ميدانية للترميم",
    tr: "Tadilat yerinde inceleme",
  },
  "plan.schedule.notChosen": {
    de: "Noch nicht gewählt",
    en: "Not chosen yet",
    ar: "لم يُحدَّد بعد",
    tr: "Henüz seçilmedi",
  },
  "plan.schedule.chooseDate": {
    de: "Datum wählen",
    en: "Choose a date",
    ar: "اختر التاريخ",
    tr: "Tarih seçin",
  },
  "plan.schedule.bookedNote": {
    de: "Freie Tage laut unserer Kapazität · der gelbe Punkt heißt: nur noch wenig frei",
    en: "Free days by our capacity · a yellow dot means only a little room left",
    ar: "الأيام المتاحة حسب طاقتنا · النقطة الصفراء تعني أن المتاح قليل",
    tr: "Kapasitemize göre boş günler · sarı nokta az yer kaldığı anlamına gelir",
  },
  "plan.schedule.preferredNote": {
    de: "Wunschtermine · Bestätigung durch das Team",
    en: "Preferred dates · subject to confirmation",
    ar: "مواعيد مفضلة · بانتظار التأكيد",
    tr: "Tercih edilen tarihler · onaya tabi",
  },
  "plan.schedule.window": {
    de: "Ankunftsfenster",
    en: "Arrival window",
    ar: "نافذة الوصول",
    tr: "Varış aralığı",
  },
  "plan.schedule.windowFor": {
    de: "{name} · {date}. Das Team kommt innerhalb dieses Zwei-Stunden-Fensters.",
    en: "{name} · {date}. The crew arrives within this two-hour window.",
    ar: "{name} · {date}. يصل الفريق خلال هاتين الساعتين.",
    tr: "{name} · {date}. Ekip bu iki saatlik aralıkta gelir.",
  },
  "plan.schedule.windowHint": {
    de: "Wähle zuerst ein Datum.",
    en: "Choose a date first.",
    ar: "اختر التاريخ أولاً.",
    tr: "Önce bir tarih seçin.",
  },
  "plan.schedule.notes": {
    de: "Hinweis zum Termin",
    en: "Scheduling note",
    ar: "ملاحظة حول الموعد",
    tr: "Randevu notu",
  },
  "plan.schedule.notesPlaceholder": {
    de: "Zeitliche Wünsche?",
    en: "Any timing preferences?",
    ar: "هل لديك تفضيلات بشأن التوقيت؟",
    tr: "Zamanlama tercihleriniz var mı?",
  },
  "plan.schedule.prevMonth": {
    de: "Vorheriger Monat",
    en: "Previous month",
    ar: "الشهر السابق",
    tr: "Önceki ay",
  },
  "plan.schedule.nextMonth": {
    de: "Nächster Monat",
    en: "Next month",
    ar: "الشهر التالي",
    tr: "Sonraki ay",
  },
  "plan.schedule.availabilityFailed": {
    de: "Die freien Tage konnten nicht geladen werden. Bitte versuch es gleich noch einmal.",
    en: "Free days could not be loaded. Please try again in a moment.",
    ar: "تعذّر تحميل الأيام المتاحة. يرجى المحاولة بعد قليل.",
    tr: "Boş günler yüklenemedi. Lütfen biraz sonra tekrar deneyin.",
  },
  "plan.review.kicker": {
    de: "Umzug & Services für Zuhause",
    en: "Moving & home services",
    ar: "النقل وخدمات المنزل",
    tr: "Taşınma ve ev hizmetleri",
  },
  "plan.review.estimateEyebrow": {
    de: "Angebot",
    en: "Service estimate",
    ar: "عرض السعر",
    tr: "Hizmet teklifi",
  },
  "plan.review.requestEyebrow": {
    de: "Anfrage",
    en: "Visit request",
    ar: "طلب الزيارة",
    tr: "İnceleme talebi",
  },
  "plan.review.title": {
    de: "Dein Leistungsplan",
    en: "Your service plan",
    ar: "خطة خدماتك",
    tr: "Hizmet planınız",
  },
  "plan.review.sub": {
    de: "Ein klarer Überblick über deine Leistungen.",
    en: "A clear overview of your services.",
    ar: "نظرة واضحة على خدماتك.",
    tr: "Hizmetlerinize net bir bakış.",
  },
  "plan.review.preview": {
    de: "Plan-Vorschau",
    en: "Plan preview",
    ar: "معاينة الخطة",
    tr: "Plan önizlemesi",
  },
  "plan.review.serviceCount": {
    de: { one: "{count} Leistung", other: "{count} Leistungen" },
    en: { one: "{count} service", other: "{count} services" },
    ar: { zero: "لا خدمات", one: "خدمة واحدة", two: "خدمتان", few: "{count} خدمات", many: "{count} خدمة", other: "{count} خدمة" },
    tr: { one: "{count} hizmet", other: "{count} hizmet" },
  },
  "plan.review.edit": {
    de: "{name} bearbeiten",
    en: "Edit {name}",
    ar: "تعديل {name}",
    tr: "{name} düzenle",
  },
  "plan.review.breakdown": {
    de: "Kostenaufstellung",
    en: "Cost breakdown",
    ar: "تفاصيل التكلفة",
    tr: "Maliyet dökümü",
  },
  "plan.review.pricing": {
    de: "Preis wird berechnet…",
    en: "Calculating your price…",
    ar: "جارٍ حساب السعر…",
    tr: "Fiyat hesaplanıyor…",
  },
  "plan.review.priceFailed": {
    de: "Der Preis konnte nicht berechnet werden.",
    en: "The price could not be calculated.",
    ar: "تعذّر حساب السعر.",
    tr: "Fiyat hesaplanamadı.",
  },
  "plan.review.retry": {
    de: "Erneut versuchen",
    en: "Try again",
    ar: "حاول مرة أخرى",
    tr: "Tekrar dene",
  },
  "plan.review.net": {
    de: "Nettopreis",
    en: "Net price",
    ar: "السعر الصافي",
    tr: "Net fiyat",
  },
  "plan.review.vat": {
    de: "{rate} % MwSt.",
    en: "{rate}% VAT",
    ar: "ضريبة القيمة المضافة {rate}٪",
    tr: "%{rate} KDV",
  },
  "plan.review.jobTotal": {
    de: "Gesamt",
    en: "Total",
    ar: "الإجمالي",
    tr: "Toplam",
  },
  "plan.review.deposit": {
    de: "Anzahlung bei Buchung: {amount}",
    en: "Deposit on booking: {amount}",
    ar: "العربون عند الحجز: {amount}",
    tr: "Rezervasyonda ön ödeme: {amount}",
  },
  "plan.review.pricedSubtotal": {
    de: "Bepreiste Leistungen (inkl. MwSt.)",
    en: "Priced services (incl. VAT)",
    ar: "الخدمات المسعّرة (شاملة الضريبة)",
    tr: "Fiyatlandırılan hizmetler (KDV dahil)",
  },
  "plan.review.total": {
    de: "Gesamtpreis (inkl. MwSt.)",
    en: "Total (incl. VAT)",
    ar: "الإجمالي (شامل الضريبة)",
    tr: "Toplam (KDV dahil)",
  },
  "plan.review.someToQuote": {
    de: "Ein Teil wird separat bepreist",
    en: "Some work needs assessment",
    ar: "بعض الأعمال تحتاج إلى تقييم",
    tr: "Bazı işler değerlendirme gerektiriyor",
  },
  "plan.review.toQuote": {
    de: "Preis nach Prüfung",
    en: "Price after assessment",
    ar: "السعر بعد التقييم",
    tr: "Değerlendirme sonrası fiyat",
  },
  "plan.review.pending.renovation": {
    de: "Umfang, Zugang und Preis bestätigen wir nach der Besichtigung.",
    en: "Scope, access and price are confirmed after the site visit.",
    ar: "نؤكد النطاق والوصول والسعر بعد الزيارة الميدانية.",
    tr: "Kapsam, erişim ve fiyat yerinde incelemeden sonra onaylanır.",
  },
  "plan.review.pending.disposal": {
    de: "Abhol- und Entsorgungskosten bestätigt das Team.",
    en: "Collection and disposal fees are confirmed by the team.",
    ar: "يؤكد الفريق رسوم الجمع والتخلص.",
    tr: "Toplama ve atık ücretlerini ekip onaylar.",
  },
  "plan.review.pending.windows": {
    de: "Die Fensterreinigung bepreist das Team nach Anzahl und Zugang.",
    en: "Window cleaning is priced by the team by count and access.",
    ar: "يسعّر الفريق تنظيف النوافذ حسب العدد والوصول.",
    tr: "Pencere temizliğini ekip sayı ve erişime göre fiyatlar.",
  },
  "plan.review.pending.specials": {
    de: "Besondere Gegenstände prüft das Team vor dem Umzug.",
    en: "Special items are reviewed by the team before the move.",
    ar: "يراجع الفريق الأغراض الخاصة قبل النقل.",
    tr: "Özel eşyalar taşınmadan önce ekip tarafından incelenir.",
  },
  "plan.review.pending.custom": {
    de: "Eigene Einträge im Inventar sind nicht im Preis enthalten; das Team bestätigt sie.",
    en: "Custom inventory entries aren’t in the price; the team confirms them.",
    ar: "الأغراض المخصصة في الجرد غير مشمولة بالسعر؛ يؤكدها الفريق.",
    tr: "Envanterdeki özel eşyalar fiyata dahil değildir; ekip onaylar.",
  },
  "plan.review.pending.visit": {
    de: "Nach der Besichtigung bekommst du ein auf dich zugeschnittenes Angebot.",
    en: "You’ll receive a tailored quote after the site visit.",
    ar: "ستحصل على عرض مخصص بعد الزيارة الميدانية.",
    tr: "Yerinde incelemeden sonra size özel bir teklif alırsınız.",
  },
  "plan.review.pendingExcluded": {
    de: "Als „Preis nach Prüfung“ markierte Arbeiten sind nicht enthalten. Unser Team bestätigt sie separat.",
    en: "Work marked “Price after assessment” is not included. Our team will confirm it separately.",
    ar: "الأعمال المحددة بـ«السعر بعد التقييم» غير مشمولة. سيؤكدها فريقنا بشكل منفصل.",
    tr: "“Değerlendirme sonrası fiyat” olarak işaretlenen işler dahil değildir. Ekibimiz ayrıca onaylar.",
  },
  "plan.review.allPending": {
    de: "Für diese Leistungen erstellt unser Team nach der Prüfung ein Angebot. Jetzt wird nichts bezahlt.",
    en: "Our team prepares a quote for these services after assessment. Nothing is paid now.",
    ar: "سيعدّ فريقنا عرض سعر لهذه الخدمات بعد التقييم. لا دفع الآن.",
    tr: "Ekibimiz bu hizmetler için değerlendirme sonrası teklif hazırlar. Şimdi ödeme yapılmaz.",
  },
  "plan.review.nothingPriced": {
    de: "Wähle bei der Reinigung „Umzugsreinigung“ mit Fläche, um sie direkt zu buchen — sonst senden wir deine Anfrage an das Team.",
    en: "Choose “Moving clean” with an area to book cleaning directly — otherwise we send your request to the team.",
    ar: "اختر «تنظيف الانتقال» مع المساحة لحجز التنظيف مباشرة — وإلا سنرسل طلبك إلى الفريق.",
    tr: "Temizliği doğrudan rezerve etmek için alanla birlikte “Taşınma temizliği”ni seçin — aksi halde talebinizi ekibe göndeririz.",
  },
  "plan.review.estimateNote": {
    de: "Vorläufiger Preis: Unser Team prüft diesen Auftrag und bestätigt den Preis, bevor er verbindlich wird.",
    en: "Provisional price: our team reviews this job and confirms the price before it becomes binding.",
    ar: "سعر مبدئي: سيراجع فريقنا هذه المهمة ويؤكد السعر قبل أن يصبح ملزماً.",
    tr: "Geçici fiyat: ekibimiz bu işi inceler ve bağlayıcı hale gelmeden önce fiyatı onaylar.",
  },
  "plan.review.travelCalc": {
    de: "{km} km × {rate} = {amount}",
    en: "{km} km × {rate} = {amount}",
    ar: "{km} كم × {rate} = {amount}",
    tr: "{km} km × {rate} = {amount}",
  },
  "plan.review.distance": {
    de: "Fahrstrecke",
    en: "Driving distance",
    ar: "مسافة القيادة",
    tr: "Sürüş mesafesi",
  },
  "plan.review.discount": {
    de: "Rabattcode",
    en: "Discount code",
    ar: "رمز الخصم",
    tr: "İndirim kodu",
  },
  "plan.review.discountPlaceholder": {
    de: "Code eingeben",
    en: "Enter code",
    ar: "أدخل الرمز",
    tr: "Kodu girin",
  },
  "plan.review.discountApply": {
    de: "Anwenden",
    en: "Apply",
    ar: "تطبيق",
    tr: "Uygula",
  },
  "plan.review.discountApplied": {
    de: "Angewendet",
    en: "Applied",
    ar: "تم التطبيق",
    tr: "Uygulandı",
  },
  "plan.review.discountNote": {
    de: "Der Code wird bei der Preisberechnung geprüft und auf die erste bepreiste Leistung angewendet.",
    en: "The code is checked when your price is calculated and applied to the first priced service.",
    ar: "يتم التحقق من الرمز عند حساب السعر ويُطبَّق على أول خدمة مسعّرة.",
    tr: "Kod, fiyatınız hesaplanırken kontrol edilir ve ilk fiyatlandırılan hizmete uygulanır.",
  },
  "plan.review.print": {
    de: "Plan drucken / als PDF speichern",
    en: "Print / save plan as PDF",
    ar: "طباعة / حفظ الخطة كملف PDF",
    tr: "Planı yazdır / PDF olarak kaydet",
  },
  "plan.request.title": {
    de: "Wie erreichen wir dich?",
    en: "How can we reach you?",
    ar: "كيف نتواصل معك؟",
    tr: "Size nasıl ulaşabiliriz?",
  },
  "plan.request.sub": {
    de: "Wir melden uns, um den Termin zu bestätigen.",
    en: "We’ll contact you to confirm the appointment.",
    ar: "سنتواصل معك لتأكيد الموعد.",
    tr: "Randevuyu onaylamak için sizinle iletişime geçeceğiz.",
  },
  "plan.request.consent": {
    de: "Ihr dürft mich zu dieser Anfrage kontaktieren. Mehr dazu in der",
    en: "You may contact me about this request. More in the",
    ar: "يمكنكم التواصل معي بخصوص هذا الطلب. المزيد في",
    tr: "Bu talep hakkında benimle iletişime geçebilirsiniz. Ayrıntılar:",
  },
  "plan.request.privacy": {
    de: "Datenschutzerklärung",
    en: "privacy policy",
    ar: "سياسة الخصوصية",
    tr: "gizlilik politikası",
  },
  "plan.request.response": {
    de: "Wir melden uns innerhalb von 48 Stunden.",
    en: "We’ll contact you within 48 hours.",
    ar: "سنتواصل معك خلال 48 ساعة.",
    tr: "48 saat içinde sizinle iletişime geçeceğiz.",
  },
  "plan.contact.firstName": {
    de: "Vorname",
    en: "First name",
    ar: "الاسم الأول",
    tr: "Ad",
  },
  "plan.contact.lastName": {
    de: "Nachname",
    en: "Last name",
    ar: "الكنية",
    tr: "Soyad",
  },
  "plan.contact.email": {
    de: "E-Mail-Adresse",
    en: "Email address",
    ar: "البريد الإلكتروني",
    tr: "E-posta adresi",
  },
  "plan.contact.phone": {
    de: "Telefonnummer",
    en: "Phone number",
    ar: "رقم الهاتف",
    tr: "Telefon numarası",
  },
  "plan.account.title": {
    de: "Dein Konto",
    en: "Your account",
    ar: "حسابك",
    tr: "Hesabınız",
  },
  "plan.account.sub": {
    de: "Erstelle ein kostenloses Konto oder melde dich an. Darin findest du deine Buchung und Rechnung.",
    en: "Create a free account or sign in. Your booking and invoice live there.",
    ar: "أنشئ حساباً مجانياً أو سجّل الدخول. ستجد فيه حجزك وفاتورتك.",
    tr: "Ücretsiz hesap oluşturun veya giriş yapın. Rezervasyonunuz ve faturanız orada.",
  },
  "plan.account.create": {
    de: "Konto erstellen",
    en: "Create account",
    ar: "إنشاء حساب",
    tr: "Hesap oluştur",
  },
  "plan.account.signIn": {
    de: "Anmelden",
    en: "Sign in",
    ar: "تسجيل الدخول",
    tr: "Giriş yap",
  },
  "plan.account.password": {
    de: "Passwort",
    en: "Password",
    ar: "كلمة المرور",
    tr: "Şifre",
  },
  "plan.account.confirm": {
    de: "Passwort wiederholen",
    en: "Repeat password",
    ar: "أعد كتابة كلمة المرور",
    tr: "Şifreyi tekrarla",
  },
  "plan.account.passwordHint": {
    de: "Mindestens {min} Zeichen.",
    en: "At least {min} characters.",
    ar: "{min} أحرف على الأقل.",
    tr: "En az {min} karakter.",
  },
  "plan.account.passwordShort": {
    de: "Das Passwort braucht mindestens {min} Zeichen.",
    en: "The password needs at least {min} characters.",
    ar: "تحتاج كلمة المرور إلى {min} أحرف على الأقل.",
    tr: "Şifre en az {min} karakter olmalıdır.",
  },
  "plan.account.passwordMismatch": {
    de: "Die Passwörter stimmen nicht überein.",
    en: "The passwords don’t match.",
    ar: "كلمتا المرور غير متطابقتين.",
    tr: "Şifreler eşleşmiyor.",
  },
  "plan.account.emailTaken": {
    de: "Zu dieser E-Mail gibt es schon ein Konto. Bitte melde dich an.",
    en: "There is already an account for this email. Please sign in.",
    ar: "يوجد حساب بهذا البريد بالفعل. يرجى تسجيل الدخول.",
    tr: "Bu e-posta için zaten bir hesap var. Lütfen giriş yapın.",
  },
  "plan.account.wrongPassword": {
    de: "E-Mail oder Passwort stimmt nicht.",
    en: "The email or password is not right.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    tr: "E-posta veya şifre hatalı.",
  },
  "plan.account.forgot": {
    de: "Passwort vergessen?",
    en: "Forgot your password?",
    ar: "نسيت كلمة المرور؟",
    tr: "Şifrenizi mi unuttunuz?",
  },
  "plan.account.busy": {
    de: "Einen Moment…",
    en: "One moment…",
    ar: "لحظة من فضلك…",
    tr: "Bir saniye…",
  },
  "plan.account.notYou": {
    de: "Nicht du? Abmelden",
    en: "Not you? Sign out",
    ar: "لست أنت؟ تسجيل الخروج",
    tr: "Siz değil misiniz? Çıkış yapın",
  },
  "plan.business.signInTitle": {
    de: "Melde dich an, um eine Besichtigung zu vereinbaren",
    en: "Sign in to arrange a visit",
    ar: "سجّل الدخول لترتيب زيارة",
    tr: "İnceleme ayarlamak için giriş yapın",
  },
  "plan.business.signInSub": {
    de: "Dein Konto hält Firmen- und Kontaktdaten zusammen.",
    en: "Your account keeps your company and contact details together.",
    ar: "يحفظ حسابك بيانات شركتك وجهة الاتصال معاً.",
    tr: "Hesabınız şirket ve iletişim bilgilerinizi bir arada tutar.",
  },
  "plan.business.accountTitle": {
    de: "Dein Geschäftskonto",
    en: "Your business account",
    ar: "حسابك التجاري",
    tr: "Kurumsal hesabınız",
  },
  "plan.business.accountSub": {
    de: "Diese Angaben nutzen wir für deine Anfrage.",
    en: "These details will be reused for your request.",
    ar: "سنستخدم هذه البيانات لطلبك.",
    tr: "Bu bilgiler talebiniz için kullanılacak.",
  },
  "plan.business.companyTitle": {
    de: "Firma",
    en: "Company",
    ar: "الشركة",
    tr: "Şirket",
  },
  "plan.business.company": {
    de: "Firmenname",
    en: "Company name",
    ar: "اسم الشركة",
    tr: "Şirket adı",
  },
  "plan.business.companyPlaceholder": {
    de: "z. B. Müller GmbH",
    en: "e.g. Müller GmbH",
    ar: "مثلاً: Müller GmbH",
    tr: "örn. Müller GmbH",
  },
  "plan.business.phoneHint": {
    de: "Für Rückfragen zur Besichtigung.",
    en: "For questions about the visit.",
    ar: "للاستفسارات حول الزيارة.",
    tr: "İnceleme hakkındaki sorular için.",
  },
  "plan.business.next": {
    de: "Als Nächstes: Adresse und Besichtigungstermin. Inventar oder Zahlung brauchen wir nicht.",
    en: "Address and visit time are next. No inventory or payment is needed.",
    ar: "التالي: العنوان وموعد الزيارة. لا حاجة لجرد أو دفع.",
    tr: "Sırada adres ve inceleme zamanı var. Envanter veya ödeme gerekmez.",
  },
  "plan.payment.noCharge": {
    de: "Jetzt wird nichts abgebucht. Die Zahlungsdaten bekommst du mit der Bestätigung; die Zahlung verbuchen wir, sobald sie eingeht.",
    en: "Nothing is charged now. You’ll get the payment details with your confirmation; we record the payment once it arrives.",
    ar: "لن يُخصم شيء الآن. ستصلك تفاصيل الدفع مع التأكيد، ونسجّل الدفعة عند وصولها.",
    tr: "Şimdi ücret alınmaz. Ödeme bilgilerini onayla birlikte alırsınız; ödeme ulaştığında kaydederiz.",
  },
  "plan.payment.whoTitle": {
    de: "Für wen ist die Buchung?",
    en: "Who is this booking for?",
    ar: "لمن هذا الحجز؟",
    tr: "Bu rezervasyon kimin için?",
  },
  "plan.payment.whoSub": {
    de: "Du kannst für dich oder für jemand anderen buchen.",
    en: "You can book for yourself or for another person.",
    ar: "يمكنك الحجز لنفسك أو لشخص آخر.",
    tr: "Kendiniz veya başka biri için rezervasyon yapabilirsiniz.",
  },
  "plan.payment.phoneHint": {
    de: "Damit das Team dich am Einsatztag erreicht.",
    en: "So the crew can reach you on the day.",
    ar: "ليتمكن الفريق من الوصول إليك يوم الخدمة.",
    tr: "Ekip size o gün ulaşabilsin diye.",
  },
  "plan.payment.billTo": {
    de: "Rechnung und Bestätigung gehen an",
    en: "Invoice and confirmation go to",
    ar: "الفاتورة والتأكيد يُرسلان إلى",
    tr: "Fatura ve onay gönderilecek kişi",
  },
  "plan.payment.me": {
    de: "Mich",
    en: "Me",
    ar: "أنا",
    tr: "Ben",
  },
  "plan.payment.meHint": {
    de: "Deine Kontodaten nach der Anmeldung",
    en: "Your account details after you sign in",
    ar: "بيانات حسابك بعد تسجيل الدخول",
    tr: "Giriş yaptıktan sonra hesap bilgileriniz",
  },
  "plan.payment.other": {
    de: "Jemand anderen",
    en: "Someone else",
    ar: "شخص آخر",
    tr: "Başka biri",
  },
  "plan.payment.otherHint": {
    de: "Ich buche für eine andere Person. Sie bekommt die Rechnung.",
    en: "I book for another person. They receive the invoice.",
    ar: "أحجز لشخص آخر. يستلم هو الفاتورة.",
    tr: "Başka biri için rezervasyon yapıyorum. Faturayı o alır.",
  },
  "plan.payment.otherEmail": {
    de: "E-Mail für die Rechnung",
    en: "Email for the invoice",
    ar: "البريد الإلكتروني للفاتورة",
    tr: "Fatura için e-posta",
  },
  "plan.payment.billingAddress": {
    de: "Rechnungsadresse",
    en: "Billing address",
    ar: "عنوان الفوترة",
    tr: "Fatura adresi",
  },
  "plan.payment.billingAddressPlaceholder": {
    de: "Straße, Nr., PLZ, Ort",
    en: "Street, number, postcode, city",
    ar: "الشارع، الرقم، الرمز البريدي، المدينة",
    tr: "Sokak, numara, posta kodu, şehir",
  },
  "plan.payment.methodTitle": {
    de: "Wie möchtest du bezahlen?",
    en: "How would you like to pay?",
    ar: "كيف تريد الدفع؟",
    tr: "Nasıl ödemek istersiniz?",
  },
  "plan.payment.methodSub": {
    de: "Deine bevorzugte Zahlungsart. Wir senden dir die passenden Angaben.",
    en: "Your preferred method. We’ll send you the matching details.",
    ar: "طريقة الدفع المفضلة لديك. سنرسل لك التفاصيل المناسبة.",
    tr: "Tercih ettiğiniz yöntem. Uygun bilgileri size göndeririz.",
  },
  "plan.pay.bank_transfer": {
    de: "Überweisung",
    en: "Bank transfer",
    ar: "تحويل بنكي",
    tr: "Banka havalesi",
  },
  "plan.pay.bank_transferHint": {
    de: "Unsere IBAN kommt mit der Bestätigung",
    en: "Our IBAN comes with your confirmation",
    ar: "يصلك رقم IBAN مع التأكيد",
    tr: "IBAN bilgimiz onayla birlikte gelir",
  },
  "plan.pay.card": {
    de: "Kredit- / Debitkarte",
    en: "Credit / debit card",
    ar: "بطاقة ائتمان / خصم",
    tr: "Kredi / banka kartı",
  },
  "plan.pay.cardHint": {
    de: "Am Einsatztag beim Team",
    en: "With the crew on the day",
    ar: "مع الفريق يوم الخدمة",
    tr: "O gün ekiple",
  },
  "plan.pay.paypal": {
    de: "PayPal",
    en: "PayPal",
    ar: "PayPal",
    tr: "PayPal",
  },
  "plan.pay.paypalHint": {
    de: "Zahlungslink per E-Mail",
    en: "Payment link by email",
    ar: "رابط الدفع عبر البريد",
    tr: "E-postayla ödeme bağlantısı",
  },
  "plan.pay.cash": {
    de: "Bar bei Abschluss",
    en: "Cash on completion",
    ar: "نقداً عند الانتهاء",
    tr: "İş bitiminde nakit",
  },
  "plan.pay.cashHint": {
    de: "Du bezahlst das Team, wenn alles erledigt ist",
    en: "Pay the crew when the job is done",
    ar: "ادفع للفريق عند انتهاء العمل",
    tr: "İş bittiğinde ekibe ödeyin",
  },
  "plan.payment.confirmTitle": {
    de: "Bevor du bestätigst",
    en: "Before you confirm",
    ar: "قبل التأكيد",
    tr: "Onaylamadan önce",
  },
  "plan.payment.termsBefore": {
    de: "Ich akzeptiere die",
    en: "I accept the",
    ar: "أوافق على",
    tr: "Kabul ediyorum:",
  },
  "plan.payment.terms": {
    de: "AGB",
    en: "Terms of Service",
    ar: "شروط الخدمة",
    tr: "Hizmet Şartları",
  },
  "plan.payment.and": {
    de: "und die",
    en: "and the",
    ar: "و",
    tr: "ve",
  },
  "plan.payment.privacy": {
    de: "Datenschutzerklärung",
    en: "Privacy Policy",
    ar: "سياسة الخصوصية",
    tr: "Gizlilik Politikası",
  },
  "plan.payment.termsAfter": {
    de: " von m.on.",
    en: " of m.on.",
    ar: " لدى m.on.",
    tr: " (m.on).",
  },
  "plan.overview.noAddress": {
    de: "Adresse noch offen",
    en: "Address not entered",
    ar: "لم يُدخل العنوان",
    tr: "Adres girilmedi",
  },
  "plan.overview.accessOpen": {
    de: "noch offen",
    en: "to add",
    ar: "لم يُحدّد",
    tr: "eklenecek",
  },
  "plan.overview.lift": {
    de: "Aufzug",
    en: "lift",
    ar: "مصعد",
    tr: "asansör",
  },
  "plan.overview.noLift": {
    de: "kein Aufzug",
    en: "no lift",
    ar: "بلا مصعد",
    tr: "asansör yok",
  },
  "plan.overview.businessVisit": {
    de: "Geschäftsbesichtigung",
    en: "Business site visit",
    ar: "زيارة ميدانية للشركة",
    tr: "Kurumsal yerinde inceleme",
  },
  "plan.overview.company": {
    de: "Firma",
    en: "Company",
    ar: "الشركة",
    tr: "Şirket",
  },
  "plan.overview.services": {
    de: "Leistungen",
    en: "Services",
    ar: "الخدمات",
    tr: "Hizmetler",
  },
  "plan.overview.location": {
    de: "Ort",
    en: "Location",
    ar: "الموقع",
    tr: "Konum",
  },
  "plan.overview.siteVisit": {
    de: "Besichtigung",
    en: "Site visit",
    ar: "الزيارة الميدانية",
    tr: "Yerinde inceleme",
  },
  "plan.overview.quotation": {
    de: "Angebot",
    en: "Quotation",
    ar: "عرض السعر",
    tr: "Teklif",
  },
  "plan.overview.afterAssessment": {
    de: "Nach der Besichtigung",
    en: "After assessment",
    ar: "بعد المعاينة",
    tr: "İncelemeden sonra",
  },
  "plan.overview.afterTeam": {
    de: "Nach Prüfung durch das Team",
    en: "After team confirmation",
    ar: "بعد تأكيد الفريق",
    tr: "Ekip onayından sonra",
  },
  "plan.overview.from": {
    de: "Von",
    en: "From",
    ar: "من",
    tr: "Nereden",
  },
  "plan.overview.to": {
    de: "Nach",
    en: "To",
    ar: "إلى",
    tr: "Nereye",
  },
  "plan.overview.access": {
    de: "Zugang",
    en: "Access",
    ar: "الوصول",
    tr: "Erişim",
  },
  "plan.overview.inventory": {
    de: "Inventar",
    en: "Inventory",
    ar: "الجرد",
    tr: "Envanter",
  },
  "plan.overview.byArea": {
    de: "{area} m² Wohnfläche · ca. {volume} m³",
    en: "{area} m² living area · ~{volume} m³",
    ar: "{area} م² مساحة سكنية · حوالي {volume} م³",
    tr: "{area} m² yaşam alanı · ~{volume} m³",
  },
  "plan.overview.byItems": {
    de: "{rooms} Räume · {items} Teile · {volume} m³",
    en: "{rooms} spaces · {items} items · {volume} m³",
    ar: "{rooms} غرف · {items} أغراض · {volume} م³",
    tr: "{rooms} alan · {items} eşya · {volume} m³",
  },
  "plan.overview.team": {
    de: "Team",
    en: "Team",
    ar: "الفريق",
    tr: "Ekip",
  },
  "plan.overview.movers": {
    de: "{crew} Umzugshelfer",
    en: "{crew} movers",
    ar: "{crew} عمّال نقل",
    tr: "{crew} taşıyıcı",
  },
  "plan.overview.secondVan": {
    de: "2. Transporter",
    en: "2nd van",
    ar: "شاحنة ثانية",
    tr: "2. kamyonet",
  },
  "plan.overview.assembly": {
    de: "Montage",
    en: "Assembly",
    ar: "الفك والتركيب",
    tr: "Montaj",
  },
  "plan.overview.assemblyValue": {
    de: "{dis} Abbau · {re} Aufbau",
    en: "{dis} dismantle · {re} assemble",
    ar: "{dis} فك · {re} تركيب",
    tr: "{dis} sökme · {re} kurma",
  },
  "plan.overview.extras": {
    de: "Extras",
    en: "Extras",
    ar: "الإضافات",
    tr: "Ekstralar",
  },
  "plan.overview.specials": {
    de: "Besonderes",
    en: "Special items",
    ar: "أغراض خاصة",
    tr: "Özel eşyalar",
  },
  "plan.overview.moveDate": {
    de: "Umzugstermin",
    en: "Move date",
    ar: "موعد النقل",
    tr: "Taşınma tarihi",
  },
  "plan.overview.work": {
    de: "Arbeiten",
    en: "Work",
    ar: "الأعمال",
    tr: "İşler",
  },
  "plan.overview.clean": {
    de: "Reinigung",
    en: "Clean",
    ar: "التنظيف",
    tr: "Temizlik",
  },
  "plan.overview.scope": {
    de: "Umfang",
    en: "Scope",
    ar: "النطاق",
    tr: "Kapsam",
  },
  "plan.overview.floorArea": {
    de: "{area} m² Fläche",
    en: "{area} m² floor area",
    ar: "{area} م² مساحة",
    tr: "{area} m² alan",
  },
  "plan.overview.cleaningDate": {
    de: "Reinigungstermin",
    en: "Cleaning date",
    ar: "موعد التنظيف",
    tr: "Temizlik tarihi",
  },
  "plan.overview.items": {
    de: "Teile",
    en: "Items",
    ar: "الأغراض",
    tr: "Eşyalar",
  },
  "plan.overview.collection": {
    de: "Abholung",
    en: "Collection",
    ar: "الجمع",
    tr: "Toplama",
  },
  "plan.summary.label": {
    de: "Zusammenfassung der Buchung",
    en: "Booking summary",
    ar: "ملخص الحجز",
    tr: "Rezervasyon özeti",
  },
  "plan.summary.title": {
    de: "Dein Plan.",
    en: "Your plan.",
    ar: "خطتك.",
    tr: "Planınız.",
  },
  "plan.summary.sub": {
    de: "Er entsteht – Detail für Detail.",
    en: "Coming together, detail by detail.",
    ar: "تتشكّل تفصيلاً بعد تفصيل.",
    tr: "Ayrıntı ayrıntı şekilleniyor.",
  },
  "plan.summary.empty": {
    de: "Wähle deine Leistungen. Die wichtigsten Angaben erscheinen hier.",
    en: "Choose your services. Your key details will appear here.",
    ar: "اختر خدماتك. ستظهر أهم التفاصيل هنا.",
    tr: "Hizmetlerinizi seçin. Temel bilgileriniz burada görünecek.",
  },
  "plan.summary.detailsFirst": {
    de: "Erst die Details.",
    en: "The details first.",
    ar: "التفاصيل أولاً.",
    tr: "Önce ayrıntılar.",
  },
  "plan.summary.detailsFirstSub": {
    de: "Die Preisaufstellung kommt bei der Prüfung am Ende.",
    en: "Your price breakdown comes at the final review.",
    ar: "تأتي تفاصيل السعر في المراجعة النهائية.",
    tr: "Fiyat dökümünüz son kontrolde gelir.",
  },
  "plan.summary.inclVat": {
    de: "vom Server berechnet",
    en: "priced by our system",
    ar: "محسوب من نظامنا",
    tr: "sistemimizce fiyatlandı",
  },
  "plan.summary.next": {
    de: "Als Nächstes: {step}",
    en: "Next: {step}",
    ar: "التالي: {step}",
    tr: "Sıradaki: {step}",
  },
  "plan.summary.view": {
    de: "Details ansehen",
    en: "View your details",
    ar: "عرض التفاصيل",
    tr: "Ayrıntıları gör",
  },
  "plan.submit.waitForPrice": {
    de: "Bitte warte, bis der Preis berechnet ist.",
    en: "Please wait until your price is calculated.",
    ar: "يرجى الانتظار حتى يتم حساب السعر.",
    tr: "Lütfen fiyatınız hesaplanana kadar bekleyin.",
  },
  "plan.submit.slotTaken": {
    de: "Dieser Tag ist inzwischen ausgebucht. Bitte wähle im Schritt „Termin“ einen anderen.",
    en: "That day has just been booked up. Please choose another in the schedule step.",
    ar: "تم حجز هذا اليوم بالكامل للتو. يرجى اختيار يوم آخر في خطوة الموعد.",
    tr: "O gün az önce doldu. Lütfen takvim adımında başka bir gün seçin.",
  },
  "plan.submit.quoteStale": {
    de: "Der Preis ist abgelaufen und wird neu berechnet. Bitte bestätige danach noch einmal.",
    en: "Your price has expired and is being recalculated. Please confirm again afterwards.",
    ar: "انتهت صلاحية السعر ويجري إعادة حسابه. يرجى التأكيد مرة أخرى بعد ذلك.",
    tr: "Fiyatınızın süresi doldu ve yeniden hesaplanıyor. Lütfen ardından tekrar onaylayın.",
  },
  "plan.submit.partly": {
    de: "Bereits gebucht: {references}.",
    en: "Already booked: {references}.",
    ar: "تم الحجز بالفعل: {references}.",
    tr: "Zaten rezerve edildi: {references}.",
  },
  "plan.done.title": {
    de: "Danke! Deine Buchung ist bei uns.",
    en: "Thank you! Your booking is with us.",
    ar: "شكراً لك! حجزك وصلنا.",
    tr: "Teşekkürler! Rezervasyonunuz bize ulaştı.",
  },
  "plan.done.titleNamed": {
    de: "Danke, {name}! Deine Buchung ist bei uns.",
    en: "Thank you, {name}! Your booking is with us.",
    ar: "شكراً يا {name}! حجزك وصلنا.",
    tr: "Teşekkürler {name}! Rezervasyonunuz bize ulaştı.",
  },
  "plan.done.requestTitle": {
    de: "Danke! Deine Anfrage ist bei uns.",
    en: "Thank you! Your request is with us.",
    ar: "شكراً لك! طلبك وصلنا.",
    tr: "Teşekkürler! Talebiniz bize ulaştı.",
  },
  "plan.done.requestTitleNamed": {
    de: "Danke, {name}! Deine Anfrage ist bei uns.",
    en: "Thank you, {name}! Your request is with us.",
    ar: "شكراً يا {name}! طلبك وصلنا.",
    tr: "Teşekkürler {name}! Talebiniz bize ulaştı.",
  },
  "plan.done.ordersLead": {
    de: "Wir haben dir eine Bestätigung per E-Mail geschickt. Deine Aufträge findest du jederzeit in deinem Konto.",
    en: "We’ve sent you a confirmation by email. You’ll find your orders in your account at any time.",
    ar: "أرسلنا لك تأكيداً عبر البريد الإلكتروني. ستجد طلباتك في حسابك في أي وقت.",
    tr: "Size e-postayla onay gönderdik. Siparişlerinizi her zaman hesabınızda bulabilirsiniz.",
  },
  "plan.done.requestLead": {
    de: "Wir haben deine Anfrage erhalten und melden uns innerhalb von 48 Stunden, um den Termin zu bestätigen.",
    en: "We’ve received your request and will contact you within 48 hours to confirm the appointment.",
    ar: "استلمنا طلبك وسنتواصل معك خلال 48 ساعة لتأكيد الموعد.",
    tr: "Talebinizi aldık; randevuyu onaylamak için 48 saat içinde sizinle iletişime geçeceğiz.",
  },
  "plan.done.request": {
    de: "Anfrage an das Team",
    en: "Request to the team",
    ar: "طلب إلى الفريق",
    tr: "Ekibe talep",
  },
  "plan.done.requestHint": {
    de: "Besichtigung und Angebot nach Prüfung",
    en: "Visit and quote after assessment",
    ar: "الزيارة والعرض بعد التقييم",
    tr: "İnceleme ve değerlendirme sonrası teklif",
  },
  "plan.done.myOrders": {
    de: "Zu meinen Aufträgen",
    en: "Go to my orders",
    ar: "إلى طلباتي",
    tr: "Siparişlerime git",
  },
  "plan.done.restart": {
    de: "Neuen Plan beginnen",
    en: "Start a new plan",
    ar: "بدء خطة جديدة",
    tr: "Yeni plan başlat",
  },
  "plan.help.kicker": {
    de: "m.on / Buchungshilfe",
    en: "m.on / booking guide",
    ar: "m.on / دليل الحجز",
    tr: "m.on / rezervasyon rehberi",
  },
  "plan.help.title": {
    de: "Ein bisschen Hilfe, wenn du sie brauchst.",
    en: "A little help, when you need it.",
    ar: "قليل من المساعدة عند الحاجة.",
    tr: "İhtiyacınız olduğunda biraz yardım.",
  },
  "plan.help.welcomeTitle": {
    de: "Beginne mit der Frage, für wen du buchst.",
    en: "Start with who you’re booking for.",
    ar: "ابدأ بتحديد لمن تحجز.",
    tr: "Kimin için rezervasyon yaptığınızla başlayın.",
  },
  "plan.help.start": {
    de: "Los geht’s",
    en: "Let’s get started",
    ar: "لنبدأ",
    tr: "Başlayalım",
  },
  "plan.help.back": {
    de: "Zurück zu meinem Plan",
    en: "Back to my plan",
    ar: "العودة إلى خطتي",
    tr: "Planıma dön",
  },
  "plan.help.start.q": {
    de: "Wie funktioniert der Planer?",
    en: "How does the planner work?",
    ar: "كيف يعمل المخطط؟",
    tr: "Planlayıcı nasıl çalışır?",
  },
  "plan.help.start.a": {
    de: "Wähle „Privatkunde“ für Leistungen rund um dein Zuhause oder „Geschäftskunde“ für den Firmenablauf. Wähle die Leistungen, füge deine Adressen hinzu und baue deinen Plan. Vor der Bestätigung prüfst du alles.",
    en: "Select Private customer for home services, or Business customer for the company flow. Choose services, add your locations and build your plan. You review everything before confirming.",
    ar: "اختر «عميل خاص» لخدمات المنزل أو «عميل تجاري» لمسار الشركات. اختر الخدمات وأضف مواقعك وابنِ خطتك. ستراجع كل شيء قبل التأكيد.",
    tr: "Ev hizmetleri için Bireysel müşteri, şirket süreci için Kurumsal müşteri seçin. Hizmetleri seçin, konumlarınızı ekleyin ve planınızı oluşturun. Onaylamadan önce her şeyi gözden geçirirsiniz.",
  },
  "plan.help.inventory.q": {
    de: "Wie funktioniert das Inventar Raum für Raum?",
    en: "How does the room-by-room inventory work?",
    ar: "كيف يعمل الجرد غرفة بغرفة؟",
    tr: "Oda oda envanter nasıl çalışır?",
  },
  "plan.help.inventory.a": {
    de: "Lege jeden Raum an und füge Teile aus unserem Katalog hinzu. Anzahl und Vorbereitung kannst du für jedes Teil ändern. Klicke auf einen Raum, um zu wechseln.",
    en: "Add each space in your home, then add items from our catalogue. Quantity and preparation are editable for every item. Click a room to switch between spaces.",
    ar: "أضف كل مساحة في منزلك ثم أضف الأغراض من الكتالوج. يمكنك تعديل الكمية والتحضير لكل غرض. انقر على غرفة للتنقل بين المساحات.",
    tr: "Evinizdeki her alanı ekleyin, ardından kataloğumuzdan eşya ekleyin. Her eşyanın adedi ve hazırlığı düzenlenebilir. Alanlar arasında geçmek için bir odaya tıklayın.",
  },
  "plan.help.missing.q": {
    de: "Was, wenn ich ein Teil nicht finde?",
    en: "What if I can’t find an item?",
    ar: "ماذا لو لم أجد غرضاً؟",
    tr: "Bir eşyayı bulamazsam ne olur?",
  },
  "plan.help.missing.a": {
    de: "Nutze „Eigener Eintrag“ in jedem Raum. Gib Name, Anzahl und eine Beschreibung ein — das Team prüft den Aufwand.",
    en: "Use “Custom item” in any room. Enter a name, quantity and description — the team reviews the effort.",
    ar: "استخدم «غرض مخصص» في أي غرفة. أدخل الاسم والكمية والوصف — وسيراجع الفريق الجهد المطلوب.",
    tr: "Herhangi bir odada “Özel eşya”yı kullanın. Ad, adet ve açıklama girin — ekip gereken eforu inceler.",
  },
  "plan.help.assembly.q": {
    de: "Wer übernimmt Ab- und Aufbau?",
    en: "Who handles dismantling or installation?",
    ar: "من يتولى الفك والتركيب؟",
    tr: "Sökme ve kurulumu kim yapar?",
  },
  "plan.help.assembly.a": {
    de: "Du wählst es pro Möbelstück: transportbereit, Abbau, Aufbau oder beides durch das Team. Ab- und Aufbau sind im Preis enthalten.",
    en: "You choose per piece: ready to move, or dismantled, reassembled or both by the team. Dismantling and reassembly are part of the price.",
    ar: "تختار لكل قطعة: جاهزة للنقل، أو يفكّها الفريق أو يركّبها أو كلاهما. الفك والتركيب ضمن السعر.",
    tr: "Her parça için seçersiniz: taşımaya hazır ya da ekip tarafından sökme, kurma veya ikisi. Sökme ve kurma fiyata dahildir.",
  },
  "plan.help.price.q": {
    de: "Wann sehe ich den Preis?",
    en: "When will I see the price?",
    ar: "متى أرى السعر؟",
    tr: "Fiyatı ne zaman göreceğim?",
  },
  "plan.help.price.a": {
    de: "Erst trägst du Orte, Inventar und Termine ein. Die komplette Preisaufstellung erscheint bei „Prüfen & Preis“ — berechnet von unserem System, nicht im Browser.",
    en: "First add your locations, inventory and schedule. Your full price breakdown appears at Review & price — calculated by our system, not in your browser.",
    ar: "أضف أولاً مواقعك وجردك ومواعيدك. تظهر تفاصيل السعر الكاملة في «المراجعة والسعر» — يحسبها نظامنا وليس متصفحك.",
    tr: "Önce konumlarınızı, envanterinizi ve takviminizi ekleyin. Tam fiyat dökümünüz Kontrol ve fiyat adımında görünür — tarayıcınızda değil, sistemimizde hesaplanır.",
  },
  "plan.help.photos.q": {
    de: "Kann ich Fotos hinzufügen?",
    en: "Can I add photos of my home?",
    ar: "هل يمكنني إضافة صور لمنزلي؟",
    tr: "Evimin fotoğraflarını ekleyebilir miyim?",
  },
  "plan.help.photos.a": {
    de: "Ja, bis zu 10 Fotos. Sie bleiben vorerst in deinem Browser; das Team fragt danach, wenn es sie braucht.",
    en: "Yes, up to 10 photos. For now they stay in your browser; the team will ask for them if needed.",
    ar: "نعم، حتى 10 صور. تبقى حالياً في متصفحك، وسيطلبها الفريق عند الحاجة.",
    tr: "Evet, en fazla 10 fotoğraf. Şimdilik tarayıcınızda kalır; ekip gerekirse ister.",
  },
  "plan.help.contact.q": {
    de: "Wie erreiche ich das Team?",
    en: "How do I contact the company?",
    ar: "كيف أتواصل مع الشركة؟",
    tr: "Şirketle nasıl iletişime geçerim?",
  },
  "plan.help.contact.a": {
    de: "Schreib uns über das Kontaktformular auf unserer Website (Fragen) – wir antworten meist innerhalb eines Werktags.",
    en: "Write to us through the contact form on our website (Questions) – we usually reply within one working day.",
    ar: "راسلنا عبر نموذج التواصل في موقعنا (الأسئلة) – نرد عادةً خلال يوم عمل واحد.",
    tr: "Web sitemizdeki iletişim formu (Sorular) üzerinden bize yazın – genellikle bir iş günü içinde yanıtlarız.",
  },
  "plan.error.services": {
    de: "Wähle mindestens eine Leistung, um fortzufahren.",
    en: "Select at least one service to continue.",
    ar: "اختر خدمة واحدة على الأقل للمتابعة.",
    tr: "Devam etmek için en az bir hizmet seçin.",
  },
  "plan.error.businessSignIn": {
    de: "Melde dich an, um mit deiner Besichtigung fortzufahren.",
    en: "Sign in to continue to your visit.",
    ar: "سجّل الدخول للمتابعة إلى الزيارة.",
    tr: "İncelemenize devam etmek için giriş yapın.",
  },
  "plan.error.company": {
    de: "Gib deinen Firmennamen ein.",
    en: "Enter your company name.",
    ar: "أدخل اسم شركتك.",
    tr: "Şirket adınızı girin.",
  },
  "plan.error.address": {
    de: "Gib eine Adresse ein.",
    en: "Enter an address.",
    ar: "أدخل عنواناً.",
    tr: "Bir adres girin.",
  },
  "plan.error.locations": {
    de: "Wähle mindestens eine Adresse für diese Leistung.",
    en: "Choose at least one address for this service.",
    ar: "اختر عنواناً واحداً على الأقل لهذه الخدمة.",
    tr: "Bu hizmet için en az bir adres seçin.",
  },
  "plan.error.sameAddress": {
    de: "Abhol- und Zieladresse brauchen eine andere Adresse oder ein anderes Stockwerk.",
    en: "Pickup and delivery need a different address or floor.",
    ar: "يجب أن يختلف عنوان الاستلام والتسليم أو الطابق.",
    tr: "Alış ve teslim için farklı bir adres veya kat gerekli.",
  },
  "plan.error.floor": {
    de: "Wähle ein Stockwerk.",
    en: "Choose a floor.",
    ar: "اختر الطابق.",
    tr: "Bir kat seçin.",
  },
  "plan.error.liftFit": {
    de: "Wähle, was in den Aufzug passt.",
    en: "Choose what fits in the elevator.",
    ar: "اختر ما يتسع في المصعد.",
    tr: "Asansöre neyin sığdığını seçin.",
  },
  "plan.error.parking": {
    de: "Wähle eine Parkmöglichkeit.",
    en: "Choose a parking option.",
    ar: "اختر خيار الوقوف.",
    tr: "Bir park seçeneği seçin.",
  },
  "plan.error.method": {
    de: "Wähle, wie wir deinen Umzug berechnen sollen.",
    en: "Choose how we should calculate your move.",
    ar: "اختر طريقة حساب انتقالك.",
    tr: "Taşınmanızı nasıl hesaplayacağımızı seçin.",
  },
  "plan.error.livingArea": {
    de: "Gib eine Wohnfläche zwischen 10 und 2.000 m² ein.",
    en: "Enter a living area between 10 and 2,000 m².",
    ar: "أدخل مساحة سكنية بين 10 و2000 م².",
    tr: "10 ile 2.000 m² arasında bir yaşam alanı girin.",
  },
  "plan.error.areaAssembly": {
    de: "Wähle Ja oder Nein, um fortzufahren.",
    en: "Choose Yes or No to continue.",
    ar: "اختر نعم أو لا للمتابعة.",
    tr: "Devam etmek için Evet veya Hayır seçin.",
  },
  "plan.error.areaAssemblyItems": {
    de: "Füge mindestens ein Möbelstück hinzu oder wähle Nein.",
    en: "Add at least one item, or choose No.",
    ar: "أضف قطعة واحدة على الأقل أو اختر لا.",
    tr: "En az bir eşya ekleyin veya Hayır'ı seçin.",
  },
  "plan.error.assemblyMode": {
    de: "Wähle für jedes Möbelstück Abbau, Aufbau oder beides.",
    en: "Choose dismantle, reassemble or both for every item.",
    ar: "اختر الفك أو التركيب أو كليهما لكل قطعة.",
    tr: "Her eşya için sökme, kurma veya ikisini seçin.",
  },
  "plan.error.inventoryEmpty": {
    de: "Füge mindestens ein Teil hinzu, das umziehen soll.",
    en: "Add at least one item you want to move.",
    ar: "أضف غرضاً واحداً على الأقل تريد نقله.",
    tr: "Taşımak istediğiniz en az bir eşya ekleyin.",
  },
  "plan.error.preparation": {
    de: "Wähle für jedes markierte Teil die Vorbereitung.",
    en: "Choose the preparation for every highlighted item.",
    ar: "اختر التحضير لكل غرض محدّد.",
    tr: "İşaretli her eşya için hazırlığı seçin.",
  },
  "plan.error.acceptExtra": {
    de: "Bitte bestätige das Kästchen, um fortzufahren.",
    en: "Please tick the box to confirm before continuing.",
    ar: "يرجى تحديد المربع للتأكيد قبل المتابعة.",
    tr: "Devam etmeden önce lütfen kutuyu işaretleyin.",
  },
  "plan.error.itemName": {
    de: "Gib eine Bezeichnung ein.",
    en: "Enter a name.",
    ar: "أدخل اسماً.",
    tr: "Bir ad girin.",
  },
  "plan.error.renovationWork": {
    de: "Wähle mindestens eine Arbeit.",
    en: "Choose at least one type of work.",
    ar: "اختر نوع عمل واحداً على الأقل.",
    tr: "En az bir iş türü seçin.",
  },
  "plan.error.renovationArea": {
    de: "Gib eine ungefähre Fläche über 0 und bis 10.000 m² ein.",
    en: "Enter an approximate area greater than 0 and no more than 10,000 m².",
    ar: "أدخل مساحة تقريبية أكبر من 0 ولا تتجاوز 10000 م².",
    tr: "0'dan büyük ve en fazla 10.000 m² yaklaşık bir alan girin.",
  },
  "plan.error.cleaningType": {
    de: "Wähle Umzugsreinigung, Fenster oder beides.",
    en: "Choose Moving clean, Windows, or both.",
    ar: "اختر تنظيف الانتقال أو النوافذ أو كليهما.",
    tr: "Taşınma temizliği, Pencereler veya ikisini seçin.",
  },
  "plan.error.cleaningArea": {
    de: "Gib die zu reinigende Fläche ein.",
    en: "Enter the floor area to clean.",
    ar: "أدخل المساحة المراد تنظيفها.",
    tr: "Temizlenecek alanı girin.",
  },
  "plan.error.cleaningWindows": {
    de: "Füge mindestens ein Fenster hinzu.",
    en: "Add at least one window.",
    ar: "أضف نافذة واحدة على الأقل.",
    tr: "En az bir pencere ekleyin.",
  },
  "plan.error.disposalCounts": {
    de: "Füge mindestens ein Teil zum Abholen hinzu.",
    en: "Add at least one item to collect.",
    ar: "أضف غرضاً واحداً على الأقل للجمع.",
    tr: "Toplanacak en az bir eşya ekleyin.",
  },
  "plan.error.date": {
    de: "Wähle ein zukünftiges Datum.",
    en: "Choose a future date.",
    ar: "اختر تاريخاً مستقبلياً.",
    tr: "Gelecekte bir tarih seçin.",
  },
  "plan.error.window": {
    de: "Wähle ein Ankunftsfenster.",
    en: "Choose an arrival window.",
    ar: "اختر نافذة الوصول.",
    tr: "Bir varış aralığı seçin.",
  },
  "plan.error.cleanAfterMove": {
    de: "Die Auszugsreinigung muss nach dem Umzug stattfinden.",
    en: "Move-out cleaning at your current address must follow the move.",
    ar: "يجب أن يأتي تنظيف المغادرة بعد النقل.",
    tr: "Mevcut adresinizdeki çıkış temizliği taşınmadan sonra olmalıdır.",
  },
  "plan.error.firstName": {
    de: "Gib deinen Vornamen ein.",
    en: "Enter your first name.",
    ar: "أدخل الاسم الأول.",
    tr: "Adınızı girin.",
  },
  "plan.error.lastName": {
    de: "Gib deinen Nachnamen ein.",
    en: "Enter your last name.",
    ar: "أدخل الكنية.",
    tr: "Soyadınızı girin.",
  },
  "plan.error.email": {
    de: "Gib eine gültige E-Mail-Adresse ein.",
    en: "Enter a valid email address.",
    ar: "أدخل بريداً إلكترونياً صالحاً.",
    tr: "Geçerli bir e-posta adresi girin.",
  },
  "plan.error.phone": {
    de: "Gib eine Telefonnummer ein.",
    en: "Enter a phone number.",
    ar: "أدخل رقم الهاتف.",
    tr: "Bir telefon numarası girin.",
  },
  "plan.error.requestConsent": {
    de: "Bitte erlaube uns, dich zu deiner Anfrage zu kontaktieren.",
    en: "Allow us to contact you about your request.",
    ar: "اسمح لنا بالتواصل معك بخصوص طلبك.",
    tr: "Talebiniz hakkında sizinle iletişime geçmemize izin verin.",
  },
  "plan.error.signIn": {
    de: "Melde dich an oder erstelle ein Konto, um zu buchen.",
    en: "Sign in or create an account to book.",
    ar: "سجّل الدخول أو أنشئ حساباً للحجز.",
    tr: "Rezervasyon için giriş yapın veya hesap oluşturun.",
  },
  "plan.error.billingAddress": {
    de: "Gib die Rechnungsadresse ein.",
    en: "Enter the billing address.",
    ar: "أدخل عنوان الفوترة.",
    tr: "Fatura adresini girin.",
  },
  "plan.error.terms": {
    de: "Bitte akzeptiere die AGB, um zu buchen.",
    en: "Accept the terms to confirm your booking.",
    ar: "يرجى قبول الشروط لتأكيد الحجز.",
    tr: "Rezervasyonu onaylamak için şartları kabul edin.",
  },
  // ── Planner: what the office configures (Services, Booking site, Settings)
  "plan.error.required": {
    de: "Bitte fülle dieses Feld aus.",
    en: "Please fill in this field.",
    ar: "يرجى ملء هذا الحقل.",
    tr: "Lütfen bu alanı doldurun.",
  },
  "plan.error.specialsRequired": {
    de: "Füge mindestens einen besonderen Gegenstand hinzu.",
    en: "Add at least one special item.",
    ar: "أضف غرضاً خاصاً واحداً على الأقل.",
    tr: "En az bir özel eşya ekleyin.",
  },
  "plan.error.answer": {
    de: "Bitte beantworte diese Frage.",
    en: "Please answer this question.",
    ar: "يرجى الإجابة عن هذا السؤال.",
    tr: "Lütfen bu soruyu yanıtlayın.",
  },
  "plan.error.number": {
    de: "Gib eine Zahl ein.",
    en: "Enter a number.",
    ar: "أدخل رقماً.",
    tr: "Bir sayı girin.",
  },
  "plan.error.customLocation": {
    de: "Wähle die Adresse für diese Leistung.",
    en: "Choose the address for this service.",
    ar: "اختر العنوان لهذه الخدمة.",
    tr: "Bu hizmet için adresi seçin.",
  },
  "plan.error.areaPending": {
    de: "Wir prüfen noch, ob wir diese Adresse anfahren – einen Moment.",
    en: "We’re still checking that we serve this address — one moment.",
    ar: "ما زلنا نتحقق من أننا نخدم هذا العنوان — لحظة من فضلك.",
    tr: "Bu adrese hizmet verip vermediğimizi kontrol ediyoruz — bir dakika.",
  },
  "plan.error.outsideArea": {
    de: "Diese Adresse liegt leider außerhalb unseres Einsatzgebiets.",
    en: "Sorry, this address is outside the areas we serve.",
    ar: "عذراً، هذا العنوان خارج المناطق التي نخدمها.",
    tr: "Üzgünüz, bu adres hizmet verdiğimiz bölgelerin dışında.",
  },
  "plan.error.areaPostcode": {
    de: "Gib die Adresse mit Postleitzahl ein, damit wir das Einsatzgebiet prüfen können.",
    en: "Add the postcode to the address so we can check we serve it.",
    ar: "أضف الرمز البريدي إلى العنوان لنتحقق من أننا نخدمه.",
    tr: "Hizmet bölgesini kontrol edebilmemiz için adrese posta kodunu ekleyin.",
  },
  "plan.area.served": {
    de: "Wir sind aktuell hier im Einsatz: {areas}.",
    en: "We currently serve: {areas}.",
    ar: "نخدم حالياً: {areas}.",
    tr: "Şu anda hizmet verdiğimiz yerler: {areas}.",
  },
  "plan.area.contact": {
    de: "Sprich uns an – vielleicht finden wir trotzdem eine Lösung.",
    en: "Get in touch — we may still be able to help.",
    ar: "تواصل معنا — ربما نستطيع المساعدة رغم ذلك.",
    tr: "Bize ulaşın — belki yine de yardımcı olabiliriz.",
  },
  "plan.questions.title": {
    de: "Noch ein paar Fragen",
    en: "A few more questions",
    ar: "بعض الأسئلة الإضافية",
    tr: "Birkaç soru daha",
  },
  "plan.questions.sub": {
    de: "Damit das Team gut vorbereitet kommt.",
    en: "So the team arrives well prepared.",
    ar: "ليصل الفريق مستعداً جيداً.",
    tr: "Ekibin iyi hazırlanmış gelmesi için.",
  },
  "plan.questions.untitled": {
    de: "Frage",
    en: "Question",
    ar: "سؤال",
    tr: "Soru",
  },
  "plan.answer.yes": {
    de: "Ja",
    en: "Yes",
    ar: "نعم",
    tr: "Evet",
  },
  "plan.answer.no": {
    de: "Nein",
    en: "No",
    ar: "لا",
    tr: "Hayır",
  },
  "plan.copy.custom.title": {
    de: "Erzähl uns von deinem Vorhaben.",
    en: "Tell us about the job.",
    ar: "أخبرنا عن المهمة.",
    tr: "Bize işten bahsedin.",
  },
  "plan.copy.custom.lead": {
    de: "Ein paar Angaben, dann meldet sich unser Team mit einem Angebot.",
    en: "A few details, and our team gets back to you with a quote.",
    ar: "بعض التفاصيل، ثم يتواصل معك فريقنا بعرض سعر.",
    tr: "Birkaç bilgi verin, ekibimiz size bir teklifle dönsün.",
  },
  "plan.custom.noQuestions": {
    de: "Keine weiteren Fragen – das Team meldet sich bei dir.",
    en: "No more questions — the team will be in touch.",
    ar: "لا أسئلة أخرى — سيتواصل معك الفريق.",
    tr: "Başka soru yok — ekip sizinle iletişime geçecek.",
  },
  "plan.custom.quoteNote": {
    de: "Diese Leistung bepreist unser Team. Du bekommst ein Angebot, bevor etwas gebucht wird.",
    en: "Our team prices this service. You’ll get a quote before anything is booked.",
    ar: "يسعّر فريقنا هذه الخدمة. ستحصل على عرض سعر قبل حجز أي شيء.",
    tr: "Bu hizmeti ekibimiz fiyatlar. Bir şey rezerve edilmeden önce teklif alırsınız.",
  },
  "plan.services.customTagline": {
    de: "Angebot von unserem Team",
    en: "Quote from our team",
    ar: "عرض سعر من فريقنا",
    tr: "Ekibimizden teklif",
  },
  "plan.review.pending.request": {
    de: "Den Preis nennt dir das Team nach deiner Anfrage.",
    en: "The team prices this after your request.",
    ar: "يحدد الفريق السعر بعد طلبك.",
    tr: "Fiyatı ekip talebinizden sonra belirler.",
  },
  "plan.overview.preferredDate": {
    de: "Wunschtermin",
    en: "Preferred date",
    ar: "الموعد المفضّل",
    tr: "Tercih edilen tarih",
  },
  "plan.overview.photosChosen": {
    de: { one: "{count} Foto", other: "{count} Fotos" },
    en: { one: "{count} photo", other: "{count} photos" },
    ar: { zero: "لا صور", one: "صورة واحدة", two: "صورتان", few: "{count} صور", many: "{count} صورة", other: "{count} صورة" },
    tr: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
  },
  "plan.extras.priceFlat": {
    de: "+ {amount}",
    en: "+ {amount}",
    ar: "+ {amount}",
    tr: "+ {amount}",
  },
  "plan.extras.pricePerM3": {
    de: "{amount} / m³",
    en: "{amount} / m³",
    ar: "{amount} / م³",
    tr: "{amount} / m³",
  },
  "plan.common.customerType": {
    de: "Wer bucht?",
    en: "Who is booking?",
    ar: "من يحجز؟",
    tr: "Kim rezervasyon yapıyor?",
  },
  "plan.common.services": {
    de: "Gewählte Leistungen",
    en: "Selected services",
    ar: "الخدمات المختارة",
    tr: "Seçilen hizmetler",
  },
  "plan.error.photosRequired": {
    de: "Füge mindestens ein Foto hinzu.",
    en: "Add at least one photo.",
    ar: "أضف صورة واحدة على الأقل.",
    tr: "En az bir fotoğraf ekleyin.",
  },
  // ── Dashboard: rate card (/admin/preise) ─────────────────────────────
  "pricing.intro": {
    de: "Hier legst du fest, womit der Server jeden Preis berechnet. Eine Änderung gilt sofort für neue Angebote; bestehende Angebote und Aufträge behalten ihren Preis. Jede Änderung wird mit altem und neuem Wert protokolliert.",
    en: "These are the numbers the server prices every job with. A change applies to new quotes at once; existing quotes and orders keep their price. Every change is logged with its old and new value.",
    ar: "هذه هي الأرقام التي يحسب بها السيرفر سعر كل مهمة. يسري التغيير فوراً على العروض الجديدة، وتحتفظ العروض والطلبات الحالية بسعرها. كل تغيير يُسجَّل مع القيمة القديمة والجديدة.",
    tr: "Bunlar sunucunun her işi fiyatladığı rakamlardır. Bir değişiklik yeni tekliflere hemen uygulanır; mevcut teklifler ve siparişler fiyatlarını korur. Her değişiklik eski ve yeni değeriyle kaydedilir.",
  },
  "pricing.readOnly": {
    de: "Du kannst die Preise ansehen, aber nicht ändern.",
    en: "You can view the rates but not change them.",
    ar: "يمكنك عرض الأسعار دون تعديلها.",
    tr: "Fiyatları görebilir ama değiştiremezsiniz.",
  },
  "pricing.loadFailed": {
    de: "Die Preise konnten nicht geladen werden.",
    en: "The rates could not be loaded.",
    ar: "تعذّر تحميل الأسعار.",
    tr: "Fiyatlar yüklenemedi.",
  },
  "pricing.invalid": {
    de: "Gib eine Zahl mit höchstens zwei Nachkommastellen ein, z. B. 1.20.",
    en: "Enter a number with at most two decimals, e.g. 1.20.",
    ar: "أدخل رقماً بخانتين عشريتين كحد أقصى، مثلاً 1.20.",
    tr: "En fazla iki ondalıklı bir sayı girin, örn. 1.20.",
  },
  "pricing.saved": {
    de: "Gespeichert — gilt ab dem nächsten Angebot.",
    en: "Saved — applies from the next quote.",
    ar: "تم الحفظ — يسري من العرض التالي.",
    tr: "Kaydedildi — bir sonraki tekliften itibaren geçerli.",
  },
  "pricing.rate": {
    de: "Preis",
    en: "Rate",
    ar: "السعر",
    tr: "Fiyat",
  },
  "pricing.value": {
    de: "Wert",
    en: "Value",
    ar: "القيمة",
    tr: "Değer",
  },
  "pricing.updated": {
    de: "Zuletzt geändert",
    en: "Last changed",
    ar: "آخر تعديل",
    tr: "Son değişiklik",
  },
  "pricing.unit.hours": {
    de: "Std.",
    en: "h",
    ar: "ساعة",
    tr: "sa",
  },
  "pricing.example": {
    de: "Beispiel: Strecke in km",
    en: "Example: distance in km",
    ar: "مثال: المسافة بالكيلومتر",
    tr: "Örnek: km cinsinden mesafe",
  },
  "pricing.exampleResult": {
    de: "{km} km × {rate} = {total}",
    en: "{km} km × {rate} = {total}",
    ar: "{km} كم × {rate} = {total}",
    tr: "{km} km × {rate} = {total}",
  },
  "pricing.exampleShort": {
    de: "Normaler Kilometerpreis. Dazu kommen MwSt. und die übrigen Positionen des Angebots.",
    en: "Standard per-km rate. VAT and the quote’s other lines come on top.",
    ar: "سعر الكيلومتر العادي. تُضاف الضريبة وباقي بنود العرض.",
    tr: "Standart km ücreti. KDV ve teklifin diğer kalemleri eklenir.",
  },
  "pricing.exampleLong": {
    de: "Fernumzug: der Kilometerpreis für lange Strecken gilt für die ganze Strecke.",
    en: "Long distance: the long-distance rate applies to the whole distance.",
    ar: "مسافة طويلة: يُطبَّق سعر المسافات الطويلة على كامل المسافة.",
    tr: "Uzun mesafe: uzun mesafe ücreti tüm mesafeye uygulanır.",
  },
  "pricing.footnote": {
    de: "Die Strecke berechnet der Server aus den beiden Adressen. Kunden sehen sie in der Preisaufstellung als „km × Preis pro km“.",
    en: "The server works out the distance from the two addresses. Customers see it in their breakdown as “km × price per km”.",
    ar: "يحسب السيرفر المسافة من العنوانين. يراها العميل في تفاصيل السعر كـ «كم × سعر الكيلومتر».",
    tr: "Mesafeyi sunucu iki adresten hesaplar. Müşteriler bunu dökümde “km × km ücreti” olarak görür.",
  },
  "pricing.group.travel": {
    de: "Strecke",
    en: "Travel",
    ar: "المسافة",
    tr: "Mesafe",
  },
  "pricing.group.travel.hint": {
    de: "Nur bei Umzügen: jeder Kilometer zwischen Auszugs- und Einzugsadresse.",
    en: "Moves only: every kilometre between the old and the new address.",
    ar: "للنقل فقط: كل كيلومتر بين العنوان القديم والجديد.",
    tr: "Yalnızca taşınmada: eski ve yeni adres arasındaki her kilometre.",
  },
  "pricing.group.base": {
    de: "Grundpreise",
    en: "Base rates",
    ar: "الأسعار الأساسية",
    tr: "Taban fiyatlar",
  },
  "pricing.group.base.hint": {
    de: "Was ein Auftrag kostet, bevor Umfang, Strecke oder Extras dazukommen.",
    en: "What a job costs before scope, distance or extras.",
    ar: "تكلفة المهمة قبل الحجم والمسافة والإضافات.",
    tr: "Kapsam, mesafe veya ekstralardan önce bir işin maliyeti.",
  },
  "pricing.group.area": {
    de: "Preis pro m²",
    en: "Price per m²",
    ar: "السعر لكل م²",
    tr: "m² başına fiyat",
  },
  "pricing.group.area.hint": {
    de: "Wenn nach Wohnfläche statt nach Gegenständen berechnet wird.",
    en: "When a job is priced by living area rather than by items.",
    ar: "عند التسعير حسب المساحة بدلاً من الأغراض.",
    tr: "İş eşya yerine yaşam alanına göre fiyatlandığında.",
  },
  "pricing.group.extras": {
    de: "Zuschläge & Extras",
    en: "Surcharges & extras",
    ar: "الرسوم الإضافية والإضافات",
    tr: "Ek ücretler ve ekstralar",
  },
  "pricing.group.extras.hint": {
    de: "Etagen ohne Aufzug, Zusatzleistungen, Team und Samstag.",
    en: "Floors without a lift, add-on services, crew and Saturdays.",
    ar: "الطوابق بلا مصعد، والخدمات الإضافية، والفريق، ويوم السبت.",
    tr: "Asansörsüz katlar, ek hizmetler, ekip ve cumartesi.",
  },
  "pricing.group.terms": {
    de: "Rabatte, Steuer & Bedingungen",
    en: "Discounts, tax & terms",
    ar: "الخصومات والضريبة والشروط",
    tr: "İndirimler, vergi ve koşullar",
  },
  "pricing.group.terms.hint": {
    de: "Gilt für jedes Angebot, nachdem alle Positionen addiert sind.",
    en: "Applied to every quote once all its lines are added up.",
    ar: "يُطبَّق على كل عرض بعد جمع كل البنود.",
    tr: "Tüm kalemler toplandıktan sonra her teklife uygulanır.",
  },
  "pricing.group.duration": {
    de: "Zeitschätzung",
    en: "Duration estimate",
    ar: "تقدير المدة",
    tr: "Süre tahmini",
  },
  "pricing.group.duration.hint": {
    de: "Kein Preis: bestimmt, ob ein Auftrag einen zweiten Tag belegt.",
    en: "Not a price: decides whether a job takes a second day.",
    ar: "ليس سعراً: يحدد ما إذا كانت المهمة تحتاج يوماً ثانياً.",
    tr: "Fiyat değil: bir işin ikinci günü alıp almayacağını belirler.",
  },
  "pricing.rate.per_km": {
    de: "Preis pro km",
    en: "Price per km",
    ar: "سعر الكيلومتر",
    tr: "Km başına fiyat",
  },
  "pricing.rate.per_km.hint": {
    de: "Für Strecken bis zur Fernumzug-Grenze.",
    en: "For distances up to the long-distance threshold.",
    ar: "للمسافات حتى حد المسافات الطويلة.",
    tr: "Uzun mesafe sınırına kadar olan mesafeler için.",
  },
  "pricing.rate.per_km_long_distance": {
    de: "Preis pro km (Fernumzug)",
    en: "Price per km (long distance)",
    ar: "سعر الكيلومتر (مسافة طويلة)",
    tr: "Km başına fiyat (uzun mesafe)",
  },
  "pricing.rate.per_km_long_distance.hint": {
    de: "Ab der Fernumzug-Grenze, für die ganze Strecke.",
    en: "From the long-distance threshold, for the whole distance.",
    ar: "ابتداءً من حد المسافات الطويلة، لكامل المسافة.",
    tr: "Uzun mesafe sınırından itibaren, tüm mesafe için.",
  },
  "pricing.rate.long_distance_from_km": {
    de: "Fernumzug ab",
    en: "Long distance from",
    ar: "المسافة الطويلة ابتداءً من",
    tr: "Uzun mesafe başlangıcı",
  },
  "pricing.rate.long_distance_from_km.hint": {
    de: "Ab dieser Strecke gilt der Fernumzug-Preis.",
    en: "From this distance on, the long-distance rate applies.",
    ar: "من هذه المسافة يُطبَّق سعر المسافات الطويلة.",
    tr: "Bu mesafeden itibaren uzun mesafe ücreti uygulanır.",
  },
  "pricing.rate.base_rate_moving": {
    de: "Grundpreis Umzug",
    en: "Base rate — moving",
    ar: "السعر الأساسي — النقل",
    tr: "Taban fiyat — taşınma",
  },
  "pricing.rate.base_rate_moving.hint": {
    de: "Fester Anteil jedes Umzugs.",
    en: "The fixed part of every move.",
    ar: "الجزء الثابت من كل عملية نقل.",
    tr: "Her taşınmanın sabit kısmı.",
  },
  "pricing.rate.base_rate_disposal": {
    de: "Grundpreis Entrümpelung",
    en: "Base rate — junk removal",
    ar: "السعر الأساسي — إزالة المخلّفات",
    tr: "Taban fiyat — eşya tahliyesi",
  },
  "pricing.rate.base_rate_disposal.hint": {
    de: "Fester Anteil jeder Entrümpelung.",
    en: "The fixed part of every junk removal.",
    ar: "الجزء الثابت من كل عملية إزالة.",
    tr: "Her tahliyenin sabit kısmı.",
  },
  "pricing.rate.base_rate_cleaning": {
    de: "Grundpreis Reinigung",
    en: "Base rate — cleaning",
    ar: "السعر الأساسي — التنظيف",
    tr: "Taban fiyat — temizlik",
  },
  "pricing.rate.base_rate_cleaning.hint": {
    de: "Fester Anteil jeder Reinigung.",
    en: "The fixed part of every cleaning.",
    ar: "الجزء الثابت من كل عملية تنظيف.",
    tr: "Her temizliğin sabit kısmı.",
  },
  "pricing.rate.per_sqm_moving": {
    de: "Umzug pro m²",
    en: "Moving per m²",
    ar: "النقل لكل م²",
    tr: "Taşınma m² başına",
  },
  "pricing.rate.per_sqm_moving.hint": {
    de: "Wohnfläche × dieser Preis.",
    en: "Living area × this rate.",
    ar: "المساحة × هذا السعر.",
    tr: "Yaşam alanı × bu ücret.",
  },
  "pricing.rate.per_sqm_disposal": {
    de: "Entrümpelung pro m²",
    en: "Junk removal per m²",
    ar: "إزالة المخلّفات لكل م²",
    tr: "Tahliye m² başına",
  },
  "pricing.rate.per_sqm_disposal.hint": {
    de: "Fläche × dieser Preis.",
    en: "Area × this rate.",
    ar: "المساحة × هذا السعر.",
    tr: "Alan × bu ücret.",
  },
  "pricing.rate.per_sqm_cleaning": {
    de: "Reinigung pro m²",
    en: "Cleaning per m²",
    ar: "التنظيف لكل م²",
    tr: "Temizlik m² başına",
  },
  "pricing.rate.per_sqm_cleaning.hint": {
    de: "Zu reinigende Fläche × dieser Preis.",
    en: "Floor area to clean × this rate.",
    ar: "المساحة المراد تنظيفها × هذا السعر.",
    tr: "Temizlenecek alan × bu ücret.",
  },
  "pricing.rate.floor_surcharge_percent": {
    de: "Etagenzuschlag",
    en: "Floor surcharge",
    ar: "رسوم الطوابق",
    tr: "Kat ek ücreti",
  },
  "pricing.rate.floor_surcharge_percent.hint": {
    de: "Je Etage ohne Aufzug, auf Grundpreis und Umfang.",
    en: "Per floor without a lift, on the base rate and scope.",
    ar: "لكل طابق بلا مصعد، على السعر الأساسي والحجم.",
    tr: "Asansörsüz her kat için, taban fiyat ve kapsam üzerinden.",
  },
  "pricing.rate.packing_service": {
    de: "Packservice",
    en: "Packing service",
    ar: "خدمة التغليف",
    tr: "Paketleme hizmeti",
  },
  "pricing.rate.packing_service.hint": {
    de: "Pauschale inklusive Material.",
    en: "Flat rate including materials.",
    ar: "مبلغ ثابت شامل المواد.",
    tr: "Malzeme dahil sabit ücret.",
  },
  "pricing.rate.parking_zone": {
    de: "Halteverbotszone",
    en: "No-parking zone",
    ar: "منطقة منع الوقوف",
    tr: "Park yasağı alanı",
  },
  "pricing.rate.parking_zone.hint": {
    de: "Pauschale für Antrag und Schilder.",
    en: "Flat rate for the permit and signs.",
    ar: "مبلغ ثابت للتصريح واللافتات.",
    tr: "İzin ve tabelalar için sabit ücret.",
  },
  "pricing.rate.transport_insurance_percent": {
    de: "Transportversicherung",
    en: "Transport insurance",
    ar: "تأمين النقل",
    tr: "Taşıma sigortası",
  },
  "pricing.rate.transport_insurance_percent.hint": {
    de: "Anteil von Grundpreis und Umfang.",
    en: "Share of the base rate and scope.",
    ar: "نسبة من السعر الأساسي والحجم.",
    tr: "Taban fiyat ve kapsamın payı.",
  },
  "pricing.rate.crew_of_three_surcharge": {
    de: "Aufpreis 3. Mitarbeiter",
    en: "Third mover",
    ar: "العامل الثالث",
    tr: "Üçüncü taşıyıcı",
  },
  "pricing.rate.crew_of_three_surcharge.hint": {
    de: "Pro Auftrag mit drei Umzugshelfern.",
    en: "Per job with a crew of three.",
    ar: "لكل مهمة بفريق من ثلاثة.",
    tr: "Üç kişilik ekipli her iş için.",
  },
  "pricing.rate.second_van_surcharge": {
    de: "Aufpreis 2. Transporter",
    en: "Second van",
    ar: "الشاحنة الثانية",
    tr: "İkinci kamyonet",
  },
  "pricing.rate.second_van_surcharge.hint": {
    de: "Pro Auftrag mit zweitem Fahrzeug.",
    en: "Per job with a second vehicle.",
    ar: "لكل مهمة بمركبة ثانية.",
    tr: "İkinci araçlı her iş için.",
  },
  "pricing.rate.saturday_surcharge_percent": {
    de: "Samstagszuschlag",
    en: "Saturday surcharge",
    ar: "رسوم يوم السبت",
    tr: "Cumartesi ek ücreti",
  },
  "pricing.rate.saturday_surcharge_percent.hint": {
    de: "Auf die Zwischensumme, wenn der Termin ein Samstag ist.",
    en: "On the subtotal when the date is a Saturday.",
    ar: "على المجموع الفرعي إذا كان الموعد يوم سبت.",
    tr: "Tarih cumartesiye denk gelirse ara toplam üzerinden.",
  },
  "pricing.rate.business_discount_percent": {
    de: "Rabatt Geschäftskunden",
    en: "Business discount",
    ar: "خصم الشركات",
    tr: "Kurumsal indirim",
  },
  "pricing.rate.business_discount_percent.hint": {
    de: "Abzug für Geschäftskunden.",
    en: "Taken off for business customers.",
    ar: "يُخصم للعملاء التجاريين.",
    tr: "Kurumsal müşteriler için düşülür.",
  },
  "pricing.rate.minimum_order_value": {
    de: "Mindestauftragswert",
    en: "Minimum order value",
    ar: "الحد الأدنى للطلب",
    tr: "Minimum sipariş tutarı",
  },
  "pricing.rate.minimum_order_value.hint": {
    de: "Netto; kleinere Aufträge werden darauf angehoben.",
    en: "Net; smaller jobs are raised to it.",
    ar: "صافٍ؛ تُرفع المهام الأصغر إليه.",
    tr: "Net; daha küçük işler bu tutara yükseltilir.",
  },
  "pricing.rate.deposit_percent": {
    de: "Anzahlung",
    en: "Deposit",
    ar: "العربون",
    tr: "Ön ödeme",
  },
  "pricing.rate.deposit_percent.hint": {
    de: "Anteil des Bruttopreises.",
    en: "Share of the gross price.",
    ar: "نسبة من السعر الإجمالي.",
    tr: "Brüt fiyatın payı.",
  },
  "pricing.rate.vat_percent": {
    de: "Mehrwertsteuer",
    en: "VAT",
    ar: "ضريبة القيمة المضافة",
    tr: "KDV",
  },
  "pricing.rate.vat_percent.hint": {
    de: "Gesetzlicher Satz; nur bei Gesetzesänderung anpassen.",
    en: "The statutory rate; change only when the law changes.",
    ar: "النسبة القانونية؛ لا تُغيَّر إلا بتغيّر القانون.",
    tr: "Yasal oran; yalnızca yasa değişirse değiştirin.",
  },
  "pricing.rate.hours_base": {
    de: "Grundstunden je Auftrag",
    en: "Base hours per job",
    ar: "الساعات الأساسية لكل مهمة",
    tr: "İş başına temel saat",
  },
  "pricing.rate.hours_base.hint": {
    de: "Start der Zeitschätzung.",
    en: "Where the duration estimate starts.",
    ar: "بداية تقدير المدة.",
    tr: "Süre tahmininin başlangıcı.",
  },
  "pricing.rate.hours_per_sqm": {
    de: "Stunden pro m²",
    en: "Hours per m²",
    ar: "الساعات لكل م²",
    tr: "m² başına saat",
  },
  "pricing.rate.hours_per_sqm.hint": {
    de: "Zusätzliche Zeit je m² Wohnfläche.",
    en: "Extra time per m² of living area.",
    ar: "وقت إضافي لكل م² من المساحة.",
    tr: "Yaşam alanının m² başına ek süre.",
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;
