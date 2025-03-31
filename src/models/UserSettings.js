const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const ItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String },
  status: { type: Boolean, default: true },
  children: [{ type: mongoose.Schema.Types.Mixed }],
});

const UserSettingsSchema = new mongoose.Schema(
  {
    title: { type: String },
    name: { type: String },
    slug: { type: String, unique: true, sparse: true },
    type: { type: String },
    options: [ItemSchema],
    image: { type: String },
    value: [ItemSchema],
    status: { type: Number, default: 0 },
    adminStatus: { type: Number, default: 0 },
  },
  { timestamps: true }
);

let tName = `userSettings`;
const userSettingsModel = model(tName, UserSettingsSchema);
module.exports = userSettingsModel;
