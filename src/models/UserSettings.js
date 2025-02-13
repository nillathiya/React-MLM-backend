const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSettingsSchema = new Schema({
    title: String,
    name: String,
    slug: String,
    type: String,
    options: String,
    image: String,
    value: String,
    status: { type: Number, default: 0 },
    adminStatus: { type: Number, default: 0 },
});

let tName = `userSettings`;
const userSettingsModel = model(tName, userSettingsSchema);
module.exports = userSettingsModel;
