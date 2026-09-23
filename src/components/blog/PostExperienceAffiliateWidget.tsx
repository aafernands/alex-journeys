import { Compass } from "lucide-react";
import { ViatorWidgets } from "@/components/blog/ViatorWidgets";
import { sanitizeCmsHtml } from "@/lib/cms/sanitize-html";

type Props = {
  html: string;
  placeLabel: string;
};

export function PostExperienceAffiliateWidget({ html, placeLabel }: Props) {
  const safe = sanitizeCmsHtml(html);
  if (!safe.trim()) return null;

  return (
    <section className="p-5 sm:p-6" aria-labelledby="post-experience-widget-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Experiences
          </p>
          <h3
            id="post-experience-widget-title"
            className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl"
          >
            Things to do in {placeLabel}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Tours and activities selected for this story.
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
          <Compass className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div
        className="mt-5 overflow-hidden rounded-xl border border-border bg-white p-2 sm:p-3"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
      <ViatorWidgets html={safe} />

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Affiliate experience widget. If you book through it, Fernandes Journeys may earn
        a commission at no extra cost to you.
      </p>
    </section>
  );
}
