const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const walletSettingsSchema = new Schema(
  {
    parentId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    slug: String, // Fund_Wallet
    name: String,
    wallet: String,
    type: String,
    binary: { type: Number, default: 0 },
    matrix: { type: Number, default: 0 },
    universal: { type: Number, default: 0 },
    singleLeg: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WalletSettings", walletSettingsSchema);
