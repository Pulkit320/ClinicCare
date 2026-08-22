import prisma from "../config/db.js";
import { generatePreVisitSummary, generatePostVisitSummary } from "../services/llmService.js";

export const createPreVisitSummary = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const apptId = parseInt(appointmentId);

        if (isNaN(apptId)) {
            return res.status(400).json({ message: "Invalid or missing appointment ID" });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: apptId }
        });

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        const aiResult = await generatePreVisitSummary(appointment.symptoms);

        const summary = await prisma.lLMSummary.create({
            data: {
                appointmentId: appointment.id,
                type: "PRE_VISIT",
                urgency: aiResult.urgency,
                content: JSON.stringify(aiResult)
            }
        });
        res.status(201).json({
            message: "Pre-visit summary generated successfully", summary,
            data: aiResult
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message })
    }
};

export const createPostVisitSummary = async (req, res) => {
    try {
        const { appointmentId, clinicalNotes } = req.body;
        const apptId = parseInt(appointmentId);

        if (isNaN(apptId) || !clinicalNotes) {
            return res.status(400).json({ message: "Please provide valid appointment ID and clinical notes" });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: apptId }
        });

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        const aiResult = await generatePostVisitSummary(clinicalNotes);

        const summary = await prisma.lLMSummary.create({
            data: {
                appointmentId: parseInt(appointmentId),
                type: "POST_VISIT",
                content: JSON.stringify(aiResult)
            }
        })

        await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: "COMPLETED" }
        });
        res.status(201).json({
            message: "Post-visit summary and appointment waas completed",
            summary,
            data: aiResult
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};   