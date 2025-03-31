const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PlanSchema = new Schema(
    {   
        title: { type: String, trim: true },
        slug: { type: String, trim: true ,unique: true },
        type: { type: String, trim: true },
        value: { type: [String], trim: true },
        status: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);


module.exports = mongoose.model("Plan", PlanSchema);
