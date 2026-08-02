"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ImagePlus,
  Link2,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatApiError, type ApiResponse } from "@/lib/api";
import Button from "./Button";
import { useToast } from "./Toast";

export type UploadFn = (
  file: File,
  folder: string
) => Promise<ApiResponse<{ url: string; publicId: string }>>;

interface Props {
  /** Ordered list of image URLs. The first entry is treated as the cover. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Cloudinary folder segment, e.g. "rooms" / "menu". */
  folder: string;
  /**
   * Vertical-specific upload function — hotel and restaurant have separate
   * upload endpoints and each is RBAC-guarded on its own module, so the caller
   * passes the right one rather than this component guessing.
   */
  upload: UploadFn;
  /** Single-image mode (menu item photo). Hides reorder + cover controls. */
  single?: boolean;
  max?: number;
  label?: string;
  hint?: string;
  className?: string;
}

interface PendingUpload {
  id: string;
  name: string;
  /** 0–100. Cloudinary uploads go through fetch(), which has no progress
   *  event, so this is a coarse indeterminate ramp, not byte-accurate. */
  progress: number;
}

const ACCEPTED = "image/*";

/**
 * Drag-and-drop image manager used by every media field in the admin panel:
 * room images, gallery, menu photos, dining-area photos.
 *
 * Replaces the old `<input type="file">` + radio-button ("file / camera / URL")
 * pattern. All three input methods are still supported — drop/browse, device
 * camera, and pasting a URL — because existing content was added by URL and
 * staff photograph rooms on a phone.
 *
 * Images are stored exactly as before: the component's value is a plain array
 * of `secure_url` strings, which is what the models expect.
 */
export default function ImageUploader({
  value,
  onChange,
  folder,
  upload,
  single = false,
  max = 20,
  label,
  hint,
  className,
}: Props) {
  const { toastError } = useToast();
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const atCapacity = single ? value.length >= 1 : value.length + pending.length >= max;

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const room = single ? 1 - value.length : max - value.length;
      const accepted = files.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(room, 0));

      if (accepted.length < files.length) {
        toastError(
          room <= 0
            ? `You can attach at most ${single ? 1 : max} image${single ? "" : "s"} here.`
            : "Some files were skipped — only image files can be uploaded."
        );
      }
      if (accepted.length === 0) return;

      for (const file of accepted) {
        const id = `${file.name}-${Math.random().toString(36).slice(2, 8)}`;
        setPending((prev) => [...prev, { id, name: file.name, progress: 8 }]);

        // fetch() gives no upload progress, so animate a bounded ramp that
        // never reaches 100% until the request actually resolves.
        const ticker = setInterval(() => {
          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, progress: Math.min(p.progress + 9, 90) } : p))
          );
        }, 220);

        try {
          const res = await upload(file, folder);
          if (res.success && res.data) {
            onChange(single ? [res.data.url] : [...value, res.data.url]);
          } else {
            toastError(formatApiError(res));
          }
        } catch {
          toastError(`Upload failed for ${file.name}. Check your connection and try again.`);
        } finally {
          clearInterval(ticker);
          setPending((prev) => prev.filter((p) => p.id !== id));
        }
      }
    },
    [folder, max, onChange, single, toastError, upload, value]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (atCapacity) return;
    void uploadFiles(Array.from(e.dataTransfer.files || []));
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-picking the same file
    void uploadFiles(files);
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toastError("Enter a full image URL starting with http:// or https://");
      return;
    }
    if (value.includes(url)) {
      toastError("That image is already attached.");
      return;
    }
    onChange(single ? [url] : [...value, url]);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  }

  return (
    <div className={className}>
      {label && <span className="field-label">{label}</span>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!atCapacity) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-brand-500 bg-brand-50"
            : atCapacity
              ? "border-line bg-surface-muted"
              : "border-line-strong bg-surface-hover hover:border-brand-300"
        )}
      >
        <UploadCloud
          size={22}
          className={cn("mx-auto", dragging ? "text-brand-600" : "text-ink-400")}
        />
        <p className="mt-2 text-base text-ink-700">
          {atCapacity ? (
            single ? (
              "Remove the current image to replace it"
            ) : (
              `Limit of ${max} images reached`
            )
          ) : (
            <>
              <span className="font-medium text-brand-700">Drop images here</span> or use a button
              below
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          PNG, JPG or WebP{single ? "" : ` · up to ${max} images`}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            icon={<ImagePlus size={14} />}
            disabled={atCapacity}
            onClick={() => fileInputRef.current?.click()}
          >
            Browse files
          </Button>
          <Button
            size="sm"
            icon={<Camera size={14} />}
            disabled={atCapacity}
            onClick={() => cameraInputRef.current?.click()}
          >
            Take photo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Link2 size={14} />}
            disabled={atCapacity}
            onClick={() => setShowUrlInput((v) => !v)}
          >
            Add by URL
          </Button>
        </div>

        {showUrlInput && !atCapacity && (
          <div className="mx-auto mt-3 flex max-w-md items-center gap-2">
            <input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
              className="input py-1.5"
            />
            <Button size="sm" variant="primary" onClick={addUrl} disabled={!urlDraft.trim()}>
              Add
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple={!single}
          onChange={handlePick}
          className="sr-only"
          tabIndex={-1}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={ACCEPTED}
          capture="environment"
          onChange={handlePick}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="rounded-md border border-line bg-white px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-ink-600">
                <Loader2 size={13} className="animate-spin text-brand-600" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="tabular-nums text-ink-500">{p.progress}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul
          className={cn(
            "mt-3 grid gap-3",
            single ? "grid-cols-1 sm:max-w-[220px]" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          )}
        >
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={single ? "Selected image" : `Image ${index + 1}`}
                className="aspect-[4/3] w-full object-cover"
              />

              {!single && index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink-900/75 px-1.5 py-0.5 text-xs font-medium text-white">
                  Cover
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink-900/70 px-1 py-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                {!single && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === value.length - 1}
                      aria-label="Move image later"
                      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      disabled={index === 0}
                      aria-label="Make cover image"
                      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <Star size={13} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label="Remove image"
                  className="rounded p-1 text-white hover:bg-danger-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
