const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const jwt = require("jsonwebtoken");

const userSchema = new Schema(
    {
        parentId: { type: Schema.Types.ObjectId, ref: "User" },
        name: String,
        email: String,
        password: String,
        contactNumber: String,
        city: String,
        gender: String,
        dob: Date,
        state: String,
        my_rank: String,
        username: { type: String, unique: true },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
        },
        sponsor: String,
        country: String,
        wallet_address: String,
        address: String,
        withdraw_status: { type: Number, default: 1 },
        position: { type: Number, default: 0 },
        parent: String,
        img: String,
        active_id: { type: Number, default: 0 },
        active_status: { type: Number, default: 0 },
        active_date: Date,
        role: { type: Number, default: 2 },
        profilePicture: {},
        ip: String,
        source: String,
        accessLevel: [], // 0 - FE, 1 - OTO1, 2 - OTO2, 3 - OTO3, 4 - OTO4, 5 - OTO5,
        resetPasswordToken: String,
        settings: {},
        validityDate: Date,
        planName: String,
        bankDetails: {
            account: { type: String },
            IFSC: { type: String },
            bank: { type: String },
            accountType: { type: String },
        },
        cryptoAddress: String,
        upi: {
            gPay: String,
            phonePe: String,
            bharatPe: String,
            payTM: String,
            upiId: String,
        },
        nominee: {
            name: String,
            relation: String,
            dob: String,
            address: String,
            city: String,
            State: String,
        },
        panCard: {
            panNo: String,
            image: String,
        },
        identityProof: {
            proofType: {
                type: String,
                enum: ["Adhaar", "VoterID", "Passport", "Driving License"],
            },
            proofNumber: String,
            image1: String,
            image2: String,
        },
        payment: {
            paymentId: String,
            amount: Number,
            dateTime: Date,
        },
        reason: {
            type: String,
        },
        kycStatus: { type: Number, default: 2 }, // 0 - Rejected, 1 - Approved, 2 - Pending
        status: { type: Number, default: 1 },
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
