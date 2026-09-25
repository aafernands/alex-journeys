import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  id?: string;
  as?: "h2" | "h3";
};

/** Left-aligned title, optional muted subtitle, optional trailing action. */
export function SectionHeader({ title, subtitle, action, id, as = "h2" }: Props) {
  const Title = as;
  return (
    <div className="ui-section-header">
      <div className="min-w-0">
        <Title id={id} className="ui-section-title">
          {title}
        </Title>
        {subtitle ? <p className="ui-section-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="ui-section-action">{action}</div> : null}
    </div>
  );
}
