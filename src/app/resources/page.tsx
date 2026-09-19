import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { resourcesNav } from "@/data/nav";

export const metadata: Metadata = {
  title: "Travel Resources",
  description:
    "Tools, apps, and guides I actually use when planning trips — budget tips, packing, money abroad, and gear.",
};

export default function ResourcesPage() {
  return (
    <SitePage
      label="Resources"
      title="My favorite travel resources"
      description="Tools, apps, and guides I actually use when planning trips — budget tips, packing, money abroad, and gear that earned a spot in my bag. No booking desk; just notes from the road."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Resources" },
      ]}
    >
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resourcesNav.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex h-full gap-4 rounded-xl border border-surface bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(12,13,14,0.3)]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                <NavIcon name={item.icon} size={20} />
              </span>
              <span>
                <span className="font-display block text-lg font-bold text-heading transition group-hover:text-accent">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="mt-1 block text-sm leading-relaxed text-text">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
