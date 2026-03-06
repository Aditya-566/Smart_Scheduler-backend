import asyncHandler from 'express-async-handler';
import TimeSlot from '../models/TimeSlot.js';

// @desc    Get all time slots
// @route   GET /api/timeslots
// @access  Private
export const getTimeSlots = asyncHandler(async (req, res) => {
    const timeSlots = await TimeSlot.find({}).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(timeSlots);
});

// @desc    Create a time slot
// @route   POST /api/timeslots
// @access  Private/Admin
export const createTimeSlot = asyncHandler(async (req, res) => {
    const { dayOfWeek, startTime, endTime } = req.body;

    const exists = await TimeSlot.findOne({ dayOfWeek, startTime, endTime });
    if (exists) {
        res.status(400);
        throw new Error('This time slot already exists');
    }

    const timeSlot = await TimeSlot.create({ dayOfWeek, startTime, endTime });
    res.status(201).json(timeSlot);
});

// @desc    Seed default time slots (Mon-Fri, 08:00-17:00 hourly)
// @route   POST /api/timeslots/seed
// @access  Private/Admin
export const seedTimeSlots = asyncHandler(async (req, res) => {
    const existing = await TimeSlot.countDocuments();
    if (existing > 0) {
        res.status(400);
        throw new Error('Time slots already exist. Delete them first if you want to re-seed.');
    }

    const slots = [];
    for (let day = 1; day <= 5; day++) { // Mon-Fri
        for (let hour = 8; hour < 17; hour++) {
            slots.push({
                dayOfWeek: day,
                startTime: `${String(hour).padStart(2, '0')}:00`,
                endTime: `${String(hour + 1).padStart(2, '0')}:00`,
                isActive: true
            });
        }
    }

    const inserted = await TimeSlot.insertMany(slots);
    res.status(201).json({
        message: `Seeded ${inserted.length} time slots (Mon-Fri, 08:00-17:00)`,
        count: inserted.length
    });
});

// @desc    Delete a time slot
// @route   DELETE /api/timeslots/:id
// @access  Private/Admin
export const deleteTimeSlot = asyncHandler(async (req, res) => {
    const slot = await TimeSlot.findById(req.params.id);
    if (!slot) {
        res.status(404);
        throw new Error('Time slot not found');
    }
    await slot.deleteOne();
    res.json({ message: 'Time slot removed' });
});
