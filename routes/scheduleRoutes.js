import express from 'express';
import {
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    clearSchedules,
    autoGenerateSchedule,
    getDepartments,
    getRooms,
    getFaculty,
    getTimeSlots,
    getCourses,
    getStats
} from '../controllers/scheduleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getSchedules);

// Specific routes MUST come before /:id routes
router.get('/stats', protect, authorize('ADMIN'), getStats);
router.get('/departments', protect, authorize('ADMIN'), getDepartments);
router.get('/rooms', protect, authorize('ADMIN'), getRooms);
router.get('/faculty', protect, authorize('ADMIN'), getFaculty);
router.get('/timeslots', protect, authorize('ADMIN'), getTimeSlots);
router.get('/courses', protect, authorize('ADMIN'), getCourses);

router.post('/manual', protect, authorize('ADMIN'), createSchedule);
router.post('/generate/:departmentId', protect, authorize('ADMIN'), autoGenerateSchedule);

router.delete('/all', protect, authorize('ADMIN'), clearSchedules);

router.route('/:id')
    .put(protect, authorize('ADMIN'), updateSchedule)
    .delete(protect, authorize('ADMIN'), deleteSchedule);

export default router;
