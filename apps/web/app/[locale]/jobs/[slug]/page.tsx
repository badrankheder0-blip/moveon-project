import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { fetchJob, jobsText } from "@/lib/site/jobs";
import { loadPage } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { siteHref } from "@/app/components/mon/links";
import { Arrow } from "@/app/components/mon/Icons";

/**
 * One job posting: its title, place and hours, then the sections the office
 * wrote for it in the dashboard (about the role, tasks, profile, what we
 * offer — an empty one is left out) with the facts and "Apply now" beside
 * them. The hero photo is the Jobs page's.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const job = await fetchJob(params.slug);
  return job ? { title: job.title, description: job.summary || null } : {};
}

export default async function JobPage({ params }: { params: { locale: Locale; slug: string } }) {
  const [job, page] = await Promise.all([fetchJob(params.slug), loadPage(params.locale, "page-jobs")]);
  if (!job) notFound();

  const t = jobsText(params.locale);
  const href = (path: string) => siteHref(params.locale, path);
  const applyHref = href(`/jobs/${job.slug}/bewerben`);
  const type = t[job.employmentType];

  const sections = [
    { title: t.description, html: job.description },
    { title: t.tasks, html: job.tasks },
    { title: t.requirements, html: job.requirements },
    { title: t.offer, html: job.offer },
  ].filter((section) => section.html.trim());

  return (
    <>
      <PageHero
        crumbs={[
          { label: t.home, href: href("/") },
          { label: t.jobs, href: href("/jobs") },
          { label: job.title, href: href(`/jobs/${job.slug}`) },
        ]}
        eyebrow={[type, job.location].filter(Boolean).join(" · ").toLocaleUpperCase(params.locale)}
        title={job.title}
        sub={job.summary}
        img={page.img("hero.img")}
        btn={{ label: t.applyNow, href: applyHref }}
        btn2={{ label: t.allJobs, href: href("/jobs#roles") }}
      />

      <section style={{ position: "relative" }}>
        <div className="mp-sec mp-job">
          <div className="mp-job-body">
            {sections.map((section) => (
              <div key={section.title} className="mp-job-part" data-rv="1">
                <h2>{section.title}</h2>
                {/* Sanitised by the API when the posting was saved. */}
                <div className="mp-rich" dir="auto" dangerouslySetInnerHTML={{ __html: section.html }} />
              </div>
            ))}
          </div>

          <aside className="mp-job-aside" data-rv="2">
            <dl>
              {job.location ? (
                <div>
                  <dt>{t.location}</dt>
                  <dd>{job.location}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t.type}</dt>
                <dd>{type}</dd>
              </div>
            </dl>
            <b>{t.asideTitle}</b>
            <p>{t.asideText}</p>
            <Link href={applyHref} className="mp-btn">
              {t.applyNow}
              <Arrow size={15} />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
