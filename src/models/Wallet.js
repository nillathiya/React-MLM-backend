const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const walletSchema = new Schema(
  {
    // parentId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    uCode: { type: Schema.Types.ObjectId, ref: "User" },
    username: String,
    c1: { type: Number, default: 0 },
    c2: { type: Number, default: 0 },
    c3: { type: Number, default: 0 },
    c4: { type: Number, default: 0 },
    c5: { type: Number, default: 0 },
    c6: { type: Number, default: 0 },
    c7: { type: Number, default: 0 },
    c8: { type: Number, default: 0 },
    c9: { type: Number, default: 0 },
    c10: { type: Number, default: 0 },
    c11: { type: Number, default: 0 },
    c12: { type: Number, default: 0 },
    c13: { type: Number, default: 0 },
    c14: { type: Number, default: 0 },
    c15: { type: Number, default: 0 },
    c16: { type: Number, default: 0 },
    c17: { type: Number, default: 0 },
    c18: { type: Number, default: 0 },
    c19: { type: Number, default: 0 },
    c20: { type: Number, default: 0 },
    c21: { type: Number, default: 0 },
    c22: { type: Number, default: 0 },
    c23: { type: Number, default: 0 },
    c24: { type: Number, default: 0 },
    c25: { type: Number, default: 0 },
    c26: { type: Number, default: 0 },
    c27: { type: Number, default: 0 },
    c28: { type: Number, default: 0 },
    c29: { type: Number, default: 0 },
    c31: { type: Number, default: 0 },
    c32: { type: Number, default: 0 },
    c33: { type: Number, default: 0 },
    c34: { type: Number, default: 0 },
    c35: { type: Number, default: 0 },
    c36: { type: Number, default: 0 },
    c37: { type: Number, default: 0 },
    c38: { type: Number, default: 0 },
    c39: { type: Number, default: 0 },
    c40: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", walletSchema);
