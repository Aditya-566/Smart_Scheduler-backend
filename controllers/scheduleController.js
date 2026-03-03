import asyncHandler from 'express-async-handler';
import Schedule from '../models/Schedule.js';
import { createManualSchedule, generateAutoSchedule } from '../services/scheduleService.js';

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private (Admin/Faculty/Student)
export const getSchedules = asyncHandler(async (req, res) => {
    // Filter by role or query params if needed
    const schedules = await Schedule.find()
        .populate('course', 'name code')
        .populate('room', 'number type capacity')
        .populate('faculty', 'name email')
        .populate('timeSlot', 'dayOfWeek startTime endTime');

    res.json(schedules);
});

// @desc    Create a manual schedule
// @route   POST /api/schedules/manual
// @access  Private/Admin
export const createSchedule = asyncHandler(async (req, res) => {
    const schedule = await createManualSchedule(req.body);
    res.status(201).json(schedule);
});

// @desc    Trigger auto-schedule generation for a department
// @route   POST /api/schedules/generate/:departmentId
// @access  Private/Admin
export const autoGenerateSchedule = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const result = await generateAutoSchedule(departmentId);
    res.status(201).json({
        message: 'Auto-scheduling completed successfully',
        count: result.length,
        schedules: result
    });
});
