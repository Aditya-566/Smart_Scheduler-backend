import express from 'express';
import { getTimeSlots, createTimeSlot, seedTimeSlots, deleteTimeSlot } from '../controllers/timeslotController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getTimeSlots)
    .post(protect, authorize('ADMIN'), createTimeSlot);

router.post('/seed', protect, authorize('ADMIN'), seedTimeSlots);

router.route('/:id')
    .delete(protect, authorize('ADMIN'), deleteTimeSlot);

export default router;
