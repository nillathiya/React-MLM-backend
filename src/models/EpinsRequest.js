import mongoose, { Schema, model } from "mongoose";

const EpinsRequestSchema = new mongoose.Schema(
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

let tName = `EpinsRequest`;
const EpinsRequestModel =
  mongoose.models[tName] || model(tName, EpinsRequestSchema);
export default EpinsRequestModel;
