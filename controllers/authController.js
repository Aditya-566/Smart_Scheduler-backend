import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, loginId, password, role, department } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { loginId }] });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists with that email or login ID');
    }

    try {
        const user = await User.create({
            name,
            email,
            loginId,
            password,
            role: role || 'STUDENT',
            department
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                loginId: user.loginId,
                role: user.role,
                token: user.getSignedJwtToken(),
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message).join(', ');
            res.status(400);
            throw new Error(messages);
        }
        // Handle duplicate key errors (e.g. loginId or email already exists in DB)
        if (error.code === 11000) {
            res.status(400);
            throw new Error('A user with that email or login ID already exists.');
        }
        throw error;
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { loginId, password } = req.body;

    // Check for user
    const user = await User.findOne({ loginId }).select('+password');

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            loginId: user.loginId,
            role: user.role,
            token: user.getSignedJwtToken(),
        });
    } else {
        res.status(401);
        throw new Error('Invalid login ID or password');
    }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            loginId: user.loginId,
            role: user.role,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        res.status(404);
        throw new Error('There is no user with that email');
    }


    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
        console.warn('Missing FRONTEND_URL environment variable. Falling back to localhost');
    }
    const resetUrl = `${frontendUrl || 'http://localhost:5173'}/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message,
        });

        res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
        console.error(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(500);
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        loginId: user.loginId,
        role: user.role,
        token: user.getSignedJwtToken(),
    });
});

export { registerUser, loginUser, getMe, forgotPassword, resetPassword };
