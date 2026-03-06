import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    loginId: {
        type: String,
        required: [true, 'Please add a login ID'],
        unique: true,
        validate: {
            validator: function(v) {
                if (this.role === 'ADMIN') return /^AD\d{5}$/.test(v);
                if (this.role === 'FACULTY') return /^F\d{4}$/.test(v);
                if (this.role === 'STUDENT') return /^SD\d{10}$/.test(v);
                return false;
            },
            message: props => `${props.value} is not a valid login ID for the expected format (AD+5, F+4, SD+10)`
        }
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },

    role: {
        type: String,
        enum: ['ADMIN', 'FACULTY', 'STUDENT'],
        default: 'STUDENT'
    },
    department: {
        type: mongoose.Schema.ObjectId,
        ref: 'Department'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;
