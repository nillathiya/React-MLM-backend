// src\models\Orders.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ordersSchema = new Schema(
    {
        customerId: { type: Schema.Types.ObjectId, ref: "User" },
        pinId: { type: Schema.Types.ObjectId, ref: "PinDetail" },
        activeId: Number,
        txType: String,
        bv: Number,
        pv: String,
        payOutStatus: { type: Number, default: 1 },
        amount: Number,
        status: { type: Number, default: 1 },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Orders", ordersSchema);
