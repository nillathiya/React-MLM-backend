const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const EpinsSchema = new Schema({
  txUCode: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uCode: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pinId: { type: mongoose.Schema.Types.ObjectId, ref: "PinDetails" },
  pin: { type: String },
  usefor: { type: String },
  status: { type: Number, default: 0 },
  usedIn: { type: String },
  usedStatus: { type: Number, default: 0 },
  remarks: { type: String },
  retrieveStatus: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Epins", EpinsSchema);
