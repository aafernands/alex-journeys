import { ExternalLink } from "lucide-react";
import { NavIcon } from "@/components/icons/NavIcon";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import type { AffiliateTool } from "@/data/nav";

type ToolCardProps = {
  tool: AffiliateTool;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <OutboundLink
      href={tool.href}
      affiliate
      className="panel-interactive group flex h-full items-start gap-3 p-4"
    >
      <span className="icon-tile">
        <NavIcon name={tool.icon} size={20} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="card-title">
            {tool.title}
          </span>
          <ExternalLink
            className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-accent"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">{tool.partner}</span>
          <span className="rounded-full border border-border bg-surface-soft px-1.5 py-0.5 text-ds-caption font-semibold uppercase tracking-[0.08em] text-muted">
            Affiliate
          </span>
        </span>

        <span className="mt-2 block text-sm leading-relaxed text-text">
          {tool.description}
        </span>
      </span>
    </OutboundLink>
  );
}
