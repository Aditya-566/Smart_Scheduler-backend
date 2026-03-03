import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a course name']
    },
    code: {
        type: String,
        required: [true, 'Please add a course code'],
        unique: true,
        uppercase: true
    },
    department: {
        type: mongoose.Schema.ObjectId,
        ref: 'Department',
        required: true
    },
    credits: {
        type: Number,
        required: [true, 'Please add credits'],
        min: 1,
        max: 6
    },
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
