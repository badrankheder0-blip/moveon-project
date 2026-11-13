import type { schema } from "@mon/db";

/**
 * The four services the booking planner is built around, and what they say
 * before anyone has edited them.
 *
 * Their rows are created lazily — on the first read of the catalogue — rather
 * than by a seed, so a database that predates the services table still gets
 * them, and an edit from the dashboard is never overwritten by a re-seed.
 */

type Localized = schema.Localized;

export const BUILTIN_SERVICES = ["moving", "renovation", "cleaning", "disposal"] as const;
export type BuiltinService = (typeof BUILTIN_SERVICES)[number];

export function isBuiltinService(key: string): key is BuiltinService {
  return (BUILTIN_SERVICES as readonly string[]).includes(key);
}

/** The card photo a built-in service shows until the office picks another. */
export function defaultServiceImage(key: string): string | null {
  return isBuiltinService(key) ? `/images/mon/art/service-${key}.webp` : null;
}

/** The icons the dashboard offers for a service (the admin prototype's set). */
export const SERVICE_ICONS = ["box", "truck", "tool", "sparkle", "roller", "trash", "leaf", "key"] as const;

/** The custom-question types a booking step or a custom service can ask. */
export const QUESTION_TYPES = ["text", "number", "select", "yesno", "counter", "address", "photos", "area"] as const;

export interface BuiltinDefaults {
  name: Localized;
  description: Localized;
  tagline: Localized;
  icon: (typeof SERVICE_ICONS)[number];
  sortOrder: number;
}

export const BUILTIN_DEFAULTS: Record<BuiltinService, BuiltinDefaults> = {
  moving: {
    name: { de: "Umzug", en: "Moving", tr: "Taşınma", ar: "نقل الأثاث" },
    description: {
      de: "Verpacken, Transport und Aufbau deiner Sachen – von Tür zu Tür.",
      en: "Packing, transport and setup of your belongings, door to door.",
      tr: "Eşyalarınızın paketlenmesi, taşınması ve kurulumu – kapıdan kapıya.",
      ar: "تغليف ونقل وترتيب أغراضك من الباب إلى الباب.",
    },
    tagline: { de: "Privat- & Firmenumzüge", en: "Private & business moves", tr: "Bireysel ve kurumsal taşınma", ar: "نقل للأفراد والشركات" },
    icon: "truck",
    sortOrder: 1,
  },
  renovation: {
    name: { de: "Renovierung", en: "Renovation", tr: "Tadilat", ar: "الترميم" },
    description: {
      de: "Malerarbeiten, Parkett und Böden, Löcher füllen und Wände ausbessern.",
      en: "Painting, parquet and flooring, filling holes and wall repairs.",
      tr: "Boya, parke ve zemin, delik doldurma ve duvar onarımı.",
      ar: "دهان، باركيه وأرضيات، وتصليح الجدران.",
    },
    tagline: { de: "Reparaturen & Verschönerungen", en: "Repairs & upgrades", tr: "Onarım ve yenileme", ar: "إصلاحات وتحسينات" },
    icon: "roller",
    sortOrder: 2,
  },
  cleaning: {
    name: { de: "Reinigung", en: "Cleaning", tr: "Temizlik", ar: "التنظيف" },
    description: {
      de: "Reinigung von Wohnung, Büro und Fenstern – auch die Endreinigung beim Auszug.",
      en: "Home, office and window cleaning, including end-of-tenancy cleaning.",
      tr: "Ev, ofis ve cam temizliği; taşınma sonrası temizlik dahil.",
      ar: "تنظيف البيوت والمكاتب والشبابيك، ومنه تنظيف نهاية الإيجار.",
    },
    tagline: { de: "Wohnungen & Büros", en: "Homes & offices", tr: "Evler ve ofisler", ar: "منازل ومكاتب" },
    icon: "sparkle",
    sortOrder: 3,
  },
  disposal: {
    name: { de: "Entrümpelung", en: "Junk Removal", tr: "Eşya tasfiyesi", ar: "إزالة الأغراض القديمة" },
    description: {
      de: "Abholung und umweltgerechte Entsorgung alter Möbel und Geräte.",
      en: "Collection and eco-friendly disposal of old furniture and appliances.",
      tr: "Eski mobilya ve cihazların toplanması ve çevre dostu bertarafı.",
      ar: "جمع الأثاث والأجهزة القديمة والتخلص منها بطريقة صديقة للبيئة.",
    },
    tagline: { de: "Ausmisten & entsorgen", en: "Declutter & dispose", tr: "Ayıklama ve atma", ar: "التخلص من الأغراض الزائدة" },
    icon: "trash",
    sortOrder: 4,
  },
};
