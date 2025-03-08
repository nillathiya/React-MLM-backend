const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const contactUsSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        mobile: { 
            type: String,  
            required: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["pending", "resolved"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = model("ContactUs", contactUsSchema);
