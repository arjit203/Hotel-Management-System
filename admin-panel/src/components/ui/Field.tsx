"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + hint/error wrapper. Every form control in the admin panel
 * goes through this so labels, spacing and error placement stay identical
 * whether the control is an input, select, textarea or something custom.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-danger-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Text input

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Rendered inside the control, before the text (e.g. a search icon). */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  wrapperClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, leading, trailing, wrapperClassName, className, id, required, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  const control = (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          "input",
          leading && "pl-9",
          trailing && "pr-9",
          error && "input-invalid",
          className
        )}
        {...rest}
      />
      {trailing && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">{trailing}</span>
      )}
    </div>
  );

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={wrapperClassName}
    >
      {control}
    </Field>
  );
});

// ------------------------------------------------------------------ Textarea

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, wrapperClassName, className, id, required, ...rest },
  ref
) {
  const autoId = useId();
  const areaId = id || autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={areaId}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={areaId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn("input", error && "input-invalid", className)}
        {...rest}
      />
    </Field>
  );
});

// -------------------------------------------------------------------- Select

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, id, required, children, ...rest },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={selectId}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn("input", error && "input-invalid", className)}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
});

// ------------------------------------------------------------------- Toggle

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
          )}
        />
      </button>
      <span>
        <span className="block text-base font-medium text-ink-700">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

// ----------------------------------------------------------------- Checkbox

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  indeterminate,
  className,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <input
        type="checkbox"
        className="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel || label}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate) && !checked;
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span className="text-base text-ink-700">{label}</span>}
    </label>
  );
}
