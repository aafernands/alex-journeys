import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

/** Label, control, and optional error. The control is usually Input. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="ui-field">
      <label htmlFor={htmlFor} className="ui-field-label">
        {label}
      </label>
      {children}
      {hint ? <p className="ui-field-hint">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="ui-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-control ${className}`.trim()} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-control ui-control-area ${className}`.trim()} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-control ${className}`.trim()} {...props} />;
}
