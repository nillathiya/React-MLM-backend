const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const newsEventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    images: [
        {
            type: String, // Store image URLs (Cloudinary, S3, etc.)
        },
    ],
    hotlinks: [
        {
            label: String, // Text for the link
            url: String, // Target URL
        },
    ],
    category: {
        type: String,
        enum: ["news", "event"],
        required: true,
    },
    tags: [
        {
            type: String, // Optional tags for filtering
        },
    ],
    published: {
        type: Boolean,
        default: false, // Admin can control visibility
    },
    views: {
        type: Number,
        default: 0, // Track user views
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin", // Reference to admin who created it
    },
    eventDate: {
        type: Date, // Applicable for events
    },
    expiresAt: {
        type: Date, // Optional expiry for events
    },
}, { timestamps: true });

module.exports = mongoose.model("NewsEvent", newsEventSchema);
