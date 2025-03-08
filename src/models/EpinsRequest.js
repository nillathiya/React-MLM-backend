const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const EpinsRequestSchema = new Schema(
  {
    uCode: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    utrNumber: { type: String },
    pinId: { type: mongoose.Schema.Types.ObjectId, ref: "PinDetails" },
    numberOfPins: { type: Number },
    slip: { type: String },
    status: { type: Number, default: 0 },
    remark: { type: String },
    reason: { type: String },
  },
  { timestamps: true }
);
module.exports = mongoose.model("EpinsRequest", EpinsRequestSchema);
