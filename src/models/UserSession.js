const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const UserSessionSchema = new Schema(
    {
        sessionId: { type: String, required: true },
        sessionType: { type: String, required: true, enum: ["User", "Admin"] },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("UserSession", UserSessionSchema);

