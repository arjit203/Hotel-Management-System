import { notFound } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface BookingData {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  numRooms: number;
  totalAmount: number;
  balanceDue: number;
  status: string;
}

async function getBooking(reference: string): Promise<BookingData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/hotel-bookings/reference/${reference}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: { reference: string };
}) {
  const booking = await getBooking(params.reference);
  if (!booking) return notFound();

  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ color: "#1a7f37" }}>✓ Booking Confirmed</h1>
      <p style={{ fontSize: 18 }}>
        Reference: <strong>{booking.bookingReference}</strong>
      </p>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 20,
          textAlign: "left",
          marginTop: 20,
        }}
      >
        <p>
          <strong>Guest:</strong> {booking.guestName}
        </p>
        <p>
          <strong>Check-in:</strong> {new Date(booking.checkInDate).toDateString()}
        </p>
        <p>
          <strong>Check-out:</strong> {new Date(booking.checkOutDate).toDateString()}
        </p>
        <p>
          <strong>Rooms:</strong> {booking.numRooms} · <strong>Guests:</strong> {booking.numGuests}
        </p>
        <p>
          <strong>Total Amount:</strong> ₹{booking.totalAmount}
        </p>
        <p>
          <strong>Status:</strong> {booking.status}
        </p>
      </div>

      <p style={{ marginTop: 20, color: "#666" }}>
        A confirmation email has been sent to {booking.guestEmail}. Please keep your booking
        reference handy at check-in.
      </p>
    </main>
  );
}
