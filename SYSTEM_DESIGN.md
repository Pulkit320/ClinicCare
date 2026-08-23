# 📐 System Design Write-Up: ClinicCare Architecture

This document details the architectural strategies, concurrency guarantees, fault tolerance mechanisms, and background jobs powering the **ClinicCare** platform.

---

## 1. Double-Booking Prevention & Concurrency Control

In healthcare scheduling systems, double-booking a single time slot creates operational chaos. ClinicCare prevents double-booking using **PostgreSQL ACID Database Transactions** combined with **Pessimistic Row-Level Locking** inside Prisma ORM (`prisma.$transaction`).

### Architectural Workflow:
1. **Atomic Transaction Scope**: When a patient submits a booking request (`POST /api/slots/book`), all database queries execute inside a single transaction scope (`tx`).
2. **Leave Check Guard**: The transaction first verifies if the target doctor has recorded a leave day for the requested date. If true, it immediately aborts with `DOCTOR_ON_LEAVE`.
3. **Slot Existence & Lock**: The system queries `tx.slot.findFirst({ where: { doctorId, date, startTime } })`. If no slot row exists, it is created dynamically.
4. **State Verification**: If `slot.isBooked === true`, the transaction throws a custom `SLOT_ALREADY_BOOKED` exception, triggering an immediate `409 Conflict` HTTP response to the client.
5. **Atomic State Mutation**: The slot is updated (`tx.slot.update({ data: { isBooked: true } })`) and the appointment record is created within the exact same atomic transaction block. If any step fails, database state rolls back completely with zero side effects.

---

## 2. Doctor Leave Conflict Handling & Cascade Cancellations

When a doctor schedules leave (`POST /api/doctors/:id/leave`), any existing patient appointments booked on that date must be automatically resolved and cancelled to maintain data integrity.

### Conflict Resolution Strategy:
1. **Leave Array Append**: The doctor's `leaveDays` JSON string array in `DoctorProfile` is updated with the target date (e.g., `["2026-08-27"]`).
2. **Cascade Appointment Query**: The system queries all active appointments (`status: "CONFIRM"`) matching the `doctorId` and `date`.
3. **Bulk Status Mutation**: Matching appointments are updated to `status: "CANCELLED"` in a single database operation.
4. **Asynchronous Patient Alert Dispatch**: For each cancelled appointment, the system triggers an asynchronous cancellation email via `sendCancellationEmail({ patientEmail, patientName, date, slotTime, reason })`.
5. **Slot Availability Lockout**: Subsequent queries to `GET /api/slots/available` evaluate `leaveDays.includes(date)` and return `doctorOnLeave: true`, automatically disabling all time slots for that day on the patient portal.

---

## 3. Slot Hold & Temporary Reservation Mechanism

To prevent two patients from selecting the same time slot simultaneously while filling out symptom details, ClinicCare incorporates a **Temporary Slot Hold Mechanism**.

### Hold & Timeout Architecture:
1. **Temporary Reservation (`holdUntil`)**: The `Slot` model contains a nullable `holdUntil` timestamp column.
2. **Hold Acquisition**: When a patient selects a time slot, `holdUntil` is populated with `now() + 5 minutes`.
3. **Availability Evaluation**: During `getAvailableSlots`, a slot is evaluated as unavailable if:
   $$\text{isBooked} \lor (\text{holdUntil} > \text{now()})$$
4. **Automatic Expiration**: If the patient abandons the booking screen or fails to submit within 5 minutes, `new Date(dbSlot.holdUntil) > now` evaluates to `false`. The slot automatically reverts to `isAvailable: true` without requiring manual database cleanup cron jobs.

---

## 4. Notification & Third-Party Integration Failure Handling

ClinicCare integrates with external third-party APIs (**Google Calendar API**, **Google Gemini AI**, and **Nodemailer SMTP**). External networks can experience latency or outages; therefore, notification and AI processes are completely decoupled from core database booking logic.

### Fault-Tolerant Async Pipeline:
1. **Decoupled Execution**: The primary HTTP request (`bookSlot`) returns `201 Created` as soon as the database transaction completes successfully.
2. **Google Calendar Fallback**: If Google Calendar credentials are missing or the API returns an error, `calendarService.js` catches the exception gracefully, logs a warning notice, and returns a synthetic fallback ID (`mock_gcal_event-TIMESTAMP`). The appointment booking remains 100% successful.
3. **Email Dispatch Safety**: Email sending (`sendBookingConfirmationEmail`) runs inside a non-blocking `try/catch` block. If SMTP credentials fail or time out, the system catches the error, logs the event, and ensures the HTTP API response is never delayed or interrupted.
4. **AI Triage Graceful Degradation**: If Gemini API quota limits are reached, `generatePreVisitSummary` catches the exception and returns a pre-configured, structured fallback response (`urgency: "MEDIUM"`), guaranteeing that patients and doctors can always view clinical records.
