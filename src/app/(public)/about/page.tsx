import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRightIcon } from "lucide-react";
import portraitDark from "@/assets/hasibur-rahman-dark.jpg";
import portraitLight from "@/assets/hasibur-rahman-light.jpg";
import { EmptyNotice } from "@/components/portfolio/empty-notice";
import { Prose } from "@/components/portfolio/prose";
import { Badge } from "@/components/ui/badge";
import {
  countPublishedProjects,
  getSiteOwner,
  listPublishedTechnologies,
} from "@/lib/queries/portfolio";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds this work, where, and with what.",
};

export default async function AboutPage() {
  const [owner, technologies, total] = await Promise.all([
    getSiteOwner(),
    listPublishedTechnologies(),
    countPublishedProjects(),
  ]);

  const profile = owner?.profile;
  const portraitAlt = owner?.name ? `Portrait of ${owner.name}` : "Portrait of the site owner";
  const links: { label: string; href: string }[] = [];
  if (profile?.website) links.push({ label: "Website", href: profile.website });
  if (profile?.githubUrl) links.push({ label: "GitHub", href: profile.githubUrl });
  if (profile?.linkedinUrl) links.push({ label: "LinkedIn", href: profile.linkedinUrl });
  if (profile?.twitterUrl) links.push({ label: "Twitter", href: profile.twitterUrl });

  return (
    <div className="shell grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
      <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
        <figure className="relative w-full max-w-[20rem]">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-2xl bg-gradient-to-br from-navy-100 via-navy-200 to-navy-300 dark:from-navy-700 dark:via-navy-800 dark:to-navy-950"
          />
          <div className="relative overflow-hidden rounded-2xl bg-[#f1f1f1] shadow-elevated ring-1 ring-foreground/8 dark:bg-navy-950">
            <Image
              alt={portraitAlt}
              className="aspect-square w-full object-cover dark:hidden"
              fetchPriority="high"
              loading="eager"
              placeholder="blur"
              sizes="320px"
              src={portraitLight}
            />
            <Image
              alt={portraitAlt}
              className="hidden aspect-square w-full object-cover dark:block"
              fetchPriority="high"
              loading="eager"
              placeholder="blur"
              sizes="320px"
              src={portraitDark}
            />
          </div>
        </figure>

        <header className="flex flex-col gap-3">
          <span className="eyebrow">About</span>
          <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
            {owner?.name ?? "About"}
          </h1>
          {profile?.location ? (
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              {profile.location}
            </p>
          ) : null}
        </header>

        <dl className="grid grid-cols-2 gap-6 border-t border-border/70 pt-6">
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Projects</dt>
            <dd className="text-2xl font-semibold tabular-nums tracking-tight">
              {String(total).padStart(2, "0")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Tools</dt>
            <dd className="text-2xl font-semibold tabular-nums tracking-tight">
              {String(technologies.length).padStart(2, "0")}
            </dd>
          </div>
        </dl>

        {links.length > 0 ? (
          <nav aria-label="Elsewhere" className="flex flex-col gap-1 border-t border-border/70 pt-6">
            {links.map(({ label, href }) => (
              <a
                className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                href={href}
                key={label}
                rel="noreferrer noopener"
                target="_blank"
              >
                {label}
                <ArrowUpRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ))}
          </nav>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-12">
        {profile?.bio ? (
          <Prose content={profile.bio} />
        ) : (
          <EmptyNotice
            body="This is read from the account profile, so it stays blank until it is written in the dashboard rather than filled with invented copy."
            title="No bio yet"
          />
        )}

        {technologies.length > 0 ? (
          <section className="flex flex-col gap-5 border-t border-border/70 pt-10">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Working with</h2>
            <ul className="flex flex-wrap gap-2">
              {technologies.map((technology) => (
                <li key={technology}>
                  <Badge className="h-7 px-3" variant="outline">
                    {technology}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
