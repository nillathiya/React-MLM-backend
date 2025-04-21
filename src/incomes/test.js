const { default: mongoose } = require('mongoose');
const incomeModel = require('./model');

// incomeModel.daily_direct();
const uCode = new mongoose.Types.ObjectId("67fd0c85684b1b6132e11aab");
incomeModel.roiIncome();