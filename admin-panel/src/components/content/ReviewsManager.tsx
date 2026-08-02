"use client";

import { useMemo, useState } from "react";
import { Check, MessageSquare, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, formatApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Lightbox from "@/components/ui/Lightbox";
import { SegmentedControl } from "@/components/ui/Tabs";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { relativeTime } from "@/lib/format";

export interface ReviewItem {
  _id: string;
  guestName?: string;
  rating: number;
  comment: string;
  images?: string[];
  isApproved: boolean;
  adminReply?: string;
  createdAt: string;
}

interface Props {
  /** "/admin/hotels" or "/admin/restaurants". */
  basePath: string;
  items: ReviewItem[];
  loading?: boolean;
  onChanged: () => void;
  /**
   * Only the Hotel module exposes DELETE /reviews/:id/images. The Restaurant
   * module has no equivalent route, so the per-image remove control is hidden
   * there rather than rendering a button that would 404.
   */
  canRemoveImages?: boolean;
  readOnly?: boolean;
}

type FilterKey = "all" | "pending" | "approved";

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="whitespace-nowrap text-warning-500"
      aria-label={`Rated ${rating} out of 5`}
      title={`${rating}/5`}
    >
      {"★".repeat(rating)}
      <span className="text-ink-300">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

/**
 * Review moderation shared by both verticals — approve, reply, delete.
 *
 * Reviews stay invisible on the public site until approved; the UI leads with
 * the pending queue for that reason.
 */
export default function ReviewsManager({
  basePath,
  items,
  loading,
  onChanged,
  canRemoveImages,
  readOnly,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pendingCount = items.filter((r) => !r.isApproved).length;

  const visible = useMemo(() => {
    const list =
      filter === "pending"
        ? items.filter((r) => !r.isApproved)
        : filter === "approved"
          ? items.filter((r) => r.isApproved)
          : items;
    // Pending first, then newest — the queue is the job here.
    return [...list].sort((a, b) => {
      if (a.isApproved !== b.isApproved) return a.isApproved ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, filter]);

  const averageRating = useMemo(() => {
    const approved = items.filter((r) => r.isApproved);
    if (approved.length === 0) return null;
    return approved.reduce((sum, r) => sum + r.rating, 0) / approved.length;
  }, [items]);

  async function handleApprove(review: ReviewItem) {
    setBusyId(review._id);
    const res = await adminApi.put(`${basePath}/reviews/${review._id}/approve`, {});
    setBusyId(null);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Review approved and now public.");
    onChanged();
  }

  async function handleReply(review: ReviewItem) {
    const reply = (replyDrafts[review._id] ?? review.adminReply ?? "").trim();
    if (!reply) {
      toastError("Write a reply first.");
      return;
    }

    setBusyId(review._id);
    const res = await adminApi.put(`${basePath}/reviews/${review._id}/reply`, { reply });
    setBusyId(null);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Reply published.");
    setReplyDrafts((prev) => ({ ...prev, [review._id]: "" }));
    setOpenReplyFor(null);
    onChanged();
  }

  async function handleDelete(review: ReviewItem) {
    const ok = await confirm({
      title: "Delete this review permanently?",
      description: "This cannot be undone and the guest is not notified.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`${basePath}/reviews/${review._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Review deleted.");
    onChanged();
  }

  async function handleRemoveImage(review: ReviewItem, imageUrl: string) {
    const ok = await confirm({
      title: "Remove this photo from the review?",
      description: "The rest of the review is kept.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`${basePath}/reviews/${review._id}/images`, { imageUrl });
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Photo removed.");
    onChanged();
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Reviews</h2>
          <p className="card-subtitle">
            {items.length} total
            {averageRating !== null && ` · ${averageRating.toFixed(1)} average from approved`}
            {pendingCount > 0 && ` · ${pendingCount} awaiting approval`}
          </p>
        </div>
        <SegmentedControl<FilterKey>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
            { value: "approved", label: "Approved" },
          ]}
        />
      </div>

      <div className="card-body">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Star size={19} />}
            title={
              filter === "pending"
                ? "Nothing awaiting approval"
                : filter === "approved"
                  ? "No approved reviews yet"
                  : "No reviews yet"
            }
            description={
              filter === "all"
                ? "Guest reviews submitted from the public site land here for approval."
                : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((review) => {
              const isBusy = busyId === review._id;
              const replyOpen = openReplyFor === review._id;
              return (
                <li
                  key={review._id}
                  className={cn(
                    "rounded-lg border p-4",
                    review.isApproved ? "border-line bg-white" : "border-warning-100 bg-warning-50/40"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-ink-800">
                      {review.guestName || "Guest"}
                    </span>
                    <Stars rating={review.rating} />
                    <span className="text-xs text-ink-500">{relativeTime(review.createdAt)}</span>
                    <Badge
                      className="ml-auto"
                      tone={review.isApproved ? "success" : "warning"}
                    >
                      {review.isApproved ? "Public" : "Awaiting approval"}
                    </Badge>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-base text-ink-700">
                    {review.comment}
                  </p>

                  {review.images && review.images.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {review.images.map((url) => (
                        <li key={url} className="group relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Guest photo"
                            onClick={() => setPreview(url)}
                            className="h-20 w-20 cursor-zoom-in rounded-md border border-line object-cover"
                          />
                          {canRemoveImages && !readOnly && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveImage(review, url)}
                              aria-label="Remove photo"
                              className="absolute right-1 top-1 rounded bg-ink-900/70 p-0.5 text-white opacity-0 transition-opacity hover:bg-danger-600 group-focus-within:opacity-100 group-hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {review.adminReply && (
                    <div className="mt-3 rounded-md border border-line bg-surface-hover px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        Your reply
                      </p>
                      <p className="mt-0.5 whitespace-pre-line text-base text-ink-700">
                        {review.adminReply}
                      </p>
                    </div>
                  )}

                  {!readOnly && (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!review.isApproved && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<Check size={13} />}
                            loading={isBusy}
                            onClick={() => void handleApprove(review)}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<MessageSquare size={13} />}
                          onClick={() => {
                            setOpenReplyFor(replyOpen ? null : review._id);
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [review._id]: prev[review._id] ?? review.adminReply ?? "",
                            }));
                          }}
                        >
                          {review.adminReply ? "Edit reply" : "Reply"}
                        </Button>
                        <Button
                          size="sm"
                          variant="dangerGhost"
                          icon={<Trash2 size={13} />}
                          onClick={() => void handleDelete(review)}
                        >
                          Delete
                        </Button>
                      </div>

                      {replyOpen && (
                        <div className="mt-3 animate-slide-up">
                          <textarea
                            value={replyDrafts[review._id] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [review._id]: e.target.value }))
                            }
                            placeholder="Thanks for staying with us…"
                            aria-label="Reply to review"
                            rows={3}
                            className="input"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <Button size="sm" onClick={() => setOpenReplyFor(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              loading={isBusy}
                              onClick={() => void handleReply(review)}
                            >
                              {review.adminReply ? "Update reply" : "Publish reply"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Lightbox src={preview} alt="Guest photo" onClose={() => setPreview(null)} />
    </div>
  );
}
