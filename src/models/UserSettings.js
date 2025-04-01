const mongoose = require("mongoose");

const UseSettingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  options: { type: mongoose.Schema.Types.Mixed, default: [] },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ["fix", "range", "string", "number", "singular_array"], required: true },
  status: { type: Number, default: 1 },
  adminStatus: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model("UserSetting", UseSettingSchema);
