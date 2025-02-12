const { AdminUser, User, WalletSettings, Wallet, Plan } = require('../models/DB');

const profile = {};

profile.sponsorInfo = async (uCode, parameter) => {
    const info = await User.findOne({uCode});
    const sponsorCode = info.sponsor;
    
};

module.exports = profile;