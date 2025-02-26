import mongoose, { Schema, model } from "mongoose";

const EpinsSchema = new mongoose.Schema({
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

let tName = `Epins`;
const EpinsModel = mongoose.models[tName] || model(tName, EpinsSchema);
export default EpinsModel;
