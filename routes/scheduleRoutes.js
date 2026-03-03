import express from 'express';
import { getSchedules, createSchedule, autoGenerateSchedule } from '../controllers/scheduleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getSchedules);

router.post('/manual', protect, authorize('ADMIN'), createSchedule);
router.post('/generate/:departmentId', protect, authorize('ADMIN'), autoGenerateSchedule);

export default router;
