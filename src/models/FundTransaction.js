const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const fundTransactionSchema = new Schema(
    {
        txUCode: { type: Schema.Types.ObjectId, ref: "User" },
        uCode: { type: Schema.Types.ObjectId, ref: "User" },
        txType: { type: String },
        debitCredit: { type: String },
        fromWalletType: { type: String },
        walletType: { type: String }, // "FUND_WALLET" , "MAIN_WALLET"
        amount: { type: Number },
        txCharge: { type: Number },
        tds: { type: Number },
        cryptoDetails: { type: Number },
        wPool: { type: Number },
        paymentSlip: { type: String },
        txNumber: { type: String },
        currentWalletBalance: { type: Number },
        postWalletBalance: { type: Number },
        method: { type: String },
        response: { type: String },
        remark: { type: String },
        reason: { type: String },
        isRetrieveFund: { type: Boolean, default: false },
        status: { type: Number, default: 0 }, // 0,1,2
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("FundTransaction", fundTransactionSchema)