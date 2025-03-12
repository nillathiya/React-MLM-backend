const mongoose = require('mongoose');
const { Schema } = mongoose;

const CompanyInfoSchema = new Schema({
    title: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String },
    type: { type: String },
    status: { type: Number },// Status indicator (e.g., active/inactive)
}, { timestamps: true });

module.exports = mongoose.model('CompanyInfo', CompanyInfoSchema);
