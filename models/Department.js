import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a department name'],
        unique: true
    },
    code: {
        type: String,
        required: [true, 'Please add a department code'],
        unique: true,
        uppercase: true
    },
    description: {
        type: String
    }
}, {
    timestamps: true
});

const Department = mongoose.model('Department', departmentSchema);

export default Department;
