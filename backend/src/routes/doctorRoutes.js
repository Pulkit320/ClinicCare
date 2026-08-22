import express from 'express'
import { getAllDoctors, getDocterById, updateDoctorProfile, setDoctorLeave } from '../controllers/doctorController.js'

const router = express.Router();

router.get('/', getAllDoctors);
router.get('/:id', getDocterById);
router.put('/:id', updateDoctorProfile);
router.post('/:doctorId/leave', setDoctorLeave);

export default router;