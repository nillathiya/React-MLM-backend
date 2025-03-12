const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const jwt = require("jsonwebtoken");

const userSchema = new Schema(
    {
        // User Hierarchy & Relations
        parentId: { type: Schema.Types.ObjectId, ref: "User" },
        uSponsor: { type: Schema.Types.ObjectId, ref: "User" },
        // Personal Information
        name: { type: String, },
        email: { type: String },
        password: { type: String },
        mobile: { type: String },
        username: { type: String, unique: true },
        dob: { type: Date },
        gender: { type: String },
        profilePicture: { type: String },

        // Address Information
        address: {
            line1: { type: String },
            line2: { type: String },
            city: {
                label: { type: String },
                value: { type: String }
            },
            state: {
                label: { type: String },
                value: { type: String }
            },
            country: {
                dialCode: { type: String },
                label: { type: String },
                value: { type: String },
            },
            countryCode: { type: String },
            postalCode: { type: String },
        },

        // Account & Status
        accountStatus: {
            activeId: { type: Number, default: 0 },
            activeStatus: { type: Number, default: 0 },
            blockStatus: { type: Number, default: 0 },
            activeDate: { type: Date },
        },
        role: { type: Number, default: 2 }, // 1 - Admin, 2 - User
        status: { type: Number, default: 1 }, // 1 - Active, 0 - Inactive
        ip: { type: String },
        source: { type: String },
        resetPasswordToken: { type: String },
        settings: { type: Object },

        // Wallet & Payment
        walletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
        walletAddress: { type: String },
        payment: {
            paymentId: { type: String },
            amount: { type: Number },
            dateTime: { type: Date },
        },
        withdrawStatus: { type: Number, default: 1 },

        // Plan & Validity
        validityDate: { type: Date },
        planName: { type: String },

        // KYC Information
        kycStatus: { type: Number, default: 2 }, // 0 - Rejected, 1 - Approved, 2 - Pending
        reason: { type: String }, // Reason for KYC rejection if any
        panCard: {
            panNo: { type: String },
            image: { type: String },
        },
        identityProof: {
            proofType: {
                type: String,
                enum: ["Adhaar", "VoterID", "Passport", "Driving License"],
            },
            proofNumber: { type: String },
            image1: { type: String },
            image2: { type: String },
        },

        // Banking & UPI Details
        bankDetails: {
            account: { type: String },
            IFSC: { type: String },
            bank: { type: String },
            accountType: { type: String },
        },
        cryptoAddress: { type: String },
        upi: {
            gPay: { type: String },
            phonePe: { type: String },
            bharatPe: { type: String },
            payTM: { type: String },
            upiId: { type: String },
        },


        // Nominee Details
        nominee: {
            name: { type: String },
            relation: { type: String },
            dob: { type: Date },
            address: { type: String },
            city: { type: String },
            state: { type: String },
        },

        // Matrix / Multi-Level Marketing Data
        position: { type: Number, default: 0 },
        accessLevel: [Number], // e.g., [0 - FE, 1 - OTO1, 2 - OTO2, etc.]
        myRank: { type: Number },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            parentId: this.parentId,
            email: this.email,
            username: this.username,
            matrixDetails: this.matrixDetails,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.index({ name: 1, email: 1, username: 1 });
module.exports = mongoose.model("User", userSchema);
