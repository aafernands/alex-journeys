import Link from "next/link";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { QuickAnswers as QuickAnswersData } from "@/lib/quick-answers";

/** Fold-out answers above the contact form (same look as the Premium FAQ). */
export function QuickAnswers({ data }: { data: QuickAnswersData }) {
  if (data.items.length === 0) return null;
  return (
    <section className="hub-follow" aria-labelledby="quick-answers">
      <h2 id="quick-answers" className="font-display text-lg font-bold text-heading">
        {data.title}
      </h2>
      <div className="mt-4 space-y-3">
        {data.items.map((item) => (
          <details key={item.question} className="group rounded-xl border border-border bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold leading-snug text-heading [&::-webkit-details-marker]:hidden">
              <CircleHelp size={18} className="shrink-0 text-accent" aria-hidden="true" />
              <span className="flex-1 text-[0.9375rem]">{item.question}</span>
              <ChevronDown
                size={18}
                className="shrink-0 text-muted transition group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="px-4 pb-4 pl-11">
              <p className="text-sm leading-relaxed text-text">{item.answer}</p>
              {item.link ? (
                <Link
                  href={item.link.href}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent transition hover:text-accent-deep"
                >
                  {item.link.label} →
                </Link>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
