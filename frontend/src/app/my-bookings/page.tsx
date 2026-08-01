"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getUserToken, getStoredUser } from "@/lib/userAuth";
import CancelBookingButton from "@/modules/hotel/components/CancelBookingButton";

interface BookingData {
  _id: string;
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rooms: { roomName: string; numRooms: number }[];
  totalAmount: number;
  status: string;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);

  async function load() {
    const token = getUserToken();
    if (!token || !getStoredUser()) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    const res = await api.get<BookingData[]>("/hotel-bookings/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.success && res.data) setBookings(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <main style={{ padding: "2rem" }}>Loading...</main>;

  if (!loggedIn) {
    return (
      <main style={{ padding: "2rem", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h1>My Bookings</h1>
        <p>
          Please <Link href="/login">log in</Link> to view your bookings.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      <h1>My Bookings</h1>

      {bookings.length === 0 ? (
        <p style={{ color: "#888" }}>You have no bookings yet.</p>
      ) : (
        bookings.map((b) => (
          <div key={b._id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <p>
              <strong>Reference:</strong> {b.bookingReference}
            </p>
            <p>
              <strong>Check-in:</strong> {new Date(b.checkInDate).toDateString()} &nbsp;
              <strong>Check-out:</strong> {new Date(b.checkOutDate).toDateString()}
            </p>
            <p>
              <strong>Rooms:</strong> {b.rooms.map((r) => `${r.numRooms} × ${r.roomName}`).join(", ")} &nbsp;
              <strong>Guests:</strong> {b.numGuests} &nbsp;
              <strong>Total:</strong> ₹{b.totalAmount}
            </p>
            <p>
              <strong>Status:</strong> {b.status}
            </p>
            {["pending", "confirmed"].includes(b.status) && new Date(b.checkInDate) > new Date() && (
              <CancelBookingButton
                bookingReference={b.bookingReference}
                requireEmailPrompt={false}
                onCancelled={load}
              />
            )}
          </div>
        ))
      )}
    </main>
  );
}
