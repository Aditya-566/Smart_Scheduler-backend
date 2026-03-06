import express from 'express';
import { getSchedules, createSchedule, autoGenerateSchedule, getDepartments, getRooms, getStats } from '../controllers/scheduleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getSchedules);

router.get('/stats', protect, authorize('ADMIN'), getStats);
router.get('/departments', protect, authorize('ADMIN'), getDepartments);
router.get('/rooms', protect, authorize('ADMIN'), getRooms);
router.post('/manual', protect, authorize('ADMIN'), createSchedule);
router.post('/generate/:departmentId', protect, authorize('ADMIN'), autoGenerateSchedule);

export default router;
