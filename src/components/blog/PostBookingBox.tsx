import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  BaggageClaim,
  Building2,
  ChevronRight,
  Compass,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { experiencesPath } from "@/lib/experiences";
import { flightsPath } from "@/lib/flights";
import { staysPath } from "@/lib/stays";
import type { PostBookingTool } from "@/lib/post-types";
import { PostHotelSuggestion } from "@/components/blog/PostHotelSuggestion";
import { PostExperienceAffiliateWidget } from "@/components/blog/PostExperienceAffiliateWidget";
import { PostFlightSuggestions } from "@/components/blog/PostFlightSuggestions";

type Props = {
  tools: PostBookingTool[];
  destination: string;
  placeLabel: string;
  countryName: string;
  image?: string;
  imageAlt?: string;
  experienceWidgetHtml?: string;
};

const TOOL_META = {
  flight: {
    eyebrow: "Flights",
    title: "Fly to",
    body: "Compare routes with your destination already filled in.",
    cta: "Search flights",
    icon: Plane,
    details: [
      { icon: Plane, label: "Airlines, stops & schedules" },
      { icon: BaggageClaim, label: "Cabin and baggage details" },
      { icon: ShieldCheck, label: "Fare conditions before booking" },
    ],
  },
  hotel: {
    eyebrow: "Stays",
    title: "Stay in",
    body: "Browse hotels with richer property details before choosing a room.",
    cta: "Explore hotels",
    icon: BedDouble,
    details: [
      { icon: Building2, label: "Photos, amenities & property details" },
      { icon: Star, label: "Guest ratings and review themes" },
      { icon: MapPin, label: "Neighborhood, address & location" },
    ],
  },
  experience: {
    eyebrow: "Experiences",
    title: "Do more in",
    body: "Browse tours and activities for the destination in this story.",
    cta: "See experiences",
    icon: Compass,
    details: [
      { icon: Sparkles, label: "Tours, attractions & activities" },
      { icon: MapPin, label: "Destination already selected" },
      { icon: UtensilsCrossed, label: "Local experiences worth exploring" },
    ],
  },
} satisfies Record<
  PostBookingTool,
  {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    icon: typeof Plane;
    details: Array<{ icon: typeof Plane; label: string }>;
  }
>;

function toolHref(tool: PostBookingTool, destination: string): string {
  if (tool === "flight") return flightsPath({ destination });
  if (tool === "hotel") return staysPath({ destination });
  return experiencesPath({ destination });
}

export function PostBookingBox({
  tools,
  destination,
  placeLabel,
  image,
  imageAlt,
  experienceWidgetHtml = "",
}: Props) {
  if (tools.length === 0 || !destination.trim()) return null;
  const experienceWidgetOnly =
    tools.length === 1 &&
    tools[0] === "experience" &&
    Boolean(experienceWidgetHtml.trim());

  return (
    <aside
      className={`mt-12 overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(20,17,13,0.07)] ${experienceWidgetOnly ? "" : "border border-border"}`}
      aria-label={`Book travel for ${destination}`}
    >
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <div className="relative min-h-64 overflow-hidden bg-surface md:min-h-full">
          {image ? (
            <Image
              src={image}
              alt={imageAlt || placeLabel}
              fill
              sizes="(max-width: 768px) 100vw, 36vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">
              Continue planning
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight">
              Plan your {placeLabel} trip
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
              This story already knows where you&apos;re going. Start with the part of
              the trip you want to book next.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {tools.map((tool) => {
            if (tool === "hotel") {
              return (
                <PostHotelSuggestion
                  key={tool}
                  destination={destination}
                  placeLabel={placeLabel}
                />
              );
            }

            if (tool === "experience" && experienceWidgetHtml.trim()) {
              return (
                <PostExperienceAffiliateWidget
                  key={tool}
                  html={experienceWidgetHtml}
                  placeLabel={placeLabel}
                />
              );
            }

            if (tool === "flight") {
              return (
                <PostFlightSuggestions
                  key={tool}
                  destination={destination}
                  placeLabel={placeLabel}
                />
              );
            }

            const meta = TOOL_META[tool];
            const Icon = meta.icon;
            const toolPlace = placeLabel;
            return (
              <section key={tool} className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      {meta.eyebrow}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl">
                      {meta.title} {toolPlace}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{meta.body}</p>

                    <ul className="mt-4 grid gap-2 text-sm text-text sm:grid-cols-2">
                      {meta.details.map((detail) => {
                        const DetailIcon = detail.icon;
                        return (
                          <li key={detail.label} className="flex items-start gap-2.5">
                            <DetailIcon className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden="true" />
                            <span>{detail.label}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <Link
                      href={toolHref(tool, destination)}
                      className="mt-5 inline-flex items-center gap-1.5 font-semibold text-link transition hover:text-accent"
                    >
                      {meta.cta}
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border bg-surface-soft px-5 py-3 text-xs leading-relaxed text-muted sm:px-6">
        Destination is prefilled from this article. Dates, travelers, rooms, and other booking details are added on the next screen.
      </div>
    </aside>
  );
}
