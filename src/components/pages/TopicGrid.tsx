import Link from "next/link";
import type { HubTopic } from "@/data/hubs";

export function TopicGrid({ topics }: { topics: HubTopic[] }) {
  return (
    <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <li key={topic.href + topic.title}>
          <Link
            href={topic.href}
            className="group flex h-full flex-col rounded-xl border border-surface bg-white p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(12,13,14,0.3)]"
          >
            <h2 className="font-display text-xl font-bold text-heading transition group-hover:text-accent">
              {topic.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-text">
              {topic.description}
            </p>
            <span className="mt-4 text-sm font-bold text-link transition group-hover:text-accent">
              Explore →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
