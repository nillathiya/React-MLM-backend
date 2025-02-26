const mongoose = require("mongoose");

const AdminSettingsSchema = new mongoose.Schema({
    title: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, required: true },
    type: { type: String, trim: true, required: true },
    options: { type: String, trim: true },
    value: { type: String, trim: true },
    status: { type: Number, default: 0 },
    adminStatus: { type: Number, default: 0 }
});

const AdminSettings = mongoose.model("AdminSettings", AdminSettingsSchema);

module.exports = AdminSettings;
