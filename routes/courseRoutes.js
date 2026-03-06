import express from 'express';
import { getCourses, getCourse, createCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getCourses)
    .post(protect, authorize('ADMIN'), createCourse);

router.route('/:id')
    .get(protect, getCourse)
    .put(protect, authorize('ADMIN'), updateCourse)
    .delete(protect, authorize('ADMIN'), deleteCourse);

export default router;
