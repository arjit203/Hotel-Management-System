"use client";

import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <Link
          href="/hotels"
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 20,
            textDecoration: "none",
            color: "inherit",
            width: 220,
          }}
        >
          <h3 style={{ margin: 0 }}>Hotel Management</h3>
          <p style={{ color: "#666", fontSize: 14 }}>
            Hotels, rooms, availability, offers, gallery, FAQs
          </p>
        </Link>
        <Link
          href="/bookings"
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 20,
            textDecoration: "none",
            color: "inherit",
            width: 220,
          }}
        >
          <h3 style={{ margin: 0 }}>Bookings</h3>
          <p style={{ color: "#666", fontSize: 14 }}>View and manage all hotel bookings</p>
        </Link>
      </div>
    </RequireAdmin>
  );
}
