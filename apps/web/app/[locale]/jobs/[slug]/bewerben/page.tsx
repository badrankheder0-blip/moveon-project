import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { fetchJob, jobsText } from "@/lib/site/jobs";
import { JobApplicationForm } from "@/app/components/mon/blocks/JobApplicationForm";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { siteHref } from "@/app/components/mon/links";

/** The application for one posting: its title on top, then the form. */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const job = await fetchJob(params.slug);
  return job ? { title: `${jobsText(params.locale).applyEyebrow}: ${job.title}`, robots: { index: false } } : {};
}

export default async function JobApplyPage({ params }: { params: { locale: Locale; slug: string } }) {
  const job = await fetchJob(params.slug);
  if (!job) notFound();

  const t = jobsText(params.locale);
  const href = (path: string) => siteHref(params.locale, path);

  return (
    <>
      <PageHero
        crumbs={[
          { label: t.home, href: href("/") },
          { label: t.jobs, href: href("/jobs") },
          { label: job.title, href: href(`/jobs/${job.slug}`) },
          { label: t.applyEyebrow.charAt(0) + t.applyEyebrow.slice(1).toLocaleLowerCase(params.locale), href: href(`/jobs/${job.slug}/bewerben`) },
        ]}
        eyebrow={t.applyEyebrow}
        title={job.title}
        sub={t.applySub}
      />
      <JobApplicationForm
        slug={job.slug}
        locale={params.locale}
        text={t}
        privacyHref={href("/datenschutz")}
        jobsHref={href("/jobs")}
      />
    </>
  );
}
