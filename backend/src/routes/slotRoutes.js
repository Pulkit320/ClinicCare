import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getAvailableSlots, bookSlot, getPatientAppointments } from "../controllers/slotController.js";

const router = express.Router();

router.get('/available', getAvailableSlots);
router.post('/book', authenticateToken, bookSlot);
router.get('/my-appointments', authenticateToken, getPatientAppointments);

export default router;