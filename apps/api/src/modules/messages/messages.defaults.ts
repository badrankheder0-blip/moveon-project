import type { Localized } from "@mon/db/schema";

/**
 * The six automatic customer messages, as the admin prototype ships them:
 * when each goes out, the channels it starts with and its words in the four
 * site languages. Written to `message_templates` the first time the screen is
 * opened; from then on the office's edits are what is sent.
 */

export const TEMPLATE_KEYS = [
  "booking_confirmed",
  "reminder",
  "crew_on_way",
  "invoice_sent",
  "payment_reminder",
  "review_request",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const CHANNELS = ["email", "sms", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

/** The variables a template may use, in the order the editor offers them. */
export const VARIABLES = ["name", "ref", "service", "date", "time", "total", "invoice", "due", "link"] as const;

export interface TemplateDefault {
  isEnabled: boolean;
  channels: Channel[];
  subject: Required<Localized>;
  body: Required<Localized>;
}

export const TEMPLATE_DEFAULTS: Record<TemplateKey, TemplateDefault> = {
  booking_confirmed: {
    isEnabled: true,
    channels: ["email", "whatsapp"],
    subject: {
      de: "Ihre Buchung {ref} ist bestätigt",
      en: "Your booking {ref} is confirmed",
      tr: "{ref} numaralı rezervasyonunuz onaylandı",
      ar: "تم تأكيد حجزك {ref}",
    },
    body: {
      de: "Hallo {name},\n\nvielen Dank! Ihre Buchung {ref} ist bestätigt.\n{service} am {date}, {time}.\nGesamtpreis: {total}.\n\nAlle Details finden Sie in Ihrem Konto: {link}\n\nIhr m.on Team",
      en: "Hello {name},\n\nthank you! Your booking {ref} is confirmed.\n{service} on {date}, {time}.\nTotal: {total}.\n\nYou'll find every detail in your account: {link}\n\nYour m.on team",
      tr: "Merhaba {name},\n\nteşekkür ederiz! {ref} numaralı rezervasyonunuz onaylandı.\n{service}: {date}, {time}.\nToplam tutar: {total}.\n\nTüm ayrıntıları hesabınızda bulabilirsiniz: {link}\n\nm.on ekibiniz",
      ar: "مرحباً {name}،\n\nشكراً لك! تم تأكيد حجزك {ref}.\n{service} يوم {date}، {time}.\nالمبلغ الإجمالي: {total}.\n\nتجد كل التفاصيل في حسابك: {link}\n\nفريق m.on",
    },
  },
  reminder: {
    isEnabled: true,
    channels: ["sms", "whatsapp"],
    subject: {
      de: "Morgen ist es so weit",
      en: "See you tomorrow",
      tr: "Yarın görüşüyoruz",
      ar: "نراك غداً",
    },
    body: {
      de: "Hallo {name}, morgen kommen wir zu Ihnen: {service}, {time}. Bitte halten Sie den Eingang frei. Fragen? Antworten Sie einfach auf diese Nachricht.",
      en: "Hello {name}, we'll see you tomorrow: {service}, {time}. Please keep the entrance clear. Questions? Just reply to this message.",
      tr: "Merhaba {name}, yarın yanınızdayız: {service}, {time}. Lütfen girişi boş tutun. Sorunuz mu var? Bu mesajı yanıtlamanız yeterli.",
      ar: "مرحباً {name}، نأتيك غداً: {service}، {time}. يرجى إبقاء المدخل فارغاً. عندك سؤال؟ رد على هذه الرسالة مباشرة.",
    },
  },
  crew_on_way: {
    isEnabled: true,
    channels: ["sms", "whatsapp"],
    subject: {
      de: "Wir sind unterwegs",
      en: "We're on our way",
      tr: "Yoldayız",
      ar: "نحن في الطريق",
    },
    body: {
      de: "Hallo {name}, Ihr m.on Team ist jetzt unterwegs zu Ihnen. Ihre Buchung: {link}",
      en: "Hello {name}, your m.on crew is on the way now. Your booking: {link}",
      tr: "Merhaba {name}, m.on ekibiniz şu anda yola çıktı. Rezervasyonunuz: {link}",
      ar: "مرحباً {name}، فريق m.on في الطريق إليك الآن. حجزك: {link}",
    },
  },
  invoice_sent: {
    isEnabled: true,
    channels: ["email"],
    subject: {
      de: "Ihre Rechnung {invoice}",
      en: "Your invoice {invoice}",
      tr: "Faturanız {invoice}",
      ar: "فاتورتك {invoice}",
    },
    body: {
      de: "Hallo {name},\n\nanbei erhalten Sie Ihre Rechnung {invoice} über {total}, zahlbar bis {due}. Sie finden sie auch in Ihrem Konto: {link}\n\nVielen Dank für Ihr Vertrauen!\nIhr m.on Team",
      en: "Hello {name},\n\nhere is your invoice {invoice} for {total}, due on {due}. You'll also find it in your account: {link}\n\nThank you for choosing us!\nYour m.on team",
      tr: "Merhaba {name},\n\n{total} tutarındaki {invoice} numaralı faturanız ektedir, son ödeme tarihi {due}. Faturayı hesabınızda da bulabilirsiniz: {link}\n\nBizi tercih ettiğiniz için teşekkürler!\nm.on ekibiniz",
      ar: "مرحباً {name}،\n\nإليك فاتورتك {invoice} بمبلغ {total}، تستحق الدفع في {due}. تجدها أيضاً في حسابك: {link}\n\nشكراً لثقتك بنا!\nفريق m.on",
    },
  },
  payment_reminder: {
    isEnabled: false,
    channels: ["email"],
    subject: {
      de: "Zahlungserinnerung {invoice}",
      en: "Payment reminder {invoice}",
      tr: "Ödeme hatırlatması {invoice}",
      ar: "تذكير بالدفع {invoice}",
    },
    body: {
      de: "Hallo {name},\n\nzu unserer Rechnung {invoice} über {total} (fällig am {due}) haben wir noch keinen Zahlungseingang gesehen. Bitte überweisen Sie den Betrag in den nächsten Tagen. Falls Sie bereits gezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\nIhr m.on Team",
      en: "Hello {name},\n\nwe haven't received payment for invoice {invoice} of {total} (due {due}) yet. Please transfer the amount in the next few days. If you have already paid, please ignore this message.\n\nYour m.on team",
      tr: "Merhaba {name},\n\n{total} tutarındaki {invoice} numaralı faturanız (son ödeme tarihi {due}) için henüz ödeme almadık. Lütfen tutarı önümüzdeki birkaç gün içinde havale edin. Ödemeyi zaten yaptıysanız bu mesajı dikkate almayın.\n\nm.on ekibiniz",
      ar: "مرحباً {name}،\n\nلم يصلنا بعد دفع الفاتورة {invoice} بمبلغ {total} (المستحقة في {due}). يرجى تحويل المبلغ خلال الأيام القادمة. إذا كنت قد دفعت بالفعل، فتجاهل هذه الرسالة.\n\nفريق m.on",
    },
  },
  review_request: {
    isEnabled: true,
    channels: ["email", "whatsapp"],
    subject: {
      de: "Wie war Ihr Termin mit m.on?",
      en: "How did we do?",
      tr: "m.on ile randevunuz nasıldı?",
      ar: "كيف كانت تجربتك مع m.on؟",
    },
    body: {
      de: "Hallo {name},\n\ndanke, dass Sie uns gewählt haben! Wie zufrieden waren Sie? Ihre Bewertung hilft uns sehr: {link}\n\nIhr m.on Team",
      en: "Hello {name},\n\nthank you for choosing us! How did we do? Your review helps us a lot: {link}\n\nYour m.on team",
      tr: "Merhaba {name},\n\nbizi tercih ettiğiniz için teşekkürler! Ne kadar memnun kaldınız? Değerlendirmeniz bize çok yardımcı olur: {link}\n\nm.on ekibiniz",
      ar: "مرحباً {name}،\n\nشكراً لاختيارك لنا! ما مدى رضاك عن الخدمة؟ تقييمك يساعدنا كثيراً: {link}\n\nفريق m.on",
    },
  },
};
