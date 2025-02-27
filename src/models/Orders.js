const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const ordersSchema = new Schema(
    {
        customerId: { type: Schema.Types.ObjectId, ref: "User" },
        pinId: { type: Schema.Types.ObjectId, ref: "PinDetails" },
        activeId: Number,
        txType: String,
        bv: Number,
        pv: String,
        payOutStatus: { type: Number, default: 0 },
        amount: Number,
        status: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Orders", ordersSchema);
