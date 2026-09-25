"use client";

import { SectionScopeGuard } from "@/components/layout/PropertyScopeNotice";

/** Out-of-scope roles see an explanation, not an editor the API would refuse. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionScopeGuard business="hall" title="Marriage Hall venues" what="hall venues, packages and calendars">
      {children}
    </SectionScopeGuard>
  );
}
