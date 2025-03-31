const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const poolSchema = new Schema(
    {
        uCode: { type: Schema.Types.ObjectId, ref: "User" },
        poolId: String,
        parentId: { type: Schema.Types.ObjectId, ref: "Pool" },
        poolType: String,
        poolParentId: String,
        poolPosition: Number,
    },
    {
        timestamps: true,
    }
);

const PoolModel = model('Pool', poolSchema);

module.exports = PoolModel;