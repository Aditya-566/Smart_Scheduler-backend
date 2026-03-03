import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
    dayOfWeek: {
        type: Number, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
        required: true,
        min: 0,
        max: 6
    },
    startTime: {
        type: String, // e.g. "09:00"
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
        type: String, // e.g. "10:30"
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick lookup of active slots on a specific day
timeSlotSchema.index({ dayOfWeek: 1, startTime: 1, endTime: 1 });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
