import Link from "next/link";
import type { HubTopic } from "@/data/hubs";

export function TopicGrid({ topics }: { topics: HubTopic[] }) {
  return (
    <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <li key={topic.href + topic.title}>
          <Link
            href={topic.href}
            className="panel-interactive group flex h-full flex-col p-5 md:p-6"
          >
            <h2 className="font-display text-lg font-bold text-heading md:text-xl">
              {topic.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-text">
              {topic.description}
            </p>
            <span className="mt-4 text-sm font-semibold text-link transition group-hover:text-accent">
              Explore →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
