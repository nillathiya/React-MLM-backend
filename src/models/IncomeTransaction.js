const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const incomeTransactionSchema = new Schema(
    {
        txUCode: { type: Schema.Types.ObjectId, ref: "User" },
        uCode: { type: Schema.Types.ObjectId, ref: "User" },
        txType: { type: String },
        walletType: { type: String },
        source: { type: String },
        amount: { type: Number },
        txCharge: { type: Number },
        postWalletBalance: { type: Number },
        currentWalletBalance: { type: Number },
        remark: { type: String },
        response: { type: String },
        status: { type: Number, default: 0 }, // 0,1,2
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("IncomeTransaction", incomeTransactionSchema);
