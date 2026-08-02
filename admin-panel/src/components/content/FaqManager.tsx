"use client";

import { useState } from "react";
import { MessageSquareQuote, Plus, Trash2 } from "lucide-react";
import { adminApi, formatApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Accordion from "@/components/ui/Accordion";
import { TextArea, TextInput } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  displayOrder?: number;
}

interface Props {
  /** "/admin/hotels" or "/admin/restaurants". */
  basePath: string;
  ownerId: string;
  items: FaqItem[];
  loading?: boolean;
  onChanged: () => void;
  readOnly?: boolean;
}

/**
 * FAQ manager shared by both verticals.
 *
 * Answers are shown in accordions rather than a table because they are long
 * prose — a table row would truncate the only part that matters. The backend
 * exposes create and delete only (no FAQ update route), so editing an answer
 * means deleting and re-adding; the UI says so instead of offering an Edit
 * action that would 404.
 */
export default function FaqManager({
  basePath,
  ownerId,
  items,
  loading,
  onChanged,
  readOnly,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await adminApi.post(`${basePath}/${ownerId}/faqs`, form);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess("FAQ added.");
    setForm({ question: "", answer: "" });
    setOpen(false);
    onChanged();
  }

  async function handleDelete(faq: FaqItem) {
    const ok = await confirm({
      title: "Delete this FAQ?",
      description: faq.question,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`${basePath}/faqs/${faq._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("FAQ deleted.");
    onChanged();
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">FAQs</h2>
          <p className="card-subtitle">
            {items.length} question{items.length === 1 ? "" : "s"} shown on the public page
          </p>
        </div>
        {!readOnly && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
            New FAQ
          </Button>
        )}
      </div>

      <div className="card-body">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<MessageSquareQuote size={19} />}
            title="No FAQs yet"
            description="Answer the questions guests ask most — it cuts inbound calls."
            action={
              !readOnly && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
                  New FAQ
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-2">
            {items.map((faq) => (
              <Accordion key={faq._id} title={faq.question}>
                <p className="whitespace-pre-line text-base text-ink-600">{faq.answer}</p>
                {!readOnly && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="dangerGhost"
                      icon={<Trash2 size={13} />}
                      onClick={() => void handleDelete(faq)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </Accordion>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New FAQ"
        description="Shown on the public property page in the order they were created."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="faq-form" loading={saving}>
              Add FAQ
            </Button>
          </>
        }
      >
        <form id="faq-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}
          <TextInput
            label="Question"
            required
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="What time is check-in?"
          />
          <TextArea
            label="Answer"
            required
            rows={5}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            hint="There is no FAQ edit endpoint — to reword an answer later, delete this entry and add it again."
          />
        </form>
      </Modal>
    </div>
  );
}
