import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import Course from '../models/Course.js';
import Room from '../models/Room.js';
import TimeSlot from '../models/TimeSlot.js';

export const createManualSchedule = async (scheduleData) => {
    const { course, room, faculty, timeSlot, batchInfo } = scheduleData;

    // Explicit conflict check: room double-booking
    const existingRoomConflict = await Schedule.findOne({ room, timeSlot });
    if (existingRoomConflict) throw new Error('Room is already booked for this time slot.');

    // Faculty conflict check (only if faculty is provided)
    if (faculty) {
        const existingFacultyConflict = await Schedule.findOne({ faculty, timeSlot });
        if (existingFacultyConflict) throw new Error('Faculty is already assigned a class at this time.');
    }

    // Batch conflict check
    const existingBatchConflict = await Schedule.findOne({ batchInfo, timeSlot });
    if (existingBatchConflict) throw new Error('This batch already has a class scheduled at this time.');

    const payload = { course, room, timeSlot, batchInfo };
    if (faculty) payload.faculty = faculty;

    const newSchedule = await Schedule.create(payload);
    return newSchedule;
};

// Greedy auto-scheduling algorithm with constraints
export const generateAutoSchedule = async (departmentId, constraints = {}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const courses = await Course.find({ department: departmentId }).populate('faculty').session(session);

        if (courses.length === 0) {
            throw new Error('No courses found for this department. Add courses first.');
        }

        // Filter rooms based on admin constraints
        let roomQuery = {};
        if (constraints.availableRooms && constraints.availableRooms.length > 0) {
            roomQuery._id = { $in: constraints.availableRooms };
        }
        const rooms = await Room.find(roomQuery).session(session);

        if (rooms.length === 0) {
            throw new Error('No rooms available for scheduling. Add rooms or adjust constraints.');
        }

        const timeSlots = await TimeSlot.find({ isActive: true }).sort({ dayOfWeek: 1, startTime: 1 }).session(session);

        if (timeSlots.length === 0) {
            throw new Error('No time slots configured. Go to Settings and seed default time slots first.');
        }

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
        
        // Track classes per day to enforce maxClassesPerDay per batch
        const batchClassesPerDay = {}; 
        
        // Track room bookings: roomId_timeSlotId
        const bookedRoomSlots = new Set();
        
        // Track faculty bookings: facultyId_timeSlotId
        const bookedFacultySlots = new Set();

        // Use batchInfo from constraints or generate from department
        const batchInfo = constraints.batchInfo || `Dept-${departmentId}`;

        for (const course of courses) {
            let scheduledCredits = 0;
            const maxPerDay = parseInt(constraints.maxClassesPerDay) || 4;

            // Distribute across days
            const days = Object.keys(slotsByDay);

            for (const day of days) {
                if (scheduledCredits >= course.credits) break;

                const dayKey = `${batchInfo}_${day}`;
                batchClassesPerDay[dayKey] = batchClassesPerDay[dayKey] || 0;
                if (batchClassesPerDay[dayKey] >= maxPerDay) continue;

                const dailySlots = slotsByDay[day];
                
                for (const slot of dailySlots) {
                    if (scheduledCredits >= course.credits) break;
                    if (batchClassesPerDay[dayKey] >= maxPerDay) break;

                    // Faculty conflict check (only for courses with assigned faculty)
                    const hasFaculty = course.faculty && course.faculty._id;
                    if (hasFaculty) {
                        const facultyIdStr = course.faculty._id.toString();
                        const facultyBookingKey = `${facultyIdStr}_${slot._id}`;
                        if (bookedFacultySlots.has(facultyBookingKey)) continue;
                    }

                    // Find first available room
                    let assignedRoom = null;
                    for (const room of rooms) {
                        const roomBookingKey = `${room._id}_${slot._id}`;
                        if (!bookedRoomSlots.has(roomBookingKey)) {
                            assignedRoom = room;
                            bookedRoomSlots.add(roomBookingKey);
                            break;
                        }
                    }

                    if (assignedRoom) {
                        const scheduleEntry = {
                            course: course._id,
                            room: assignedRoom._id,
                            timeSlot: slot._id,
                            batchInfo
                        };

                        // Only set faculty if the course has one assigned
                        if (hasFaculty) {
                            scheduleEntry.faculty = course.faculty._id;
                            const facultyIdStr = course.faculty._id.toString();
                            bookedFacultySlots.add(`${facultyIdStr}_${slot._id}`);
                        }

                        newSchedules.push(scheduleEntry);
                        scheduledCredits++;
                        batchClassesPerDay[dayKey]++;
                    }
                }
            }

            if (scheduledCredits < course.credits) {
                throw new Error(`Not enough available slots/rooms for course "${course.name}" (needs ${course.credits} slots, got ${scheduledCredits}). Try adding more rooms or time slots.`);
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
