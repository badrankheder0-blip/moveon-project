"use client";

import { useMemo } from "react";

import { HOME_SUB, type AdminSubPage } from "@/app/components/admin/AdminShell";
import { ADMIN_PATHS } from "@/lib/admin/nav";
import { defineText, useText } from "@/lib/admin/text";
import { useI18n } from "@/lib/i18n/provider";

import { useContent } from "./cms";
import { PAGE_ORDER, pageName } from "./ui";

const TEXT = defineText({
  home: { de: "Startseite", en: "Homepage", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
});

/**
 * The sidebar's list under Content editing, as the admin prototype draws it:
 * the Homepage editor, then every page of the website, each with a yellow dot
 * while it has changes waiting for Save & publish.
 *
 * `current` is the page being edited (a section key), or HOME_SUB on the
 * Homepage editor, or null on the index.
 */
export function usePageSubnav(current: string | null): AdminSubPage[] {
  const c = useContent();
  const { locale } = useI18n();
  const tx = useText(TEXT);

  return useMemo(() => {
    const sections = [...c.sections].sort((a, b) => {
      const ia = PAGE_ORDER.indexOf(a);
      const ib = PAGE_ORDER.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
    });

    return [
      {
        key: HOME_SUB,
        label: tx("home"),
        href: `/${locale}${ADMIN_PATHS.home}`,
        current: current === HOME_SUB,
        edited: c.draftRefs("home").length + c.draftRefs("chrome").length > 0,
      },
      ...sections.map((section) => ({
        key: section,
        label: pageName(section, locale),
        href: `/${locale}${ADMIN_PATHS.pages}?page=${encodeURIComponent(section)}`,
        current: current === section,
        edited: c.draftRefs(section).length > 0,
      })),
    ];
  }, [c, current, locale, tx]);
}
