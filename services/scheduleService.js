import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import Course from '../models/Course.js';
import Room from '../models/Room.js';
import TimeSlot from '../models/TimeSlot.js';

export const createManualSchedule = async (scheduleData) => {
    // Conflict detection is largely handled by MongoDB compound unique indexes
    // But we should gracefully handle those errors or check beforehand.
    const { course, room, faculty, timeSlot, batchInfo } = scheduleData;

    // Explicit conflict check
    const existingRoomConflict = await Schedule.findOne({ room, timeSlot });
    if (existingRoomConflict) throw new Error('Room is already booked for this time slot.');

    const existingFacultyConflict = await Schedule.findOne({ faculty, timeSlot });
    if (existingFacultyConflict) throw new Error('Faculty is already assigned a class at this time.');

    const existingBatchConflict = await Schedule.findOne({ batchInfo, timeSlot });
    if (existingBatchConflict) throw new Error('This batch already has a class scheduled at this time.');

    const newSchedule = await Schedule.create(scheduleData);
    return newSchedule;
};

// Greedy auto-scheduling algorithm
export const generateAutoSchedule = async (departmentId) => {
    // Basic implementation:
    // 1. Get all courses for department without schedules or just recreate all
    // 2. Fetch all active timeslots
    // 3. Fetch all rooms
    // 4. Assign linearly

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const courses = await Course.find({ department: departmentId }).session(session);
        const rooms = await Room.find().session(session);
        const timeSlots = await TimeSlot.find({ isActive: true }).session(session);

        const newSchedules = [];

        // Clear existing schedules for this department's courses if needed
        const courseIds = courses.map(c => c._id);
        await Schedule.deleteMany({ course: { $in: courseIds } }).session(session);

        let timeslotIndex = 0;
        let roomIndex = 0;

        for (const course of courses) {
            // Need to schedule course based on credits
            for (let i = 0; i < course.credits; i++) {
                if (timeslotIndex >= timeSlots.length) {
                    throw new Error('Not enough timeslots to accommodate all courses.');
                }

                const slot = timeSlots[timeslotIndex];
                const room = rooms[roomIndex];

                const scheduleData = {
                    course: course._id,
                    room: room._id,
                    faculty: course.faculty, // Assuming auto-assigned or passed
                    timeSlot: slot._id,
                    batchInfo: `Batch-${course.department}` // Simplification
                };

                newSchedules.push(scheduleData);

                roomIndex++;
                if (roomIndex >= rooms.length) {
                    roomIndex = 0;
                    timeslotIndex++;
                }
            }
        }

        const inserted = await Schedule.insertMany(newSchedules, { session });

        await session.commitTransaction();
        session.endSession();

        return inserted;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
