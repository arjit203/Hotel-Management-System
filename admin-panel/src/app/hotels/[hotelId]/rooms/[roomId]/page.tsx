"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi } from "@/lib/api";

interface AvailabilityOverride {
  _id: string;
  date: string;
  blockedCount: number;
  reason?: string;
}

export default function ManageRoomPage() {
  const params = useParams();
  const hotelId = params.hotelId as string;
  const roomId = params.roomId as string;

  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", blockedCount: "0", reason: "" });

  async function loadOverrides() {
    setLoading(true);
    const res = await adminApi.get<AvailabilityOverride[]>(`/admin/hotels/rooms/${roomId}/availability`);
    if (res.success) setOverrides(res.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function handleSetAvailability(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}/availability`, {
      date: form.date,
      blockedCount: Number(form.blockedCount),
      reason: form.reason || undefined,
    });
    if (!res.success) {
      alert(res.message);
      return;
    }
    setForm({ date: "", blockedCount: "0", reason: "" });
    loadOverrides();
  }

  return (
    <RequireAdmin>
      <p>
        <Link href={`/hotels/${hotelId}`}>← Back to Hotel</Link>
      </p>
      <h1>Manage Room Availability</h1>
      <p style={{ color: "#666" }}>
        Block units of this room category for maintenance/hold on specific dates. Real-time
        bookable availability is automatically computed as: total rooms − blocked − overlapping
        bookings.
      </p>

      <form
        onSubmit={handleSetAvailability}
        style={{ border: "1px solid #e5e5e5", padding: 16, borderRadius: 8, maxWidth: 420, margin: "16px 0" }}
      >
        <label style={{ display: "block", marginBottom: 10 }}>
          Date
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          Blocked Count
          <input
            required
            type="number"
            min={0}
            value={form.blockedCount}
            onChange={(e) => setForm({ ...form, blockedCount: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          Reason (optional)
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6 }}
        >
          Set Availability Override
        </button>
      </form>

      <h3>Current Overrides</h3>
      {loading ? (
        <p>Loading...</p>
      ) : overrides.length === 0 ? (
        <p style={{ color: "#888" }}>No manual overrides set.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Date</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Blocked</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{new Date(o.date).toDateString()}</td>
                <td style={{ padding: 8 }}>{o.blockedCount}</td>
                <td style={{ padding: 8 }}>{o.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RequireAdmin>
  );
}
