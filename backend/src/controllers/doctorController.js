import prisma from "../config/db.js";

export const getAllDoctors = async (req, res) => {
    try {
        const doctors = await prisma.doctorProfile.findMany({
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        })
        res.json(doctors);
    }
    catch (error) {
        console.log("Error in getAllDoctors", error);
        res.status(500).json({ message: error.message });
    }
};

export const getDocterById = async (req, res) => {
    try {
        const doctorId = parseInt(req.params.id);
        const doctor = await prisma.doctorProfile.findUnique({
            where: { id: doctorId },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" })
        }
        res.json(doctor);
    }
    catch (error) {
        console.log("Error in getDocterById", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateDoctorProfile = async (req, res) => {
    try {
        const doctorId = parseInt(req.params.id);
        const { specialization, workingHours, slotDuration } = req.body;

        const updatedDoctor = await prisma.doctorProfile.update({
            where: { id: doctorId },
            data: {
                ...(specialization && { specialization }),
                ...(workingHours && { workingHours }),
                ...(slotDuration && { slotDuration: parseInt(slotDuration) })
            }
        });

        res.json(updatedDoctor);
    }
    catch (error) {
        console.log("Error in updateDoctorProfile", error);
        res.status(500).json({ message: error.message });
    }
};

export const setDoctorLeave = async (req, res) => {
    try {
        const doctorId = parseInt(req.params.doctorId);
        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ message: "Date is required." })
        }
        const doctor = await prisma.doctorProfile.findUnique({
            where: { id: doctorId }
        });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found." })
        }

        let leaveDays = [];
        try {
            leaveDays = JSON.parse(doctor.leaveDays || "[]");
        }
        catch (e) {
            leaveDays = [];
        }
        if (!leaveDays.includes(date)) {
            leaveDays.push(date);
        }
        await prisma.doctorProfile.update({
            where: { id: doctorId },
            data: { leaveDays: JSON.stringify(leaveDays) }
        });

        const affectedAppointments = await prisma.appointment.findMany({
            where: {
                doctorId,
                status: "CONFIRMED",
                slot: { date: date },
            },
            include: {
                patient: { select: { name: true, email: true } },
                slot: true
            }
        });

        if (affectedAppointments.length > 0) {
            const appointmentIds = affectedAppointments.map(a => a.id);
            await prisma.appointment.updateMany({
                where: {
                    id: { in: appointmentIds }
                },
                data: {
                    status: "CANCELLED"
                }
            });

            res.json({
                message: `Leave recorded for date ${date}. Cancelled ${affectedAppointments.length} appointments`,
                affectedCount: affectedAppointments.length,
                affectedAppointments: affectedAppointments.map(a => ({
                    appointmentId: a.id,
                    patientName: a.patient.name,
                    patientEmail: a.patient.email,
                    slotTime: a.slot.startTime
                }))
            })
        }
    }
    catch (error) {
        console.log("Error in setDoctorLeave", error);
        res.status(500).json({ message: error.message });
    }
}
