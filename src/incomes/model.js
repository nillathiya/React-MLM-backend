const common = require('../helpers/common');
const { User, IncomeTransaction, WalletSettings, Orders, PinDetail, FundTransaction } = require('../models/DB');

async function weeklyDistribution() {
    try {
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, '_id');
        if (!usersData?.length) return;

        const fromWallet = 'weekly_pool';
        const toWallet = 'main_wallet';
        const balances = await Promise.all(usersData.map(user =>
            common.getBalance(user._id, fromWallet)
        ));

        const transferPromises = usersData
            .map((user, index) => ({ uCode: user._id, balance: balances[index] }))
            .filter(item => item.balance > 0)
            .map(item => addToWallet(item.uCode, fromWallet, toWallet, item.balance));

        await Promise.all(transferPromises);
    } catch (e) {
        console.error(`Error in weekly distribution: ${e.message}`);
    }
}

async function monthlyDistribution() {
    try {
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, '_id');
        if (!usersData?.length) return;

        const fromWallet = 'monthly_pool';
        const toWallet = 'main_wallet';
        const balances = await Promise.all(usersData.map(user =>
            common.getBalance(user._id, fromWallet)
        ));

        const transferPromises = usersData
            .map((user, index) => ({ uCode: user._id, balance: balances[index] }))
            .filter(item => item.balance > 0)
            .map(item => addToWallet(item.uCode, fromWallet, toWallet, item.balance));

        await Promise.all(transferPromises);
    } catch (e) {
        console.error(`Error in monthly distribution: ${e.message}`);
    }
}

async function addToWallet(uCode, fromWallet, toWallet, amount) {
    try {
        const currentWalletBalance = await common.getBalance(uCode, toWallet);
        const postWalletBalance = currentWalletBalance + amount;
        const transaction = new FundTransaction({
            uCode,
            txType: "internalTransfer",
            walletType: toWallet,
            source: fromWallet,
            amount,
            txCharge: 0,
            currentWalletBalance,
            postWalletBalance,
            remark: `${fromWallet} to ${toWallet}`,
            response: fromWallet,
            status: 1
        });
        await Promise.all([
            transaction.save(),
            common.manageWalletAmounts(uCode, toWallet, amount),
            common.manageWalletAmounts(uCode, fromWallet, -amount)
        ]);
    } catch (e) {
        console.error(`Error in adding to main wallet: ${e.message}`);
    }
}

async function roiIncome() {
    try {
        const ordersData = await Orders.find({ payOutStatus: 1, status: 1 })
            .populate('customerId', 'accountStatus')
            .populate('pinId', 'roi status');

        if (!ordersData?.length) return;

        const [walletSettingsData, userCappings] = await Promise.all([
            WalletSettings.findOne({ slug: 'roi', type: 'income', universal: 1 }),
            common.getTotalUserCappingStatus(ordersData.map(order => order.customerId))
        ]);

        const transactions = [];
        const walletUpdates = [];

        for (let order of ordersData) {
            const { _id, bv, customerId, pinId } = order;
            if (bv <= 0 || !customerId) continue;

            const user = customerId;
            if (!user || user.accountStatus.activeStatus === 0 || user.accountStatus.blockStatus === 1) continue;

            const remainingCapping = userCappings[user._id] || 0;
            if (remainingCapping === 0) continue;

            const pin = pinId;
            if (!pin || pin.status === 0 || pin.status === 2 || pin.roi < 0) continue;

            let payable = pin.roi * bv / 100;
            if (payable > remainingCapping) payable = remainingCapping;

            if (payable > 0) {
                const currentWalletBalance = walletSettingsData.wallet ?
                    await common.getBalance(user._id, walletSettingsData.wallet) : 0;
                const postWalletBalance = currentWalletBalance + payable;

                transactions.push({
                    uCode: user._id,
                    txType: "income",
                    walletType: "",
                    source: 'roi',
                    amount: payable,
                    txCharge: 0,
                    currentWalletBalance,
                    postWalletBalance,
                    remark: `${walletSettingsData.name} of ${payable} generated`,
                    response: _id.toString(),
                    status: 1
                });

                walletUpdates.push(
                    common.manageWalletAmounts(user._id, 'roi', payable),
                    walletSettingsData.wallet && common.manageWalletAmounts(user._id, walletSettingsData.wallet, payable * 0.25),
                    common.manageWalletAmounts(user._id, 'weekly_pool', payable * 0.45),
                    common.manageWalletAmounts(user._id, 'monthly_pool', payable * 0.30),
                );
                roi_level_commission(user._id, payable, 25);
            }
        }

        await Promise.all([
            IncomeTransaction.insertMany(transactions),
            ...walletUpdates.filter(Boolean)
        ]);
    } catch (e) {
        console.error(`Error in calculating ROI income: ${e.message}`);
    }
}

