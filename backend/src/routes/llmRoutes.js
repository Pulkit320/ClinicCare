import express from 'express'
import { createPreVisitSummary, createPostVisitSummary } from '../controllers/llmController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/pre-visit", authenticateToken, createPreVisitSummary);
router.post("/post-visit", authenticateToken, requireRole('DOCTOR', 'ADMIN'), createPostVisitSummary);

export default router;    