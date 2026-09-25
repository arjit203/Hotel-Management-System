"use client";

import { SectionScopeGuard } from "@/components/layout/PropertyScopeNotice";

/** Out-of-scope roles see an explanation, not an editor the API would refuse. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionScopeGuard business="hotel" title="Hotel properties" what="hotel properties">
      {children}
    </SectionScopeGuard>
  );
}
