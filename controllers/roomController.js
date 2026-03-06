import asyncHandler from 'express-async-handler';
import Room from '../models/Room.js';

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
export const getRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({});
    res.json(rooms);
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
export const getRoom = asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);
    if (room) {
        res.json(room);
    } else {
        res.status(404);
        throw new Error('Room not found');
    }
});

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Admin
export const createRoom = asyncHandler(async (req, res) => {
    const { number, capacity, type, features } = req.body;

    const roomExists = await Room.findOne({ number });
    if (roomExists) {
        res.status(400);
        throw new Error('Room with this number already exists');
    }

    const room = await Room.create({
        number,
        capacity,
        type: type || 'LECTURE',
        features: features || []
    });

    res.status(201).json(room);
});

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
export const updateRoom = asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }

    const updated = await Room.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    res.json(updated);
});

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
export const deleteRoom = asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);
    if (!room) {
        res.status(404);
        throw new Error('Room not found');
    }
    await room.deleteOne();
    res.json({ message: 'Room removed' });
});
