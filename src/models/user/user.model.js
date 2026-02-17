/**
 * Written by Pradeep
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, "Please provide your first name"],
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
        },
        dob: {
            type: Date,
        },

        email: {
            type: String,
            required: [true, "Please provide your email"],
            lowercase: true,
            unique: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email",
            ],
        },

        phone: {
            type: String,
            required: [true, "Please provide your phone number"],
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Please provide a password"], // Kept required as per original
            minlength: 6,
            select: false,
        },

        otp: {
            type: String,
            select: false,
        },

        otpExpiry: {
            type: Date,
            select: false,
        },

        otpType: {
            type: String,
            enum: ["login", "reset"],
            select: false,
        },

        otpAttempts: {
            type: Number,
            default: 0,
            select: false,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isDisabled: {
            type: Boolean,
            default: false,
        },

        role: {
            type: String,
            enum: ["USER", "SUB_ADMIN", "ADMIN"],
            default: "USER",
        },
        permissions: {
            type: [String],
            default: [],
            // description: "Array of permission strings. ADMIN gets ['*'], SUB_ADMIN gets custom permissions, USER gets []" 
        },

        lastLoginAt: {
            type: Date,
        },
        otpLastSentAt: {
            type: Date,
        },

        fcmToken: {
            type: String,
            trim: true,
        },

        refreshToken: {
            type: String,
            select: false
        }
    },
    {
        timestamps: true,
    }
);

// Pre-save hook: Permissions for ADMIN
userSchema.pre("save", function (next) {
    if ((this.isNew || this.isModified("role")) && this.role === "ADMIN") {
        if (!this.permissions || this.permissions.length === 0) {
            this.permissions = ["*"];
        }
    }
    next();
});

// Pre-save hook: Hash Password & Derive Name
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    if (!this.name && this.firstName && this.lastName) {
        this.name = `${this.firstName} ${this.lastName}`;
    }
    next();
});

// Method to check password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            role: this.role,
            email: this.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d' }
    );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { id: this._id },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, // Fallback if strictly needed, but better separate
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
};

export default mongoose.model("User", userSchema);
