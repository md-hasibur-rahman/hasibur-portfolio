import type { Metadata } from "next";
import { LockIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a message about work, a question, or an introduction.",
};

const notes = [
  {
    icon: MailIcon,
    title: "It reaches a private inbox",
    body: "Messages land in the owner inbox on this site with your email attached, so a reply can find you.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Nothing is published",
    body: "The form writes to the database only. It never renders on a public page and never feeds a mailing list.",
  },
  {
    icon: LockIcon,
    title: "Rate limited, not tracked",
    body: "A short window stops spam from one address. No analytics, no third-party scripts on this page.",
  },
];

export default function ContactPage() {
  return (
    <div className="shell grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <span className="eyebrow">Contact</span>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] sm:text-5xl">
            Tell me what you are building
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            Work, a question about something here, or an introduction — all fine. The more concrete
            the details, the more useful the reply.
          </p>
        </header>

        <ul className="flex flex-col gap-6">
          {notes.map((note) => (
            <li className="flex gap-4" key={note.title}>
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground ring-1 ring-foreground/6"
              >
                <note.icon className="size-4" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium tracking-tight">{note.title}</p>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {note.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface p-6 sm:p-7">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
