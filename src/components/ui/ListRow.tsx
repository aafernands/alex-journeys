import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  leading?: ReactNode;
  title: ReactNode;
  /** Gray secondary line. Present rows are 48px; a title alone is 44px. */
  detail?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  expanded?: boolean;
  className?: string;
};

/**
 * One row anatomy: leading icon, primary line, gray line, trailing action.
 * The leading and trailing controls sit outside the main hit target.
 */
export function ListRow({
  leading,
  title,
  detail,
  trailing,
  href,
  onClick,
  expanded,
  className = "",
}: Props) {
  const copy = (
    <span className="ui-list-copy">
      <span className="ui-list-title">{title}</span>
      {detail ? <span className="ui-list-detail">{detail}</span> : null}
    </span>
  );
  const mainClass = "ui-list-main";
  const main = href ? (
    <Link href={href} className={mainClass}>
      {copy}
    </Link>
  ) : onClick ? (
    <button type="button" className={mainClass} onClick={onClick} aria-expanded={expanded}>
      {copy}
    </button>
  ) : (
    <span className={mainClass}>{copy}</span>
  );

  return (
    <div className={`ui-list-row${detail ? " ui-list-row-pair" : ""} ${className}`.trim()}>
      {leading ? <span className="ui-list-leading">{leading}</span> : null}
      {main}
      {trailing ? <span className="ui-list-trailing">{trailing}</span> : null}
    </div>
  );
}
