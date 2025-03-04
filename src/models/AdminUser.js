const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const jwt = require("jsonwebtoken");
const adminUserSchema = new Schema(
    {
        role: { type: Number, required: true }, //1- admin, 3-subAdmin, 4-supperAdmin
        username: String,
        amount: { type: Number, default: 0 },
        password: { type: String, required: true },
        email: { type: String, required: true },
        status: { type: Number, default: 1 },
    },
    {
        timestamps: true,
    }
);

adminUserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            role: this.role,
            status: this.status
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};
adminUserSchema.index({email: 1, username: 1 });
module.exports = mongoose.model("AdminUser", adminUserSchema);