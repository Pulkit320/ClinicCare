import prisma from "../config/db.js";
import { generateTimeSlots } from "../utils/slotGenerator.js";
import { createGoogleCalendarEvent } from "../services/calendarService.js";
import { sendBookingConfirmationEmail } from "../services/emailService.js";

export const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date) {
            return res.status(400).json({
                message: "doctorId and date are required"
            });
        }

        const doctor = await prisma.doctorProfile.findUnique({
            where: { id: parseInt(doctorId) }
        });

        if (!doctor) return res.status(404).json({
            message: "Doctor not found"
        });

        const leaveDays = JSON.parse(doctor.leaveDays || "[]");
        if (leaveDays.includes(date)) {
            return res.json({
                doctorOnLeave: true,
                slots: [],
                message: "Doctor is on leave on this date"
            });
        }

        const theoreticalSlots = generateTimeSlots(
            doctor.workingHours,
            doctor.slotDuration
        );
        const existingSlots = await prisma.slot.findMany({
            where: { doctorId: parseInt(doctorId), date: date }
        });

        const slotMap = new Map(existingSlots.map(s => [s.startTime, s]));

        const now = new Date();
        const availableSlots = theoreticalSlots.map(ts => {
            const dbSlot = slotMap.get(ts.startTime);
            let isBooked = false;
            let isHeld = false;

            if (dbSlot) {
                isBooked = dbSlot.isBooked;
                if (dbSlot.holdUntil && new Date(dbSlot.holdUntil) > now && !isBooked) {
                    isHeld = true;
                }
            }

            return {
                id: dbSlot ? dbSlot.id : null,
                date,
                startTime: ts.startTime,
                endTime: ts.endTime,
                isBooked: isBooked || isHeld,
                isAvailable: !isBooked && !isHeld
            };
        });

        return res.json({ doctorOnLeave: false, slots: availableSlots });
    } catch (error) {
        console.error("Get Slots Error: ", error);
        res.status(500).json({ message: error.message });
    }
};

export const bookSlot = async (req, res) => {
    try {
        const { doctorId, date, startTime, endTime, symptoms } = req.body;
        const patientId = req.user.id;

        if (!doctorId || !date || !startTime || !endTime || !symptoms || !symptoms.trim()) {
            return res.status(400).json({
                message: "doctorId, date, startTime, endTime and valid symptoms are required"
            });
        }
        const result = await prisma.$transaction(async (tx) => {
            const doctor = await tx.doctorProfile.findUnique({
                where: { id: parseInt(doctorId) }
            });

            const leaveDays = JSON.parse(doctor.leaveDays || "[]");
            if (leaveDays.includes(date)) {
                throw new Error("DOCTOR_ON_LEAVE");
            }
            let slot = await tx.slot.findFirst({
                where: {
                    doctorId: parseInt(doctorId),
                    date,
                    startTime
                }
            });
            if (!slot) {
                slot = await tx.slot.create({
                    data: {
                        doctorId: parseInt(doctorId),
                        date,
                        startTime,
                        endTime
                    }
                });
            }
            if (slot.isBooked) {
                throw new Error("SLOT_ALREADY_BOOKED");
            }
            const updatedSlot = await tx.slot.update({
                where: { id: slot.id },
                data: { isBooked: true }
            });

            const appointment = await tx.appointment.create({
                data: {
                    patientId,
                    doctorId: parseInt(doctorId),
                    slotId: updatedSlot.id,
                    symptoms,
                    status: "CONFIRM"
                },
                include: {
                    slot: true,
                    doctor: { include: { user: { select: { name: true, email: true } } } },
                    patient: { select: { name: true, email: true } }
                }
            });
            return appointment;
        });

        // Trigger Google Calendar Sync & Confirmation Email Async
        try {
            const doctorName = result.doctor?.user?.name || "Doctor";
            const patientName = result.patient?.name || "Patient";
            const patientEmail = result.patient?.email || req.user.email;

            // 1. Google Calendar Event
            const gcalEventId = await createGoogleCalendarEvent({
                doctorName,
                patientName,
                patientEmail,
                date: result.slot.date,
                startTime: result.slot.startTime,
                endTime: result.slot.endTime,
                symptoms: result.symptoms
            });

            if (gcalEventId && !gcalEventId.startsWith('mock_')) {
                await prisma.appointment.update({
                    where: { id: result.id },
                    data: { gcalEventId }
                });
            }

            // 2. Email Notification
            if (patientEmail) {
                sendBookingConfirmationEmail({
                    patientEmail,
                    patientName,
                    doctorName,
                    date: result.slot.date,
                    startTime: result.slot.startTime,
                    endTime: result.slot.endTime
                });
            }
        } catch (syncErr) {
            console.error("GCal/Email Sync Warning:", syncErr);
        }

        res.status(201).json({ message: "Appointment booked successfully", appointment: result });
    }
    catch (error) {
        if (error.message === "SLOT_ALREADY_BOOKED") {
            return res.status(409).json({ message: "This slot was just booked. Please refresh and try again." })
        }
        if (error.message === "DOCTOR_ON_LEAVE") {
            return res.status(400).json({ message: "Doctor is on leave on this date." })
        }
        console.error("Error Booking Appointment: ", error);
        return res.status(500).json({ message: "Error Booking" });
    }
};

export const getPatientAppointments = async (req, res) => {
    try {
        const patientId = req.user.id;
        const appointments = await prisma.appointment.findMany({
            where: { patientId },
            include: {
                slot: true,
                doctor: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                },
                llmSummaries: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(appointments);
    } catch (error) {
        console.error("Error fetching patient appointments:", error);
        res.status(500).json({ message: error.message });
    }
};