"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BedDouble,
  Check,
  ExternalLink,
  Info,
  Monitor,
  PartyPopper,
  RotateCcw,
  Save,
  Server,
  Settings as SettingsIcon,
  ShieldAlert,
  Sliders,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import SettingsField from "@/components/settings/SettingsField";
import { CATEGORY_SPECS, type CategorySpec } from "@/components/settings/schema";
import { useAdminSession } from "@/lib/adminSession";
import { useBusiness, BUSINESS_LABEL } from "@/lib/businessContext";
import { useShellUi } from "@/lib/shellUi";
import { settingsApi, type AllSettings, type SettingCategory } from "@/lib/settingsApi";
import { formatApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

/**
 * Platform settings — the CMS for everything that used to require a deploy.
 *
 * ── Scope ──
 * Super Admin only, enforced by the API on the router itself. A manager landing
 * here is told why rather than shown an empty form.
 *
 * ── What is *not* here, on purpose ──
 * Property-level configuration (a hotel's name, a restaurant's slots, a hall's
 * capacity) stays on each property's own page. The platform is multi-tenant by
 * mandate even with one property per vertical, so those fields belong to a
 * document, not to the platform. The Console tab links out to them.
 *
 * ── Saving ──
 * One category at a time, as a partial patch. That keeps a save small, makes
 * "unsaved changes" meaningful per tab, and means a validation failure in
 * Integrations cannot roll back an edit to Homepage.
 */
export default function SettingsPage() {
  const { admin } = useAdminSession();
  const isSuperAdmin = admin?.role === "super_admin";

  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, unknown>>>({});
  const [active, setActive] = useState<SettingCategory | "console">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await settingsApi.getAll();
    setLoading(false);

    if (res.success && res.data) {
      setSettings(res.data);
      setDraft(
        Object.fromEntries(Object.entries(res.data).map(([k, v]) => [k, { ...v.values }]))
      );
      setError(null);
    } else {
      setError(res.message || "Could not load settings.");
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void load();
    else setLoading(false);
  }, [isSuperAdmin, load]);

  const activeSpec: CategorySpec | undefined = useMemo(
    () => CATEGORY_SPECS.find((c) => c.key === active),
    [active]
  );

  /**
   * Which categories have edits waiting.
   *
   * Compared against the loaded values rather than tracked with a flag, so
   * typing a character and deleting it again correctly leaves the tab clean.
   * A secret field is dirty only when something was actually typed, because it
   * always loads blank.
   */
  const dirtyCategories = useMemo(() => {
    if (!settings) return new Set<string>();
    const dirty = new Set<string>();

    for (const spec of CATEGORY_SPECS) {
      const original = settings[spec.key]?.values ?? {};
      const current = draft[spec.key] ?? {};
      for (const key of Object.keys(current)) {
        if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
          dirty.add(spec.key);
          break;
        }
      }
    }
    return dirty;
  }, [settings, draft]);

  function setValue(category: SettingCategory, key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [category]: { ...prev[category], [key]: value } }));
  }

  async function handleSave(category: SettingCategory) {
    const spec = CATEGORY_SPECS.find((c) => c.key === category);
    if (!spec || !settings) return;

    const original = settings[category]?.values ?? {};
    const current = draft[category] ?? {};

    // Send only what changed. A full-category PUT would also mean re-sending
    // every blank secret field, which the server reads as "keep it" — harmless
    // but it makes the audit log's stored values misleading.
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(current)) {
      if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
        patch[key] = current[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      toastSuccess("Nothing to save.");
      return;
    }

    setSaving(true);
    const res = await settingsApi.update(category, patch);
    setSaving(false);

    if (res.success && res.data) {
      setSettings((prev) => (prev ? { ...prev, [category]: res.data! } : prev));
      setDraft((prev) => ({ ...prev, [category]: { ...res.data!.values } }));
      toastSuccess(`${spec.label} saved.`);
    } else {
      toastError(formatApiError(res));
    }
  }

  async function handleReset(category: SettingCategory) {
    const spec = CATEGORY_SPECS.find((c) => c.key === category);
    if (!spec) return;

    const ok = await confirm({
      title: `Reset ${spec.label}?`,
      description:
        "Every field in this section goes back to the value it shipped with, and the change is live on the public site immediately. Saved secrets in this section are deleted too.",
      confirmLabel: "Reset to defaults",
      danger: true,
    });
    if (!ok) return;

    setSaving(true);
    const res = await settingsApi.reset(category);
    setSaving(false);

    if (res.success) {
      await load();
      toastSuccess(`${spec.label} reset to defaults.`);
    } else {
      toastError(formatApiError(res));
    }
  }

  if (!isSuperAdmin) {
    return (
      <RequireAdmin>
        <div className="page-shell">
          <PageHeader title="Settings" breadcrumbs={[{ label: "Settings" }]} />
          <EmptyState
            icon={<ShieldAlert size={20} />}
            title="Super Admin only"
            description="Platform settings include payment credentials, SMTP passwords and the maintenance-mode switch, so only a Super Admin can open them. The API enforces this as well — it is not just a hidden menu item."
            action={
              <Link href="/" className="btn-secondary">
                Back to the dashboard
              </Link>
            }
          />
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="page-shell">
        <PageHeader
          title="Settings"
          breadcrumbs={[{ label: "Settings" }]}
          description="Site-wide configuration. Changes apply to the public website as soon as they are saved."
          actions={
            dirtyCategories.size > 0 ? (
              <Badge tone="warning">
                {dirtyCategories.size} section{dirtyCategories.size === 1 ? "" : "s"} unsaved
              </Badge>
            ) : undefined
          }
        />

        {error ? (
          <EmptyState
            icon={<SettingsIcon size={20} />}
            title="Could not load settings"
            description={error}
            action={
              <Button variant="secondary" onClick={() => void load()}>
                Try again
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
            {/* Category rail */}
            <nav aria-label="Settings sections" className="lg:sticky lg:top-20 lg:self-start">
              <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                {CATEGORY_SPECS.map((spec) => {
                  const Icon = spec.icon;
                  const isActive = active === spec.key;
                  return (
                    <li key={spec.key} className="shrink-0">
                      <button
                        onClick={() => setActive(spec.key)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-base transition-colors",
                          isActive
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-ink-600 hover:bg-surface-muted"
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span className="truncate">{spec.label}</span>
                        {dirtyCategories.has(spec.key) && (
                          <span
                            aria-label="unsaved changes"
                            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}

                <li className="shrink-0">
                  <button
                    onClick={() => setActive("console")}
                    aria-current={active === "console" ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-base transition-colors",
                      active === "console"
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-ink-600 hover:bg-surface-muted"
                    )}
                  >
                    <Sliders size={15} className="shrink-0" />
                    <span className="truncate">Console & properties</span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Panel */}
            <div>
              {loading ? (
                <div className="card p-5">
                  <span className="skeleton mb-4 block h-5 w-1/3 rounded" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} className="skeleton block h-16 rounded" />
                    ))}
                  </div>
                </div>
              ) : active === "console" ? (
                <ConsolePanel />
              ) : activeSpec ? (
                <CategoryPanel
                  spec={activeSpec}
                  values={draft[activeSpec.key] ?? {}}
                  secretHints={settings?.[activeSpec.key]?.secretHints ?? {}}
                  dirty={dirtyCategories.has(activeSpec.key)}
                  saving={saving}
                  onChange={(key, value) => setValue(activeSpec.key, key, value)}
                  onSave={() => void handleSave(activeSpec.key)}
                  onReset={() => void handleReset(activeSpec.key)}
                  onError={toastError}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  );
}

// ------------------------------------------------------------ Category panel

function CategoryPanel({
  spec,
  values,
  secretHints,
  dirty,
  saving,
  onChange,
  onSave,
  onReset,
  onError,
}: {
  spec: CategorySpec;
  values: Record<string, unknown>;
  secretHints: Record<string, string>;
  dirty: boolean;
  saving: boolean;
  onChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onReset: () => void;
  onError: (message: string) => void;
}) {
  const Icon = spec.icon;

  return (
    <div className="card">
      <div className="card-header">
        <div className="min-w-0">
          <h2 className="card-title flex items-center gap-2">
            <Icon size={16} className="text-brand-600" />
            {spec.label}
          </h2>
          <p className="card-subtitle">{spec.description}</p>
        </div>
      </div>

      <div className="card-body space-y-7">
        {spec.caution && (
          <p className="flex items-start gap-2 rounded-md border border-warning-100 bg-warning-50 px-3.5 py-2.5 text-base text-warning-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {spec.caution}
          </p>
        )}

        {spec.sections.map((section) => (
          <section key={section.title}>
            <h3 className="text-base font-semibold text-ink-800">{section.title}</h3>
            {section.description && (
              <p className="mt-0.5 max-w-2xl text-sm text-ink-500">{section.description}</p>
            )}

            <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.key} className={cn(field.full && "sm:col-span-2")}>
                  <SettingsField
                    spec={field}
                    value={values[field.key]}
                    secretHint={secretHints[field.key]}
                    onChange={(v) => onChange(field.key, v)}
                    onError={onError}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky so a long form (Homepage, Legal) never hides its own save button. */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-danger-600"
        >
          <RotateCcw size={13} />
          Reset this section to defaults
        </button>

        <div className="flex items-center gap-2.5">
          {dirty && <span className="text-sm text-warning-700">Unsaved changes</span>}
          <Button onClick={onSave} loading={saving} disabled={!dirty}>
            <Save size={14} />
            Save {spec.label.toLowerCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Console panel

/**
 * The previous Settings page, kept.
 *
 * Console preferences, per-property links and the connection details are all
 * still the right answers to real questions — they simply are not platform
 * configuration, so they now live in their own tab instead of being the whole
 * page.
 */
function ConsolePanel() {
  const { admin } = useAdminSession();
  const { hotels, restaurants, halls, business, activeProperty } = useBusiness();
  const { sidebarCollapsed, toggleSidebar } = useShellUi();
  const { toastSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  function copyApiUrl() {
    void navigator.clipboard?.writeText(API_BASE_URL);
    setCopied(true);
    toastSuccess("API base URL copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  const properties = [
    ...hotels.map((h) => ({
      id: h._id,
      name: h.name,
      href: `/hotels/${h._id}`,
      icon: <BedDouble size={15} />,
      label: "Hotel property settings",
    })),
    ...restaurants.map((r) => ({
      id: r._id,
      name: r.name,
      href: `/restaurants/${r._id}`,
      icon: <UtensilsCrossed size={15} />,
      label: "Restaurant property and reservation settings",
    })),
    ...halls.map((h) => ({
      id: h._id,
      name: h.name,
      href: `/halls/${h._id}`,
      icon: <PartyPopper size={15} />,
      label: "Venue details, capacity and enquiry lead time",
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Property configuration</h2>
            <p className="card-subtitle">Edited on each property, not globally</p>
          </div>
        </div>
        <div className="card-body space-y-3">
          <p className="text-base text-ink-600">
            A property&apos;s own name, address, contact details, reservation rules and SEO metadata
            belong to that property — the platform stays multi-tenant even with one property per
            vertical today, so these are not platform settings.
          </p>

          <div className="space-y-2">
            {properties.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  {p.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-ink-800">{p.name}</span>
                  <span className="block text-xs text-ink-500">{p.label}</span>
                </span>
                <ExternalLink size={14} className="shrink-0 text-ink-400" />
              </Link>
            ))}

            {properties.length === 0 && (
              <p className="rounded-lg border border-line bg-surface-hover px-3.5 py-3 text-base text-ink-600">
                No properties yet. Create one from Hotel, Restaurant or Marriage Hall in the sidebar.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Console preferences</h2>
            <p className="card-subtitle">Stored in this browser only</p>
          </div>
        </div>
        <div className="card-body space-y-4">
          <Toggle
            checked={sidebarCollapsed}
            onChange={toggleSidebar}
            label="Collapse the sidebar by default"
            description="Icons only, giving dense tables the full width. You can also toggle it from the sidebar footer."
          />

          <div className="divider" />

          <div>
            <p className="text-sm font-medium text-ink-700">Active business</p>
            <p className="mt-0.5 text-sm text-ink-500">
              Determines which property the Gallery, Offers, FAQs and Reviews pages act on.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{BUSINESS_LABEL[business]}</Badge>
              {activeProperty && <Badge tone="neutral">{activeProperty.name}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Connection</h2>
            <p className="card-subtitle">Useful when something isn&apos;t loading</p>
          </div>
        </div>
        <div className="card-body">
          <dl className="divide-y divide-line-subtle rounded-lg border border-line">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="flex items-center gap-1.5 text-sm text-ink-500">
                <Server size={13} />
                API base URL
              </dt>
              <dd className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-xs text-ink-800">{API_BASE_URL}</span>
                <Button size="sm" variant="ghost" onClick={copyApiUrl}>
                  {copied ? <Check size={13} /> : "Copy"}
                </Button>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="flex items-center gap-1.5 text-sm text-ink-500">
                <Monitor size={13} />
                Public site
              </dt>
              <dd className="min-w-0">
                <a
                  href={PUBLIC_SITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-xs text-brand-700 hover:underline"
                >
                  {PUBLIC_SITE_URL}
                </a>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="text-sm text-ink-500">Signed in as</dt>
              <dd className="min-w-0 truncate text-base text-ink-800">{admin?.email}</dd>
            </div>
          </dl>

          <p className="mt-3 flex items-start gap-2 text-sm text-ink-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            These come from <span className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</span> and{" "}
            <span className="font-mono text-xs">NEXT_PUBLIC_FRONTEND_URL</span> in{" "}
            <span className="font-mono text-xs">admin-panel/.env.local</span>.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Rules worth knowing</h2>
            <p className="card-subtitle">Behaviour set by the backend, not by this console</p>
          </div>
        </div>
        <div className="card-body">
          <ul className="space-y-3 text-base text-ink-600">
            <Rule>
              Hotel bookings are instant — a booking is confirmed the moment its Razorpay payment
              signature verifies. Marriage Hall is the opposite: an enquiry reserves nothing, and the
              date is held only when an admin sets it to confirmed.
            </Rule>
            <Rule>
              Only the advance percentage is charged up front; the balance is collected at the
              property.
            </Rule>
            <Rule>
              Guests never have to log in. Ownership of a booking is proved by the guest email, never
              by the reference alone.
            </Rule>
            <Rule>
              Deactivating a hotel, room or restaurant is a soft delete, and it is refused while
              dependent active records still exist.
            </Rule>
            <Rule>
              Table reservations take no payment, and there is no online food ordering — that is a
              later phase.
            </Rule>
            <Rule>
              Hall packages carry a free-text price label, not a number. The venue has not published
              pricing, so &ldquo;On request&rdquo; is the default and every quote is given in
              conversation.
            </Rule>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
      <span>{children}</span>
    </li>
  );
}
