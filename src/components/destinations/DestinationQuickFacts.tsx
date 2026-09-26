import {
  Banknote,
  CalendarDays,
  Clock,
  Droplets,
  ExternalLink,
  Languages,
  Plug,
} from "lucide-react";
import Link from "next/link";
import { CurrencyQuickFact } from "@/components/destinations/CurrencyQuickFact";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import type { DestinationQuickFacts as QuickFactsData } from "@/data/destinations";

type Props = {
  quickFacts?: QuickFactsData;
  /** Fallback when quickFacts.bestTime is empty. */
  climateBestTime?: string;
};

type FactChip = {
  key: string;
  label: string;
  value: string;
  Icon: typeof Banknote;
};

export function DestinationQuickFacts({
  quickFacts,
  climateBestTime,
}: Props) {
  const bestTime =
    quickFacts?.bestTime?.trim() || climateBestTime?.trim() || "";

  const chips: FactChip[] = [];
  if (quickFacts?.currency?.trim()) {
    chips.push({
      key: "currency",
      label: "Currency",
      value: quickFacts.currency.trim(),
      Icon: Banknote,
    });
  }
  if (quickFacts?.language?.trim()) {
    chips.push({
      key: "language",
      label: "Language",
      value: quickFacts.language.trim(),
      Icon: Languages,
    });
  }
  if (quickFacts?.plugs?.trim()) {
    chips.push({
      key: "plugs",
      label: "Power plugs",
      value: quickFacts.plugs.trim(),
      Icon: Plug,
    });
  }
  if (quickFacts?.tapWater?.trim()) {
    chips.push({
      key: "tapWater",
      label: "Tap water",
      value: quickFacts.tapWater.trim(),
      Icon: Droplets,
    });
  }
  if (quickFacts?.timezone?.trim()) {
    chips.push({
      key: "timezone",
      label: "Time zone",
      value: quickFacts.timezone.trim(),
      Icon: Clock,
    });
  }

  if (!bestTime && chips.length === 0) return null;

  return (
    <section
      className="mt-8 md:mt-12"
      aria-labelledby="destination-quick-facts-heading"
    >
      <div className="panel-soft p-4 shadow-sm">
        <p className="eyebrow">Know before you go</p>
        <h2
          id="destination-quick-facts-heading"
          className="font-display mt-1 text-lg font-semibold text-heading sm:text-xl"
        >
          Best time &amp; quick facts
        </h2>

        {bestTime ? (
          <p className="mt-4 flex gap-3 text-[0.95rem] leading-relaxed text-text sm:text-base">
            <CalendarDays
              className="mt-0.5 h-5 w-5 shrink-0 text-accent"
              strokeWidth={1.75}
              aria-hidden
            />
            <span>
              <span className="font-semibold text-heading">Best time:</span>{" "}
              {bestTime}
            </span>
          </p>
        ) : null}

        {chips.length > 0 ? (
          <ul
            className={`grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap ${
              bestTime ? "mt-5" : "mt-4"
            }`}
          >
            {chips.map(({ key, label, value, Icon }) => (
              <li
                key={key}
                className="panel-nested flex min-w-0 items-start gap-2.5 bg-white px-3 py-2.5 sm:min-w-[10.5rem] sm:flex-1 sm:basis-[calc(33.333%-0.5rem)] sm:max-w-[14rem]"
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </span>
                  {key === "currency" ? (
                    <CurrencyQuickFact currencyLabel={value} />
                  ) : key === "language" ? (
                    <OutboundLink
                      href="http://babbel.sjv.io/YRjqnr"
                      affiliate
                      className="mt-0.5 inline-flex items-start gap-1.5 text-sm leading-snug text-heading underline decoration-border-strong underline-offset-4 transition hover:text-accent"
                    >
                      <span>{value}</span>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    </OutboundLink>
                  ) : key === "plugs" ? (
                    <Link
                      href="/travel-tech-essentials"
                      className="mt-0.5 inline-flex text-sm leading-snug text-heading underline decoration-border-strong underline-offset-4 transition hover:text-accent"
                    >
                      {value}
                    </Link>
                  ) : (
                    <span className="mt-0.5 block text-sm leading-snug text-heading">
                      {value}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
