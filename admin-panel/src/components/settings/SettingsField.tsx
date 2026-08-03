"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, KeyRound, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { TextInput, TextArea, Select, Toggle } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CLEAR_SECRET, uploadSettingsImage } from "@/lib/settingsApi";
import { VALUE_POINT_ICONS, type FieldSpec } from "./schema";

/**
 * Renders one settings field from its spec.
 *
 * Everything funnels through here so a text box in Branding behaves like a text
 * box in SEO, and adding a field type is a case in one switch rather than a new
 * component per category.
 */

interface Props {
  spec: FieldSpec;
  value: unknown;
  /** The `••••••••1234` mask for a saved secret, if there is one. */
  secretHint?: string;
  onChange: (value: unknown) => void;
  onError: (message: string) => void;
}

export default function SettingsField({ spec, value, secretHint, onChange, onError }: Props) {
  switch (spec.type) {
    case "toggle":
      return (
        <Toggle
          checked={value === true}
          onChange={(next) => onChange(next)}
          label={spec.label}
          description={spec.hint}
        />
      );

    case "number":
      return (
        <TextInput
          label={spec.label}
          hint={spec.hint}
          type="number"
          min={spec.min}
          max={spec.max}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => {
            // An empty box is "unset", not 0 — writing 0 into the advance
            // percentage while someone is mid-edit would be a real problem.
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
        />
      );

    case "textarea":
      return (
        <TextArea
          label={spec.label}
          hint={spec.hint}
          rows={3}
          placeholder={spec.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "markdown":
      return (
        <TextArea
          label={spec.label}
          hint={spec.hint ?? "Markdown. Leave empty to keep the page unpublished."}
          rows={10}
          className="font-mono text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "select":
      return (
        <Select
          label={spec.label}
          hint={spec.hint}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(spec.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );

    case "color":
      return <ColorField spec={spec} value={value} onChange={onChange} />;

    case "image":
      return <ImageField spec={spec} value={value} onChange={onChange} onError={onError} />;

    case "secret":
      return <SecretField spec={spec} value={value} secretHint={secretHint} onChange={onChange} />;

    case "valuePoints":
      return <ValuePointsField spec={spec} value={value} onChange={onChange} />;

    case "amenities":
      return <AmenitiesField spec={spec} value={value} onChange={onChange} />;

    default:
      return (
        <TextInput
          label={spec.label}
          hint={spec.hint}
          placeholder={spec.placeholder}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// ---------------------------------------------------------------- Colour

function ColorField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const hex = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";

  return (
    <div>
      <span className="field-label">{spec.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${spec.label} colour picker`}
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-white p-1"
        />
        {/* The hex box stays editable: designers paste values, they don't hunt
            for them in a colour wheel. */}
        <input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#C9A227"
          aria-label={`${spec.label} hex value`}
          className="input font-mono"
        />
      </div>
      {spec.hint && <span className="field-hint">{spec.hint}</span>}
    </div>
  );
}

// ----------------------------------------------------------------- Image

function ImageField({
  spec,
  value,
  onChange,
  onError,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  onError: (m: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = typeof value === "string" ? value : "";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadSettingsImage(file, "branding");
    setUploading(false);

    if (res.success && res.data) onChange(res.data.url);
    else onError(res.message || "Upload failed.");
  }

  return (
    <div>
      <span className="field-label">{spec.label}</span>

      <div className="flex items-start gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-muted">
          {url ? (
            // Not next/image: these are arbitrary remote URLs (Cloudinary today,
            // possibly elsewhere tomorrow) and next.config's remotePatterns
            // cannot be widened from a settings form.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-contain" />
          ) : (
            <Upload size={18} className="text-ink-400" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={url}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            aria-label={`${spec.label} URL`}
            className="input font-mono text-xs"
          />
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Upload
            </Button>
            {url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                <X size={13} />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {spec.hint && <span className="field-hint">{spec.hint}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- Secret

/**
 * A write-only credential.
 *
 * The server never returns the stored value, so this input starts empty even
 * when a secret exists — the mask beside the label is the only evidence. Typing
 * replaces; leaving it blank keeps what is stored; "Clear" sends the sentinel
 * the server understands as a delete.
 */
function SecretField({
  spec,
  value,
  secretHint,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  secretHint?: string;
  onChange: (v: unknown) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const raw = typeof value === "string" ? value : "";
  const clearing = raw === CLEAR_SECRET;
  const saved = Boolean(secretHint);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="field-label mb-0">{spec.label}</span>
        {saved && !clearing && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <KeyRound size={11} />
            <span className="font-mono">{secretHint}</span>
          </span>
        )}
      </div>

      {clearing ? (
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-danger-100 bg-danger-50 px-3 py-2">
          <span className="text-sm text-danger-700">
            Will be deleted when you save. The server falls back to its .env value.
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-xs font-medium text-danger-700 hover:underline"
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={reveal ? "text" : "password"}
              value={raw}
              autoComplete="new-password"
              onChange={(e) => onChange(e.target.value)}
              placeholder={saved ? "Leave blank to keep the saved value" : "Not set"}
              aria-label={spec.label}
              className="input pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Hide" : "Show what you typed"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {saved && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(CLEAR_SECRET)}>
              Clear
            </Button>
          )}
        </div>
      )}

      <span className="field-hint">
        {spec.hint ??
          (saved
            ? "Encrypted and cannot be read back. Type a new value to replace it."
            : "Encrypted before it is stored. Blank means the server keeps using its .env value.")}
      </span>
    </div>
  );
}

// ----------------------------------------------------- Repeaters (lists)

interface ValuePoint {
  icon?: string;
  title?: string;
  desc?: string;
}

function ValuePointsField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const points: ValuePoint[] = Array.isArray(value) ? (value as ValuePoint[]) : [];

  function update(index: number, patch: Partial<ValuePoint>) {
    onChange(points.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div>
      <span className="field-label">{spec.label}</span>

      <div className="space-y-3">
        {points.map((point, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Card {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <MoveButtons
                  index={index}
                  count={points.length}
                  onMove={(from, to) => {
                    const next = [...points];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    onChange(next);
                  }}
                />
                <button
                  type="button"
                  onClick={() => onChange(points.filter((_, i) => i !== index))}
                  className="rounded p-1 text-danger-600 hover:bg-danger-50"
                  aria-label={`Remove card ${index + 1}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-[8rem_1fr]">
              <Select
                label="Icon"
                value={point.icon ?? ""}
                onChange={(e) => update(index, { icon: e.target.value })}
              >
                <option value="">Default</option>
                {VALUE_POINT_ICONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <TextInput
                label="Title"
                value={point.title ?? ""}
                onChange={(e) => update(index, { title: e.target.value })}
              />
              <div className="sm:col-span-2">
                <TextArea
                  label="Description"
                  rows={2}
                  value={point.desc ?? ""}
                  onChange={(e) => update(index, { desc: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2.5"
        onClick={() => onChange([...points, { icon: "Sparkles", title: "", desc: "" }])}
      >
        <Plus size={13} />
        Add a card
      </Button>

      <span className="field-hint">
        The band is a four-column grid. Four cards fill it exactly; other counts still work but wrap.
      </span>
    </div>
  );
}

interface Amenity {
  name?: string;
  icon?: string;
}

function AmenitiesField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const items: Amenity[] = Array.isArray(value) ? (value as Amenity[]) : [];

  return (
    <div>
      <span className="field-label">{spec.label}</span>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-surface-muted/60 px-3 py-3 text-sm text-ink-600">
          Empty — the band shows the hotel&apos;s own amenities, exactly as it does now. Add an entry
          to take over and list facilities from any of the three businesses.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <TextInput
                aria-label={`Facility ${index + 1} name`}
                placeholder="Free Wi-Fi"
                wrapperClassName="flex-1"
                value={item.name ?? ""}
                onChange={(e) =>
                  onChange(items.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)))
                }
              />
              <MoveButtons
                index={index}
                count={items.length}
                onMove={(from, to) => {
                  const next = [...items];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  onChange(next);
                }}
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="rounded p-1.5 text-danger-600 hover:bg-danger-50"
                aria-label={`Remove facility ${index + 1}`}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2.5"
        onClick={() => onChange([...items, { name: "" }])}
      >
        <Plus size={13} />
        Add a facility
      </Button>

      <span className="field-hint">
        The band shows the first six. Icons are matched from the name automatically.
      </span>
    </div>
  );
}

function MoveButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <span className="flex shrink-0 flex-col">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className={cn(
          "px-1 text-xs leading-none text-ink-400 hover:text-ink-700",
          index === 0 && "invisible"
        )}
        aria-label="Move up"
      >
        ▲
      </button>
      <button
        type="button"
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className={cn(
          "px-1 text-xs leading-none text-ink-400 hover:text-ink-700",
          index === count - 1 && "invisible"
        )}
        aria-label="Move down"
      >
        ▼
      </button>
    </span>
  );
}
