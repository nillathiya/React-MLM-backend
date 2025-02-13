const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PlanSchema = new Schema(
    {
        level: { type: Number },
        direactIncome: { type: Number },
        levelRoiIncome: { type: Number },
        rank: { type: String },
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model("Plan", PlanSchema);
