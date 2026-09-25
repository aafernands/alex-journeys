import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  action?: ReactNode;
};

/** One sentence and, at most, one button. */
export function EmptyState({ children, action }: Props) {
  return (
    <div className="ui-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}