async function level(uCode, amount, level = 1) {
    try {
        console.log("Level Entered:");
        const txUData = await User.findOne({ _id: uCode }, 'username');
        if (!txUData) return;

        const plan = await common.planData('level_income');
        if (!plan) return;

        const walletSettings = await WalletSettings.find({ slug: { $in: ['direct', 'level'] }, type: 'income', universal: 1 })
            .lean();
        const directSettings = walletSettings.find(ws => ws.slug === 'direct');
        const levelSettings = walletSettings.find(ws => ws.slug === 'level');

        let currentUCode = uCode;
        const transactions = [];
        const walletUpdates = [];

        for (let counter = 1; counter <= Math.min(level, plan.value.length); counter++) {
            const source = counter === 1 ? 'direct' : 'level';
            console.log("source:", source);
            const walletSettingsData = counter === 1 ? directSettings : levelSettings;
            if (!walletSettingsData) break;
            console.log("walletSettingsData:", walletSettingsData);
            const uData = await User.findOne({ _id: currentUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!uData || !currentUCode) continue;
            const sponsorUCode = uData.uSponsor;
            if (!sponsorUCode) break;
            const sData = await User.findOne({ _id: sponsorUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!sData) break;
            currentUCode = sData._id;
            console.log("sData:", sData);
            const remainingCapping = await common.getTotalUserCappingStatus(currentUCode);
            console.log("remainingCapping:", remainingCapping);
            if (remainingCapping === 0) continue;

            let payable = (parseFloat(plan.value[counter - 1]) * amount) / 100;
            if (payable > remainingCapping) payable = remainingCapping;

            if (payable > 0) {
                const currentWalletBalance = await common.getBalance(currentUCode, "");
                const postWalletBalance = currentWalletBalance + payable;

                transactions.push({
                    txUCode: uCode,
                    uCode: currentUCode,
                    txType: "income",
                    walletType: "",
                    source,
                    amount: payable,
                    txCharge: 0,
                    currentWalletBalance,
                    postWalletBalance,
                    remark: `${walletSettingsData.name} of ${payable} generated from ${txUData.username}`,
                    response: counter,
                    status: 1
                });

                walletUpdates.push(
                    common.manageWalletAmounts(currentUCode, source, payable),
                    walletSettingsData.wallet && common.manageWalletAmounts(currentUCode, walletSettingsData.wallet, payable * 0.25),
                    common.manageWalletAmounts(currentUCode, 'weekly_pool', payable * 0.45),
                    common.manageWalletAmounts(currentUCode, 'monthly_pool', payable * 0.30)
                );
            }
        }

        await Promise.all([
            IncomeTransaction.insertMany(transactions),
            ...walletUpdates.filter(Boolean)
        ]);
    } catch (e) {
        console.error(`Error in level: ${e.message}`);
    }
}

async function roi_level_commission(uCode, amount, level = 25) {
    try {
        const txUData = await User.findOne({ _id: uCode }, 'username');
        if (!txUData) return;

        const [plan, walletSettingsData] = await Promise.all([
            common.planData('roi_level_commission'),
            WalletSettings.findOne({ slug: 'roi_level_commission', type: 'income', universal: 1 }).lean()
        ]);
        if (!plan || !walletSettingsData) return;

        let currentUCode = uCode;
        const transactions = [];
        const walletUpdates = [];

        for (let counter = 1; counter <= Math.min(level, plan.value.length); counter++) {
            const uData = await User.findOne({ uSponsor: currentUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, '_id');
            if (!uData || !currentUCode) continue;
            currentUCode = uData._id;

            const remainingCapping = await common.getTotalUserCappingStatus(currentUCode);
            if (remainingCapping === 0) continue;

            let payable = (parseFloat(plan.value[counter - 1]) * amount) / 100;
            if (payable > remainingCapping) payable = remainingCapping;

            if (payable > 0) {
                const currentWalletBalance = await common.getBalance(currentUCode, "");
                const postWalletBalance = currentWalletBalance + payable;

                transactions.push({
                    txUCode: uCode,
                    uCode: currentUCode,
                    txType: "income",
                    walletType: "",
                    source: 'roi_level_commission',
                    amount: payable,
                    txCharge: 0,
                    currentWalletBalance,
                    postWalletBalance,
                    remark: `${walletSettingsData.name} of ${payable} generated from ${txUData.username}`,
                    response: counter,
                    status: 1
                });

                walletUpdates.push(
                    common.manageWalletAmounts(currentUCode, 'roi_level_commission', payable),
                    walletSettingsData.wallet && common.manageWalletAmounts(currentUCode, walletSettingsData.wallet, payable * 0.25),
                    common.manageWalletAmounts(currentUCode, 'weekly_pool', payable * 0.45),
                    common.manageWalletAmounts(currentUCode, 'monthly_pool', payable * 0.30)
                );
            }
        }

        await Promise.all([
            IncomeTransaction.insertMany(transactions),
            ...walletUpdates.filter(Boolean)
        ]);
    } catch (e) {
        console.error(`Error in roi_level_commission: ${e.message}`);
    }
}

module.exports = {
    roiIncome,
    weeklyDistribution,
    monthlyDistribution,
    level
};