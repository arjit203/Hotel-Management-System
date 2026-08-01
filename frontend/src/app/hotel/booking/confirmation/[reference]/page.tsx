import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import CancelBookingButton from "@/modules/hotel/components/CancelBookingButton";
import Breadcrumbs from "@/components/Breadcrumbs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface BookingData {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rooms: { roomName: string; categoryName: string; numRooms: number; pricePerNight: number; subtotal: number }[];
  totalAmount: number;
  balanceDue: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  checked_in: "bg-blue-100 text-blue-700",
  checked_out: "bg-slate-100 text-slate-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  refund_pending: "bg-amber-100 text-amber-700",
  refunded: "bg-green-100 text-green-700",
};

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
    <main className="mx-auto max-w-xl px-5 sm:px-8 py-16 text-center">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Booking", href: "/hotel/booking" }, { label: "Confirmation" }]}
      />
      <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
      <h1 className="font-display text-3xl text-ink">Booking Confirmed</h1>
      <p className="text-ink/60 mt-2">
        Reference: <strong className="text-ink">{booking.bookingReference}</strong>
      </p>

      <div className="bg-white rounded-2xl shadow-luxury border border-ink/5 p-6 text-left mt-8 space-y-2 text-sm">
        <p><strong className="text-ink">Guest:</strong> <span className="text-ink/70">{booking.guestName}</span></p>
        <p><strong className="text-ink">Check-in:</strong> <span className="text-ink/70">{new Date(booking.checkInDate).toDateString()}</span></p>
        <p><strong className="text-ink">Check-out:</strong> <span className="text-ink/70">{new Date(booking.checkOutDate).toDateString()}</span></p>
        <div>
          <strong className="text-ink">Rooms:</strong>
          <ul className="mt-1 ml-4 list-disc text-ink/70">
            {booking.rooms.map((r, i) => (
              <li key={i}>{r.numRooms} × {r.roomName} (₹{r.pricePerNight}/night)</li>
            ))}
          </ul>
        </div>
        <p><strong className="text-ink">Guests:</strong> <span className="text-ink/70">{booking.numGuests}</span></p>
        <p><strong className="text-ink">Total Amount:</strong> <span className="text-ink/70">₹{booking.totalAmount}</span></p>
        <p className="flex items-center gap-2">
          <strong className="text-ink">Status:</strong>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[booking.status] || "bg-ink/10 text-ink/60"}`}>
            {booking.status.replace("_", " ")}
          </span>
        </p>
      </div>

      <p className="text-ink/50 text-sm mt-6">
        A confirmation email has been sent to {booking.guestEmail}. Please keep your booking reference
        handy at check-in.
      </p>

      {["pending", "confirmed"].includes(booking.status) &&
        new Date(booking.checkInDate) > new Date() && (
          <div className="mt-6">
            <CancelBookingButton bookingReference={booking.bookingReference} requireEmailPrompt={true} />
          </div>
        )}
    </main>
  );
}
