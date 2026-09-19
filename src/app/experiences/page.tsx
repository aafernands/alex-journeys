import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { experiencesNav } from "@/data/nav";

export const metadata: Metadata = {
  title: "Travel Experiences",
  description:
    "Stories shaped by what I actually did on the ground — adventure, food, outdoors, and bucket-list moments.",
};

export default function ExperiencesPage() {
  return (
    <SitePage
      label="Experiences"
      title="Must-try travel experiences"
      description="Stories shaped by what I actually did on the ground — adventure days, food finds, outdoors, and the bucket-list moments worth the early alarm."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Experiences" },
      ]}
    >
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experiencesNav.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="panel-interactive group flex h-full gap-4 p-5"
            >
              <span className="panel-nested flex size-11 shrink-0 items-center justify-center bg-white text-accent">
                <NavIcon name={item.icon} size={20} />
              </span>
              <span>
                <span className="font-display block text-lg font-bold text-heading">
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
