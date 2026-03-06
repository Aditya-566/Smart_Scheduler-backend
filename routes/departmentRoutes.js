import express from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getDepartments)
    .post(protect, authorize('ADMIN'), createDepartment);

router.route('/:id')
    .delete(protect, authorize('ADMIN'), deleteDepartment);

export default router;
