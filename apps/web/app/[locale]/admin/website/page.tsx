import { redirect } from "next/navigation";

/**
 * The old site editor, which wrote every change live. Content editing
 * (`/admin/inhalte`) and Settings replaced it, with changes waiting for
 * Save & publish, so an old bookmark lands there instead.
 */
export default function WebsitePage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/admin/inhalte`);
}