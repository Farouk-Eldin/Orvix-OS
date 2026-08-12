import { eventBus } from "@/lib/events/event-bus";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { scheduleBookingReminders, cancelBookingReminders } from "@/lib/queue/booking-reminder.queue";

export function registerBookingReminderListeners() {
  eventBus.onEvent("AppointmentCreated", async ({ appointmentId }) => {
    const booking = await bookingRepository.findByIdWithDetails(appointmentId);
    if (!booking || booking.status === "CANCELLED") return;
    await scheduleBookingReminders(booking.id, booking.startAt);
  });

  eventBus.onEvent("BookingStatusChanged", async ({ bookingId, status }) => {
    if (status === "CANCELLED" || status === "COMPLETED") {
      await cancelBookingReminders(bookingId);
    }
  });
}
