import asyncHandler from 'express-async-handler';
import Department from '../models/Department.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
export const getDepartments = asyncHandler(async (req, res) => {
    const departments = await Department.find({});
    res.json(departments);
});

// @desc    Create a department
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = asyncHandler(async (req, res) => {
    const { name, code, description } = req.body;

    const exists = await Department.findOne({ code: code.toUpperCase() });
    if (exists) {
        res.status(400);
        throw new Error('Department with this code already exists');
    }

    const department = await Department.create({ name, code, description });
    res.status(201).json(department);
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
        res.status(404);
        throw new Error('Department not found');
    }
    await dept.deleteOne();
    res.json({ message: 'Department removed' });
});
