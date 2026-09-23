import Link from "next/link";
import { BedDouble, Compass, Plane } from "lucide-react";
import { experiencesPath } from "@/lib/experiences";
import { flightsPath } from "@/lib/flights";
import { staysPath } from "@/lib/stays";
import type { PostBookingTool } from "@/lib/post-types";

type Props = {
  tools: PostBookingTool[];
  destination: string;
};

const TOOL_COPY: Record<
  PostBookingTool,
  { title: string; body: string; cta: string; icon: typeof Plane }
> = {
  flight: {
    title: "Flights",
    body: "Compare flight options with the destination already filled in.",
    cta: "Search flights",
    icon: Plane,
  },
  hotel: {
    title: "Stays",
    body: "Search hotels and live room rates for this destination.",
    cta: "Find a stay",
    icon: BedDouble,
  },
  experience: {
    title: "Experiences",
    body: "Browse tours and things to do without typing the destination again.",
    cta: "Explore experiences",
    icon: Compass,
  },
};

function toolHref(tool: PostBookingTool, destination: string): string {
  if (tool === "flight") {
    return flightsPath({ destination });
  }
  if (tool === "hotel") {
    return staysPath({ destination });
  }
  return experiencesPath({ destination });
}

export function PostBookingBox({ tools, destination }: Props) {
  if (tools.length === 0 || !destination.trim()) return null;

  return (
    <aside
      className="mt-12 overflow-hidden rounded-xl border border-border bg-surface-soft"
      aria-label={`Book travel for ${destination}`}
    >
      <div className="border-b border-border bg-white px-5 py-5 sm:px-6">
        <p className="eyebrow">Plan this trip</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-heading">
          Going to {destination}?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          I’ve already filled in the destination. Choose what you want to book,
          then add your dates and traveler details.
        </p>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-3">
        {tools.map((tool) => {
          const copy = TOOL_COPY[tool];
          const Icon = copy.icon;
          return (
            <div key={tool} className="flex flex-col bg-white p-5 sm:p-6">
              <div className="grid size-10 place-items-center rounded-full bg-surface text-heading">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-heading">
                {copy.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {copy.body}
              </p>
              <Link
                href={toolHref(tool, destination)}
                className="btn btn-secondary mt-5 justify-center"
              >
                {copy.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
