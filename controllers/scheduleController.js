import asyncHandler from 'express-async-handler';
import Schedule from '../models/Schedule.js';
import { createManualSchedule, generateAutoSchedule } from '../services/scheduleService.js';
import Department from '../models/Department.js';
import Room from '../models/Room.js';

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private (Admin/Faculty/Student)
export const getSchedules = asyncHandler(async (req, res) => {
    // Filter by role or query params if needed
    let filter = {};

    // If user is a Faculty, they only see their own schedules
    if (req.user && req.user.role === 'FACULTY') {
        filter.faculty = req.user._id;
    }

    const schedules = await Schedule.find(filter)
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
    const constraints = req.body; // e.g. { availableRooms: [], maxClassesPerDay: 4 }
    
    const result = await generateAutoSchedule(departmentId, constraints);
    res.status(201).json({
        message: 'Auto-scheduling completed successfully',
        count: result.length,
        schedules: result
    });
});

// @desc    Get all departments
// @route   GET /api/schedules/departments
// @access  Private/Admin
export const getDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find({});
    res.json(departments);
});

// @desc    Get all rooms
// @route   GET /api/schedules/rooms
// @access  Private/Admin
export const getRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({});
    res.json(rooms);
});
