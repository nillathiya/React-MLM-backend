const jwt = require('jsonwebtoken');
const { AdminUser, User, WalletSettings, Wallet, Plan, IncomeTransaction } = require('../models/DB');
const common = require('./common');

const distribute = {};

distribute.directDistribute = async (uCode, amount, level) => {
    const code = uCode;
    const benFrom = uCode;
    const datetime = new Date();
    const l = 1;
    const profile = await User.findOne({uCode});
    const name = profile.name;
    const username = profile.username;
    const plan = await Plan.find({});
    const source = 'direct';
    // create a key:value of level:directIncome from plan name const as directIncome
    while(l<=level && !code){
        const levelPer = directIncome[l];
        const payable = amount * levelPer / 100;
        const codeProfile = await User.findOne({code});
        const code = codeProfile.sponsor;
        const currentBalance = common.getWalletBalance(code,'main_wallet');
        
        if(payable > 0){
            const instant = payable * 0.25;
            const weekly = payable * 0.45;
            const monthly = payable * 0.3;
            const postBalance = currentBalance + instant;
            const incomeLoad = {
                txUCode: benFrom,
                uCode: code,
                txType: 'income',
                walletType: 'main_wallet',
                source: source,
                amount: payable,
                txCharge: 0,
                postWalletBalance: postBalance,
                currentWalletBalance: currentBalance,
                remark: `Receive ${source} Income of ${payable} from ${username} at level ${l}`,
                response: {l,weekly,monthly},
                status: 1
            }
            const res = IncomeTransaction.create(incomeLoad);
            if(res){
                common.mangeWalletAmounts(code, source, incomeLoad.amount);
                common.mangeWalletAmounts(code, incomeLoad.walletType, instant);
                common.mangeWalletAmounts(code, 'weekly', weekly);
                common.mangeWalletAmounts(code, 'monthly', monthly);
            }

        }
        l++;
    }
};

distribute.levelRoiDistribute = async (uCode, amount, level) => {
    const code = uCode;
    const benFrom = uCode;
    const datetime = new Date();
    const l = 1;
    const profile = await User.findOne({uCode});
    const name = profile.name;
    const username = profile.username;
    const plan = await Plan.find({});
    const source = 'referral';
    // create a key:value of level:levelRoiIncome from plan name const as levelRoiIncome
    while(l<=level && !code){
        const levelPer = levelRoiIncome[l];
        const payable = amount * levelPer / 100;
        const codeProfile = await User.findOne({code});
        const code = codeProfile.sponsor;
        const currentBalance = common.getWalletBalance(code,'main_wallet');
        
        if(payable > 0){
            const instant = payable * 0.25;
            const weekly = payable * 0.45;
            const monthly = payable * 0.3;
            const postBalance = currentBalance + instant;
            const incomeLoad = {
                txUCode: benFrom,
                uCode: code,
                txType: 'income',
                walletType: 'main_wallet',
                source: source,
                amount: payable,
                txCharge: 0,
                postWalletBalance: postBalance,
                currentWalletBalance: currentBalance,
                remark: `Receive Daily Share Income of ${payable} from ${username} at level ${l} `,
                response: l,
                status: 1
            }
            const res = IncomeTransaction.create(incomeLoad);
            if(res){
                common.mangeWalletAmounts(code, source, incomeLoad.amount);
                common.mangeWalletAmounts(code, incomeLoad.walletType, instant);
                common.mangeWalletAmounts(code, 'weekly', weekly);
                common.mangeWalletAmounts(code, 'monthly', monthly);
            }

        }
        l++;
    }
};

module.exports = distribute;