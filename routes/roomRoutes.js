import express from 'express';
import { getRooms, getRoom, createRoom, updateRoom, deleteRoom } from '../controllers/roomController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getRooms)
    .post(protect, authorize('ADMIN'), createRoom);

router.route('/:id')
    .get(protect, getRoom)
    .put(protect, authorize('ADMIN'), updateRoom)
    .delete(protect, authorize('ADMIN'), deleteRoom);

export default router;
