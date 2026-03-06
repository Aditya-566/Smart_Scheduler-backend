import asyncHandler from 'express-async-handler';
import Course from '../models/Course.js';

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
export const getCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find({})
        .populate('department', 'name code')
        .populate('faculty', 'name email');
    res.json(courses);
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
export const getCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .populate('department', 'name code')
        .populate('faculty', 'name email');
    if (course) {
        res.json(course);
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = asyncHandler(async (req, res) => {
    const { name, code, department, credits, faculty } = req.body;

    const courseExists = await Course.findOne({ code: code.toUpperCase() });
    if (courseExists) {
        res.status(400);
        throw new Error('Course with this code already exists');
    }

    const course = await Course.create({
        name,
        code,
        department,
        credits,
        faculty
    });

    res.status(201).json(course);
});

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.json(updated);
});

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
export const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    await course.deleteOne();
    res.json({ message: 'Course removed' });
});
