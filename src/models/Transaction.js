const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const transactionSchema = new Schema(
    {
        txUCode: { type: Schema.Types.ObjectId, ref: "User" },
        uCode: { type: Schema.Types.ObjectId, ref: "User" },
        txType: { type: String },
        debitCredit: { type: String },
        source: { type: String },
        walletType: { type: String }, // "fund_wallet" , "main_wallet"
        autoPoolAmount: { type: Number },
        amount: { type: Number },
        txCharge: { type: Number },
        criptoType: { type: String },
        criptAddress: { type: String },
        paymentType: { type: String },
        paymentSlip: { type: String },
        tdsStatus: { type: Number, default: 0 },
        txsRes: { type: String },
        tsxStatus: { type: String },
        txNumber: { type: String },
        bankDetails: { type: String },
        panNumber: { type: String },
        postWalletBalance: { type: Number },
        currentWalletBalance: { type: Number },
        remark: { type: String },
        distributePar: { type: String },
        userPrsnt: { type: String },
        apiResponse: { type: String },
        txRecord: { type: String },
        requestAmount: { type: Number },
        paidAmount: { type: Number },
        crypStatus: { type: Number, default: 0 },
        crypPaymentId: { type: String },
        cryptPaymentAmount: { type: Number },
        cryptPaymentWallet: { type: String },
        cryptExpiryDate: { type: Date },
        approveDate: { type: Date },
        txHash: { type: String },
        reason: { type: String },
        payoutId: { type: String },
        paymentId: { type: String },
        paymentStatus: { type: Number, default: 0 },
        status: { type: Number, default: 0 }, // 0,1,2
        // Others
        method: { type: String },
        response: { type: String },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transaction", transactionSchema);

