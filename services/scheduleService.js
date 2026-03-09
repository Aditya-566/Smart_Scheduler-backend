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

        // Track batch bookings: batchInfo_timeSlotId (CRITICAL: prevent duplicate batch+timeSlot)
        const bookedBatchSlots = new Set();

        // Use batchInfo from constraints or generate from department
        const batchInfo = constraints.batchInfo || `Dept-${departmentId}`;

        // Define break/lunch slots to skip (e.g., 12:00-13:00 is lunch)
        const breakStartTimes = constraints.breakSlots || ['12:00'];
        const maxPerDay = parseInt(constraints.maxClassesPerDay) || 4;
        const days = Object.keys(slotsByDay).sort((a,b) => a-b);
        
        // Track course schedule state
        let courseQueue = courses.map(c => ({
            course: c,
            remaining: c.credits,
            scheduledToday: 0
        }));
        
        let totalCreditsRemaining = courseQueue.reduce((acc, curr) => acc + curr.remaining, 0);

        for (const day of days) {
            if (totalCreditsRemaining <= 0) break;

            courseQueue.forEach(item => { item.scheduledToday = 0; });
            let batchClassesToday = 0;
            let consecutiveClasses = 0;
            const dailySlots = slotsByDay[day];

            for (const slot of dailySlots) {
                if (totalCreditsRemaining <= 0) break;
                if (batchClassesToday >= maxPerDay) break;

                // BREAK LOGIC: Skip lunch/break time slots
                if (breakStartTimes.includes(slot.startTime)) {
                    consecutiveClasses = 0; // Reset consecutive counter after a scheduled break
                    continue;
                }

                // CONSECUTIVE LIMIT: After 2 consecutive classes, force a gap
                if (consecutiveClasses >= 2) {
                    consecutiveClasses = 0; // The forced gap counts as breaking the streak
                    continue;
                }

                // Check batch+timeSlot conflict
                const batchSlotKey = `${batchInfo}_${slot._id}`;
                if (bookedBatchSlots.has(batchSlotKey)) {
                    consecutiveClasses++;
                    continue;
                }

                // Sort courses: Priority 1: Least scheduled today. Priority 2: Highest remaining credits.
                courseQueue.sort((a, b) => {
                    if (a.scheduledToday !== b.scheduledToday) {
                        return a.scheduledToday - b.scheduledToday; // Ascending: least scheduled first
                    }
                    return b.remaining - a.remaining; // Descending: most remaining first
                });

                let selectedCourseItem = null;
                let assignedRoom = null;

                for (const item of courseQueue) {
                    if (item.remaining <= 0) continue;
                    
                    const course = item.course;
                    const hasFaculty = course.faculty && course.faculty._id;
                    if (hasFaculty) {
                        const facultyIdStr = course.faculty._id.toString();
                        if (bookedFacultySlots.has(`${facultyIdStr}_${slot._id}`)) continue;
                    }

                    // Find first available room
                    for (const room of rooms) {
                        const roomBookingKey = `${room._id}_${slot._id}`;
                        if (!bookedRoomSlots.has(roomBookingKey)) {
                            assignedRoom = room;
                            break;
                        }
                    }

                    if (assignedRoom) {
                        selectedCourseItem = item;
                        break;
                    }
                }

                if (selectedCourseItem && assignedRoom) {
                    const course = selectedCourseItem.course;
                    const scheduleEntry = {
                        course: course._id,
                        room: assignedRoom._id,
                        timeSlot: slot._id,
                        batchInfo
                    };

                    if (course.faculty && course.faculty._id) {
                        scheduleEntry.faculty = course.faculty._id;
                        bookedFacultySlots.add(`${course.faculty._id.toString()}_${slot._id}`);
                    }

                    newSchedules.push(scheduleEntry);
                    bookedRoomSlots.add(`${assignedRoom._id}_${slot._id}`);
                    bookedBatchSlots.add(batchSlotKey);

                    selectedCourseItem.remaining--;
                    selectedCourseItem.scheduledToday++;
                    batchClassesToday++;
                    totalCreditsRemaining--;
                    consecutiveClasses++;
                } else {
                    // No course could be scheduled in this slot (likely room/faculty restriction)
                    consecutiveClasses = 0; 
                }
            }
        }

        if (totalCreditsRemaining > 0) {
            const unscheduled = courseQueue.filter(c => c.remaining > 0).map(c => `${c.course.name} (${c.remaining} left)`).join(', ');
            throw new Error(`Not enough available slots/rooms for some courses: ${unscheduled}. Try adding more rooms or time slots.`);
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
