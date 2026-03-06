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

// Greedy auto-scheduling algorithm with constraints
export const generateAutoSchedule = async (departmentId, constraints = {}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const courses = await Course.find({ department: departmentId }).session(session);
        
        // Filter rooms based on admin constraints
        let roomQuery = {};
        if (constraints.availableRooms && constraints.availableRooms.length > 0) {
            roomQuery._id = { $in: constraints.availableRooms };
        }
        const rooms = await Room.find(roomQuery).session(session);

        if (rooms.length === 0) {
            throw new Error('No rooms available for scheduling based on provided constraints.');
        }

        const timeSlots = await TimeSlot.find({ isActive: true }).session(session);

        const newSchedules = [];

        // Clear existing schedules for this department's courses
        const courseIds = courses.map(c => c._id);
        await Schedule.deleteMany({ course: { $in: courseIds } }).session(session);

        // Group timeslots by day
        const slotsByDay = {};
        timeSlots.forEach(slot => {
            if (!slotsByDay[slot.dayOfWeek]) {
                slotsByDay[slot.dayOfWeek] = [];
            }
            slotsByDay[slot.dayOfWeek].push(slot);
        });
        
        // Track classes per day to enforce maxClassesPerDay
        const batchClassesPerDay = {}; 
        
        // Track room bookings to prevent overlap in this generation pass: [roomId_timeSlotId]
        const bookedRoomSlots = new Set();
        
        // Track faculty bookings: [facultyId_timeSlotId]
        const bookedFacultySlots = new Set();

        const batchInfo = `Batch-${departmentId}`;

        for (const course of courses) {
            let scheduledCredits = 0;
            const maxPerDay = parseInt(constraints.maxClassesPerDay) || 4; // default to 4 max per day

            // Distribute across days
            const days = Object.keys(slotsByDay);

            for (const day of days) {
                if (scheduledCredits >= course.credits) break;

                batchClassesPerDay[day] = batchClassesPerDay[day] || 0;
                if (batchClassesPerDay[day] >= maxPerDay) continue; // Skip if max classes reached for batch

                const dailySlots = slotsByDay[day];
                
                for (const slot of dailySlots) {
                    if (scheduledCredits >= course.credits) break;
                    if (batchClassesPerDay[day] >= maxPerDay) break;

                    const facultyIdStr = course.faculty ? course.faculty.toString() : 'unassigned';
                    const facultyBookingKey = `${facultyIdStr}_${slot._id}`;
                    if (bookedFacultySlots.has(facultyBookingKey)) continue;

                    // Find first available room
                    let assignedRoom = null;
                    for (const room of rooms) {
                        const roomBookingKey = `${room._id}_${slot._id}`;
                        if (!bookedRoomSlots.has(roomBookingKey)) {
                            assignedRoom = room;
                            bookedRoomSlots.add(roomBookingKey); // Reserve room
                            break;
                        }
                    }

                    if (assignedRoom) {
                        newSchedules.push({
                            course: course._id,
                            room: assignedRoom._id,
                            faculty: course.faculty,
                            timeSlot: slot._id,
                            batchInfo
                        });
                        
                        bookedFacultySlots.add(facultyBookingKey);
                        scheduledCredits++;
                        batchClassesPerDay[day]++;
                    }
                }
            }

            if (scheduledCredits < course.credits) {
                throw new Error(`Constraints too tight: Not enough available slots or rooms to satisfy credits for course: ${course.name}`);
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
