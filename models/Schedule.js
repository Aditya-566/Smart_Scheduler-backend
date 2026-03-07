import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
        required: true
    },
    room: {
        type: mongoose.Schema.ObjectId,
        ref: 'Room',
        required: true
    },
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    timeSlot: {
        type: mongoose.Schema.ObjectId,
        ref: 'TimeSlot',
        required: true
    },
    batchInfo: {
        type: String,
        required: [true, 'Please add batch information (e.g., Year 2 - CS)']
    }
}, {
    timestamps: true
});

// Critical Indexes for Conflict Detection
// 1. Prevent room double-booking
scheduleSchema.index({ room: 1, timeSlot: 1 }, { unique: true });

// 2. Prevent faculty overlap (only when faculty is assigned)
scheduleSchema.index(
    { faculty: 1, timeSlot: 1 },
    {
        unique: true,
        partialFilterExpression: { faculty: { $type: 'objectId' } }
    }
);

// 3. Prevent student batch overlap
scheduleSchema.index({ batchInfo: 1, timeSlot: 1 }, { unique: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
