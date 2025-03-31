const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const pinDetailsSchema = new Schema(
  {
    pinType: String,
    pinRate: Number,
    roi: Number,
    bv: String, // Business Volumn
    status: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PinDetail", pinDetailsSchema);
