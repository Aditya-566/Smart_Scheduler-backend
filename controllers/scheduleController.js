import asyncHandler from 'express-async-handler';
import Schedule from '../models/Schedule.js';
import { createManualSchedule, generateAutoSchedule } from '../services/scheduleService.js';
import Department from '../models/Department.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import TimeSlot from '../models/TimeSlot.js';

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private (Admin/Faculty/Student)
export const getSchedules = asyncHandler(async (req, res) => {
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
    
    // Populate and return the full entry
    const populated = await Schedule.findById(schedule._id)
        .populate('course', 'name code')
        .populate('room', 'number type capacity')
        .populate('faculty', 'name email')
        .populate('timeSlot', 'dayOfWeek startTime endTime');
    
    res.status(201).json(populated);
});

// @desc    Update a schedule entry
// @route   PUT /api/schedules/:id
// @access  Private/Admin
export const updateSchedule = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
        res.status(404);
        throw new Error('Schedule entry not found');
    }

    const { course, room, faculty, timeSlot, batchInfo } = req.body;

    // Check for room conflict (excluding self)
    if (room && timeSlot) {
        const roomConflict = await Schedule.findOne({
            room, timeSlot, _id: { $ne: schedule._id }
        });
        if (roomConflict) throw new Error('Room is already booked for this time slot.');
    }

    // Check for faculty conflict (excluding self, only if faculty provided)
    if (faculty && timeSlot) {
        const facultyConflict = await Schedule.findOne({
            faculty, timeSlot, _id: { $ne: schedule._id }
        });
        if (facultyConflict) throw new Error('Faculty is already assigned a class at this time.');
    }

    const updated = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })
        .populate('course', 'name code')
        .populate('room', 'number type capacity')
        .populate('faculty', 'name email')
        .populate('timeSlot', 'dayOfWeek startTime endTime');

    res.json(updated);
});

// @desc    Delete a single schedule entry
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
export const deleteSchedule = asyncHandler(async (req, res) => {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
        res.status(404);
        throw new Error('Schedule entry not found');
    }
    await schedule.deleteOne();
    res.json({ message: 'Schedule entry removed' });
});

// @desc    Clear all schedules
// @route   DELETE /api/schedules/all
// @access  Private/Admin
export const clearSchedules = asyncHandler(async (req, res) => {
    const result = await Schedule.deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} schedule entries` });
});

// @desc    Trigger auto-schedule generation for a department
// @route   POST /api/schedules/generate/:departmentId
// @access  Private/Admin
export const autoGenerateSchedule = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const constraints = req.body;
    
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

// @desc    Get all faculty users
// @route   GET /api/schedules/faculty
// @access  Private/Admin
export const getFaculty = asyncHandler(async (req, res) => {
    const faculty = await User.find({ role: 'FACULTY' }).select('name email department');
    res.json(faculty);
});

// @desc    Get all active time slots
// @route   GET /api/schedules/timeslots
// @access  Private/Admin
export const getTimeSlots = asyncHandler(async (req, res) => {
    const timeSlots = await TimeSlot.find({ isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(timeSlots);
});

// @desc    Get all courses (for schedule dropdowns)
// @route   GET /api/schedules/courses
// @access  Private/Admin
export const getCourses = asyncHandler(async (req, res) => {
    const courses = await Course.find({}).populate('department', 'name code').populate('faculty', 'name email');
    res.json(courses);
});

// @desc    Get dashboard stats
// @route   GET /api/schedules/stats
// @access  Private/Admin
export const getStats = asyncHandler(async (req, res) => {
    const [totalUsers, activeCourses, availableRooms, weeklySlots, totalSchedules] = await Promise.all([
        User.countDocuments({}),
        Course.countDocuments({}),
        Room.countDocuments({}),
        TimeSlot.countDocuments({ isActive: true }),
        Schedule.countDocuments({})
    ]);

    // Calculate room utilization per day (Mon-Fri)
    const schedules = await Schedule.find({}).populate('timeSlot', 'dayOfWeek');
    const roomUtilization = [0, 0, 0, 0, 0]; // Mon-Fri
    const slotsPerDay = {};
    
    schedules.forEach(s => {
        if (s.timeSlot && s.timeSlot.dayOfWeek >= 1 && s.timeSlot.dayOfWeek <= 5) {
            const dayIdx = s.timeSlot.dayOfWeek - 1;
            roomUtilization[dayIdx]++;
        }
    });

    // Calculate utilization percentage (slots used / total possible per day)
    const totalRooms = availableRooms || 1;
    const slotsPerDayCount = weeklySlots > 0 ? Math.round(weeklySlots / 5) : 1;
    const maxSlotsPerDay = totalRooms * slotsPerDayCount;
    
    const utilizationPercent = roomUtilization.map(count => 
        maxSlotsPerDay > 0 ? Math.round((count / maxSlotsPerDay) * 100) : 0
    );

    // Calculate department workload (hours per department)
    const deptWorkload = {};
    const schedulesWithCourse = await Schedule.find({})
        .populate({ path: 'course', populate: { path: 'department', select: 'name' } })
        .populate('timeSlot', 'startTime endTime');
    
    schedulesWithCourse.forEach(s => {
        const deptName = s.course?.department?.name || 'Unknown';
        if (!deptWorkload[deptName]) deptWorkload[deptName] = 0;
        if (s.timeSlot) {
            const [sh, sm] = s.timeSlot.startTime.split(':').map(Number);
            const [eh, em] = s.timeSlot.endTime.split(':').map(Number);
            deptWorkload[deptName] += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }
    });

    res.json({
        totalUsers,
        activeCourses,
        availableRooms,
        weeklySlots,
        totalSchedules,
        utilizationPercent,
        deptWorkload
    });
});
