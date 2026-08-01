"use client";

import { useEffect, useState } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi } from "@/lib/api";

interface Booking {
  _id: string;
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
}

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
  "refund_pending",
  "refunded",
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    setLoading(true);
    const query = statusFilter ? `?status=${statusFilter}` : "";
    const res = await adminApi.get<Booking[]>(`/admin/hotels/bookings${query}`);
    if (res.success) setBookings(res.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleStatusChange(bookingId: string, status: string) {
    const res = await adminApi.put(`/admin/hotels/bookings/${bookingId}/status`, { status });
    if (!res.success) {
      alert(res.message);
      return;
    }
    loadBookings();
  }

  return (
    <RequireAdmin>
      <h1>Bookings</h1>

      <label style={{ display: "block", marginBottom: 16 }}>
        Filter by status
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ display: "block", padding: 8, marginTop: 4 }}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Reference</th>
              <th style={th}>Guest</th>
              <th style={th}>Check-in</th>
              <th style={th}>Check-out</th>
              <th style={th}>Amount</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>{b.bookingReference}</td>
                <td style={td}>
                  {b.guestName}
                  <br />
                  <span style={{ fontSize: 12, color: "#888" }}>{b.guestEmail}</span>
                </td>
                <td style={td}>{new Date(b.checkInDate).toDateString()}</td>
                <td style={td}>{new Date(b.checkOutDate).toDateString()}</td>
                <td style={td}>₹{b.totalAmount}</td>
                <td style={td}>
                  <select
                    value={b.status}
                    onChange={(e) => handleStatusChange(b._id, e.target.value)}
                    style={{ padding: 4 }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RequireAdmin>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 8, borderBottom: "2px solid #e5e5e5" };
const td: React.CSSProperties = { padding: 8, verticalAlign: "top" };
