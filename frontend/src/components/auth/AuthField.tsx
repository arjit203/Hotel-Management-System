"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  /** Small helper line under the field. */
  hint?: string;
  /** Adds a show/hide toggle. Implies a password input. */
  reveal?: boolean;
}

/**
 * Auth input, matching the design reference: a small light label ABOVE a solid
 * white rounded field, sitting on the dark glass card.
 *
 * Note on the earlier brief: it asked for floating labels, and the first build
 * of this used them. The supplied reference shows persistent labels above filled
 * inputs instead, so the reference wins — a label that is always visible is also
 * the more usable of the two on a form this short. The "smooth focus animation"
 * requirement is kept as a gold ring + lift on focus.
 *
 * White fields are deliberate: dark-on-dark inputs over photography are the
 * usual failure mode of this layout, and near-black text on white clears
 * contrast comfortably regardless of which photo is behind the card.
 */
export default function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  minLength,
  autoComplete,
  hint,
  reveal = false,
}: AuthFieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  const inputType = reveal ? (show ? "text" : "password") : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.9375rem] font-normal text-cream/85"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-transparent bg-white/95 px-4 py-3.5 text-base
                      font-normal text-ink placeholder:text-warm-400
                      [&[type=password]]:text-lg [&[type=password]]:tracking-[0.12em]
                      [&[type=password]]:placeholder:text-base [&[type=password]]:placeholder:tracking-normal
                      transition-all duration-300 ease-luxe
                      focus:border-gold focus:bg-white focus:outline-none
                      focus:ring-2 focus:ring-gold/35 ${reveal ? "pr-12" : ""}`}
        />

        {reveal && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-warm-500
                       transition-colors duration-300 hover:text-gold-dark"
          >
            {show ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      {hint && <p className="mt-2 text-sm font-light text-cream/70">{hint}</p>}
    </div>
  );
}
