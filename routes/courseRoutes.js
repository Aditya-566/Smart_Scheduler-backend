import express from 'express';
import { getCourses, getCourse, createCourse, updateCourse, deleteCourse, getMyFacultyCourses } from '../controllers/courseController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getCourses)
    .post(protect, authorize('ADMIN'), createCourse);

// Faculty-specific route - must come before /:id
router.get('/faculty/my-courses', protect, authorize('FACULTY'), getMyFacultyCourses);

router.route('/:id')
    .get(protect, getCourse)
    .put(protect, authorize('ADMIN'), updateCourse)
    .delete(protect, authorize('ADMIN'), deleteCourse);

export default router;
