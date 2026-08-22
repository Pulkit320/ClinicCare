import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getAvailableSlots, bookSlot } from "../controllers/slotController.js";

const router = express.Router();

router.get('/available', getAvailableSlots);
router.post('/book', authenticateToken, bookSlot);

export default router;