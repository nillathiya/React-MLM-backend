const { default: mongoose } = require('mongoose');
const incomeModel = require('./model');

// incomeModel.daily_direct();
const uCode = new mongoose.Types.ObjectId("6807628371efa9a996b8284e");
incomeModel.rewarDistribution();