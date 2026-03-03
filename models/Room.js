import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    number: {
        type: String,
        required: [true, 'Please add a room number'],
        unique: true
    },
    capacity: {
        type: Number,
        required: [true, 'Please add room capacity'],
        min: 10
    },
    type: {
        type: String,
        enum: ['LECTURE', 'LAB', 'SEMINAR'],
        default: 'LECTURE'
    },
    features: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
