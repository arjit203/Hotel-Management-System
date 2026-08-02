"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BedDouble,
  Check,
  ExternalLink,
  Info,
  Monitor,
  PanelLeftClose,
  Server,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useAdminSession } from "@/lib/adminSession";
import { useBusiness, BUSINESS_LABEL } from "@/lib/businessContext";
import { useShellUi } from "@/lib/shellUi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

/**
 * Console settings.
 *
 * Property-level configuration (name, contact, reservation slots, SEO) lives on
 * each property's own page — this page links there rather than duplicating the
 * forms. What it owns is console preferences and the connection details an
 * admin needs when something looks wrong.
 *
 * Nothing here writes to the backend except through the links out.
 */
export default function SettingsPage() {
  const { admin } = useAdminSession();
  const { hotels, restaurants, business, activeProperty } = useBusiness();
  const { sidebarCollapsed, toggleSidebar } = useShellUi();
  const { toastSuccess } = useToast();

  const [copied, setCopied] = useState(false);

  function copyApiUrl() {
    void navigator.clipboard?.writeText(API_BASE_URL);
    setCopied(true);
    toastSuccess("API base URL copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <RequireAdmin>
      <PageHeader
        title="Settings"
        description="Console preferences and where each kind of configuration lives."
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Property configuration */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Property configuration</h2>
              <p className="card-subtitle">Edited on each property, not globally</p>
            </div>
          </div>
          <div className="card-body space-y-3">
            <p className="text-base text-ink-600">
              Name, address, contact details, reservation rules and SEO metadata belong to a
              specific property, because the platform stays multi-tenant even with one property per
              vertical today.
            </p>

            <div className="space-y-2">
              {hotels.map((h) => (
                <Link
                  key={h._id}
                  href={`/hotels/${h._id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    <BedDouble size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-ink-800">
                      {h.name}
                    </span>
                    <span className="block text-xs text-ink-500">Hotel property settings</span>
                  </span>
                  <ExternalLink size={14} className="shrink-0 text-ink-400" />
                </Link>
              ))}

              {restaurants.map((r) => (
                <Link
                  key={r._id}
                  href={`/restaurants/${r._id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    <UtensilsCrossed size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-ink-800">
                      {r.name}
                    </span>
                    <span className="block text-xs text-ink-500">
                      Restaurant property and reservation settings
                    </span>
                  </span>
                  <ExternalLink size={14} className="shrink-0 text-ink-400" />
                </Link>
              ))}

              {hotels.length === 0 && restaurants.length === 0 && (
                <p className="rounded-lg border border-line bg-surface-hover px-3.5 py-3 text-base text-ink-600">
                  No properties yet. Create one from Hotel or Restaurant in the sidebar.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Console preferences */}
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
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                <PanelLeftClose size={12} />
                Change it from the selector at the top of the sidebar.
              </p>
            </div>
          </div>
        </div>

        {/* Connection */}
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
              These come from <span className="font-mono text-xs">NEXT_PUBLIC_API_BASE_URL</span>{" "}
              and <span className="font-mono text-xs">NEXT_PUBLIC_FRONTEND_URL</span> in{" "}
              <span className="font-mono text-xs">admin-panel/.env.local</span>.
            </p>
          </div>
        </div>

        {/* Behaviour notes */}
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
                signature verifies. Marriage Hall, when it exists, will need approval first.
              </Rule>
              <Rule>
                Only the advance percentage is charged up front; the balance is collected at the
                property.
              </Rule>
              <Rule>
                Guests never have to log in. Ownership of a booking is proved by the guest email,
                never by the reference alone.
              </Rule>
              <Rule>
                Deactivating a hotel, room or restaurant is a soft delete, and it is refused while
                dependent active records still exist.
              </Rule>
              <Rule>
                Table reservations take no payment, and there is no online food ordering — that is a
                later phase.
              </Rule>
            </ul>
          </div>
        </div>
      </div>
    </RequireAdmin>
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
