const mongoose = require("mongoose");

const RankSettingsSchema = new mongoose.Schema({
    title: { type: String, trim: true },
    slug: { type: String, trim: true ,unique: true },
    type: { type: String, trim: true },
    value: { type: [String], trim: true },
    status: { type: Number, default: 0 },
});

module.exports = mongoose.model("RankSettings", RankSettingsSchema);
