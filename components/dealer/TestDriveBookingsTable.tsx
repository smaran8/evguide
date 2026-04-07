import AdminTestDriveForwardButton from "@/components/AdminTestDriveForwardButton";
import type { TestDriveBookingRow } from "@/types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<TestDriveBookingRow["status"], string> = {
  requested: "bg-blue-50 text-blue-700",
  reviewing: "bg-amber-50 text-amber-700",
  scheduled: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-50 text-rose-700",
};

export default function TestDriveBookingsTable({
  bookings,
  title = "Test Drive Bookings",
}: {
  bookings: TestDriveBookingRow[];
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-10 text-sm text-slate-500">No test-drive bookings yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Requested Slot</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Dealer Forward</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{booking.full_name}</p>
                    <p className="text-xs text-slate-500">{booking.email}</p>
                    <p className="text-xs text-slate-500">{booking.phone}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{booking.ev_model_label ?? "-"}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {booking.preferred_date} at {booking.preferred_time_slot}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <p>{booking.preferred_location}</p>
                    {booking.current_vehicle && (
                      <p className="mt-1 text-xs text-slate-500">Current: {booking.current_vehicle}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(booking.created_at)}</td>
                  <td className="px-4 py-4 align-top">
                    <AdminTestDriveForwardButton
                      id={booking.id}
                      vehicleLabel={booking.ev_model_label}
                      customerName={booking.full_name}
                      customerEmail={booking.email}
                      location={booking.preferred_location}
                      preferredDate={booking.preferred_date}
                      preferredTimeSlot={booking.preferred_time_slot}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
