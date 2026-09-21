import type { ReactNode } from "react";

type Tone = "default" | "soft" | "white";

type Props = {
  id?: string;
  children: ReactNode;
  /** Visual band: white, soft surface, or page default */
  tone?: Tone;
  /** Hairline top border between bands (avoids double lines) */
  hairline?: boolean;
  /** Extra vertical padding */
  size?: "md" | "lg";
  className?: string;
  "aria-labelledby"?: string;
};

const toneClass: Record<Tone, string> = {
  default: "bg-bg [--carousel-fade:var(--bg)]",
  soft: "bg-surface-soft [--carousel-fade:var(--surface-soft)]",
  white: "bg-white [--carousel-fade:var(--white)]",
};

/**
 * Shared page section shell — max ~1280, consistent py, optional surface band.
 * Use on homepage blocks and major inner pages so the site reads as one system.
 */
export function Section({
  id,
  children,
  tone = "default",
  hairline = false,
  size = "lg",
  className = "",
  "aria-labelledby": labelledBy,
}: Props) {
  const py = size === "lg" ? "section-band" : "py-10 md:py-12";
  const borders = hairline ? "border-t border-border" : "";

  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`${toneClass[tone]} ${borders} ${className}`.trim()}
    >
      <div className={`section-shell ${py}`}>{children}</div>
    </section>
  );
}

type HeadProps = {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
};

/** Eyebrow → headline → one paragraph (+ optional trailing action). */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  description,
  align = "left",
  action,
}: HeadProps) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col gap-4 ${
        action
          ? "md:flex-row md:items-end md:justify-between"
          : ""
      }`}
    >
      <div className={centered && !action ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2
          id={titleId}
          className={`font-display text-display text-heading ${eyebrow ? "mt-2" : ""}`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-lead text-text">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start md:self-auto">{action}</div> : null}
    </div>
  );
}
