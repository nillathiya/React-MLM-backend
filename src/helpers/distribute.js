const { User } = require('../models/DB');
const common = require('./common');

const distribute = {};

distribute.directDistribute = async (uCode, amount, level) => {
    try {
        const benFrom = uCode;
        const datetime = new Date();
        let l = 1;
        const profile = await User.findOne({ uCode });

        if (!profile) {
            console.error("User not found");
            return;
        }

        const { name, username } = profile;
        const source = 'direct';

        let code = uCode;

        while (l <= level && code) {
            const levelPer = directIncome?.[l] || 0;
            const payable = (amount * levelPer) / 100;

            if (payable > 0) {
                const instant = payable * 0.25;
                const weekly = payable * 0.45;
                const monthly = payable * 0.3;

                const codeProfile = await User.findOne({ uCode: code }, { sponsor: 1 });
                if (!codeProfile) break;

                const currentBalance = await common.getWalletBalance(code, 'main_wallet');
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
                    response: { level: l, weekly, monthly },
                    status: 1
                };

                const res = await IncomeTransaction.create(incomeLoad);

                if (res) {
                    common.mangeWalletAmounts(code, source, incomeLoad.amount);
                    common.mangeWalletAmounts(code, incomeLoad.walletType, instant);
                    common.mangeWalletAmounts(code, 'weekly', weekly);
                    common.mangeWalletAmounts(code, 'monthly', monthly);
                }

                code = codeProfile.sponsor;
            }

            l++;
        }
    } catch (error) {
        console.error("Error in directDistribute:", error);
    }
};


distribute.levelRoiDistribute = async (uCode, amount, level) => {
    try {
        const benFrom = uCode;
        let l = 1;
        const profile = await User.findOne({ uCode });

        if (!profile) {
            console.error("User not found");
            return;
        }

        const { name, username } = profile;
        const source = 'referral';

        let code = uCode;

        while (l <= level && code) {
            const levelPer = levelRoiIncome?.[l] || 0;
            const payable = (amount * levelPer) / 100;

            if (payable > 0) {
                const instant = payable * 0.25;
                const weekly = payable * 0.45;
                const monthly = payable * 0.3;

                const codeProfile = await User.findOne({ uCode: code }, { sponsor: 1 });
                if (!codeProfile) break;

                const currentBalance = await common.getWalletBalance(code, 'main_wallet');
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
                    remark: `Receive Daily Share Income of ${payable} from ${username} at level ${l}`,
                    response: l,
                    status: 1
                };

                const res = await IncomeTransaction.create(incomeLoad);

                if (res) {
                    common.mangeWalletAmounts(code, source, incomeLoad.amount);
                    common.mangeWalletAmounts(code, incomeLoad.walletType, instant);
                    common.mangeWalletAmounts(code, 'weekly', weekly);
                    common.mangeWalletAmounts(code, 'monthly', monthly);
                }

                code = codeProfile.sponsor;
            }

            l++;
        }
    } catch (error) {
        console.error("Error in levelRoiDistribute:", error);
    }
};

module.exports = distribute;