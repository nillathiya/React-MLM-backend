const connectDB = require('../config/db');
const businessUtils = require('../helpers/businessUtils');
const common = require('../helpers/common');
const team = require('../helpers/team');
const { User, IncomeTransaction, WalletSettings, Orders, PinDetail, FundTransaction } = require('../models/DB');
const RankSettings = require('../models/RankSettings');
const Wallet = require('../models/Wallet');

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
            .map(item => addToWallet(item.uCode, fromWallet, toWallet, item.balance * 20 / 100));

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
            .map(item => addToWallet(item.uCode, fromWallet, toWallet, item.balance * 15 / 100));

        await Promise.all(transferPromises);
    } catch (e) {
        console.error(`Error in monthly distribution: ${e.message}`);
    }
}

async function addToWallet(uCode, fromWallet, toWallet, amount) {
    try {
        const remainingCapping = await common.getTotalUserCappingStatus(uCode);
        if (remainingCapping === 0 || amount <= 0) return;
        if (amount > remainingCapping) amount = remainingCapping;
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
            common.manageWalletAmounts(uCode, fromWallet, -amount),
            common.manageWalletAmounts(uCode, 'capping', amount),
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



        const [walletSettingsData] = await Promise.all([
            WalletSettings.findOne({ slug: 'roi', type: 'income', universal: 1 })
        ]);

        const transactions = [];
        const walletUpdates = [];

        for (let order of ordersData) {
            const { _id, bv, customerId, pinId } = order;
            if (bv <= 0 || !customerId) continue;

            const user = customerId;

            if (!user || user.accountStatus.activeStatus === 0 || user.accountStatus.blockStatus === 1) continue;
            

            const remainingCapping = await common.getTotalUserCappingStatus(user._id);

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
                    remark: `${walletSettingsData.name} of $ ${payable} generated`,
                    response: _id.toString(),
                    status: 1
                });
                console.log("Payable:", payable, "User:", user._id, "Wallet:", walletSettingsData.wallet, "Post Wallet Balance:", postWalletBalance);
                walletUpdates.push(
                    common.manageWalletAmounts(user._id, 'roi', payable),
                    common.manageWalletAmounts(user._id, walletSettingsData.wallet, payable * 0.25),
                    common.manageWalletAmounts(user._id, 'weekly_pool', payable * 0.45),
                    common.manageWalletAmounts(user._id, 'monthly_pool', payable * 0.30),
                );
                await roi_level_commission(user._id, payable, 25);
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
        // console.log("Level Entered:");
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

            const uData = await User.findOne({ _id: currentUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!uData || !currentUCode) continue;
            const sponsorUCode = uData.uSponsor;

            if (!sponsorUCode) break;
            const sData = await User.findOne({ _id: sponsorUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!sData) break;
            currentUCode = sData._id;

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
                    source,
                    amount: payable,
                    txCharge: 0,
                    currentWalletBalance,
                    postWalletBalance,
                    remark: `${walletSettingsData.name} of $  ${payable} generated from ${txUData.username}`,
                    response: counter,
                    status: 1
                });
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
        // console.log("Level Entered:");
        const txUData = await User.findOne({ _id: uCode }, 'username');
        if (!txUData) return;
        const source = 'roi_level_commission';
        const plan = await common.planData('roi_level_commission');
        if (!plan) return;
        const directReq = await common.planData('roi_level_commission_direct');
        if (!directReq) return;

        const walletSettings = await WalletSettings.find({ slug: source, type: 'income', universal: 1 })
            .lean();
        const roiLevelSettings = walletSettings.find(ws => ws.slug === source);

        let currentUCode = uCode;
        const transactions = [];
        const walletUpdates = [];

        for (let counter = 1; counter <= Math.min(level, plan.value.length); counter++) {

            const walletSettingsData = roiLevelSettings;
            if (!walletSettingsData) break;

            const uData = await User.findOne({ _id: currentUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!uData || !currentUCode) continue;
            const sponsorUCode = uData.uSponsor;

            if (!sponsorUCode) break;
            const sData = await User.findOne({ _id: sponsorUCode, "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 });
            if (!sData) break;
            currentUCode = sData._id;

            const remainingCapping = await common.getTotalUserCappingStatus(currentUCode);

            if (remainingCapping === 0) continue;

            let payable = (parseFloat(plan.value[counter - 1]) * amount) / 100;
            if (payable > remainingCapping) payable = remainingCapping;

            if (payable > 0) {
                const reqDirects = parseFloat(directReq.value[counter - 1]);
                const myActives = await team.myActiveDirects(currentUCode);
                if (myActives.length < reqDirects) continue;

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
                    remark: `${walletSettingsData.name} of $  ${payable} generated from ${txUData.username}`,
                    response: counter,
                    status: 1
                });

                walletUpdates.push(
                    common.manageWalletAmounts(currentUCode, source, payable),
                    common.manageWalletAmounts(currentUCode, walletSettingsData.wallet, payable * 0.25),
                    common.manageWalletAmounts(currentUCode, 'weekly_pool', payable * 0.45),
                    common.manageWalletAmounts(currentUCode, 'monthly_pool', payable * 0.30),
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

async function resetWeeklyMonthlyPool() {
    try {
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, '_id');
        if (!usersData?.length) return;
        for (let user of usersData) {
            const uCode = user._id;
            const remainingCapping = await common.getTotalUserCappingStatus(uCode);
            if (remainingCapping > 0) continue;
            const weeklyBalance = await common.getBalance(uCode, 'weekly_pool');
            const monthlyBalance = await common.getBalance(uCode, 'monthly_pool');
            const instantBalance = await common.getBalance(uCode, 'instant_pool');
            await common.manageWalletAmounts(uCode, 'weekly_pool', -weeklyBalance);
            await common.manageWalletAmounts(uCode, 'monthly_pool', -monthlyBalance);
            await common.manageWalletAmounts(uCode, 'instant_pool', -instantBalance);
        }

    } catch (e) {
        console.error(`Error in resetWeeklyMonthlyPool: ${e.message}`);
    }
}

async function daily_direct() {
    try {
        const directTransactions = await IncomeTransaction.find({ source: 'direct', status: 1 }).lean();
        const source = 'direct';
        const destination = 'main_wallet';
        for (let transaction of directTransactions) {
            const counts = parseFloat(transaction.response);
            if (counts > 100) continue;
            const uCode = await User.findOne({ _id: transaction.uCode });
            if (!uCode) continue;
            await common.manageWalletAmounts(uCode._id, source, transaction.amount * 1 / 100);
            await addToWallet(uCode._id, source, destination, transaction.amount * 1 / 100);
            
            const newCounts = counts + 1;
            await IncomeTransaction.updateOne({ _id: transaction._id }, { $set: { response: newCounts.toString() } });
        }
        console.log(directTransactions.length);
    } catch (e) {
        console.error(`Error in daily_direct: ${e.message}`);
    }
}

async function instant_pool_to_main_wallet() {
    try {
        const source = 'instant_pool';
        const destination = 'main_wallet';
        const walletSettings = await WalletSettings.findOne({ slug: source }).lean();
        if (!walletSettings) {
            console.log('No wallet settings found for slug:', source);
            return;
        }
        const walletColumn = walletSettings.column;

        const wallets = await Wallet.find({ [walletColumn]: { $gt: 0 } }).lean();
        if (wallets.length === 0) {
            console.log(`No wallets found with ${walletColumn} > 0`);
            return;
        }
        for (let wallet of wallets) {
            const uCode = wallet.uCode;
            const walletBalance = wallet[walletColumn];
            if (walletBalance > 0) {
                // console.log(`Transferring ${walletBalance} from ${source} to ${destination} for user ${uCode}`);
                await addToWallet(uCode, source, destination, walletBalance);
                await common.manageWalletAmounts(uCode, source, -walletBalance);
            }
        }
    } catch (e) {
        console.error(`Error in instant_pool_to_main_wallet: ${e.message}`);
    }
}

async function sdfhjj(uCode) {
    try {
        await connectDB();
        const updateBalance = 2;
        const totalTeamBusiness = await businessUtils.getTopLegs(uCode);
        console.log("totalTeamBusiness:", totalTeamBusiness);
        // totalTeamBusiness: [ 600, 700, 900, 100 ]
        const totalBV = totalTeamBusiness.reduce((acc, val) => acc + val, 0);
        console.log("totalBV:", totalBV);

    } catch (e) {
        console.error(`Error in sdfhjj: ${e.message}`);
    }

}

async function roi_level_commission_inc() {
    try {
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, '_id');
        if (!usersData?.length) return;
        for (let user of usersData) {
            const uCode = user._id;
            // get orders which are createdAt within last 30 days
            const ordersData = await Orders.find({
                customerId: uCode,
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                status: 1
            });
            if (!ordersData?.length) continue;
            // sum orders bv
            const totalSelfBV = ordersData.reduce((acc, order) => acc + order.bv, 0);
            if (totalSelfBV < 500) continue;
            const directs = await team.myActiveDirects(uCode);
            if (!directs?.length) continue;
            const directCount = directs.length;
            if (directCount < 5) continue;
            const totalTeamBusiness = await businessUtils.getTopLegs(uCode);
            if (!totalTeamBusiness?.length) continue;
            // sum totalTeamBusiness array values
            const totalBV = totalTeamBusiness.reduce((acc, val) => acc + val, 0);
            if (totalBV < 3000) continue;
            // update users.specialStatus
            await User.updateOne({ _id: uCode }, { $set: { specialStatus: 1 } });
        }
    } catch (e) {
        console.error(`Error in roi_level_commission_inc: ${e.message}`);
    }
}


//  Rank Decide
async function rankDecide() {
    try {
        const rankData = await common.rankSettings();
        if (!rankData?.length) return;

        // Extract rank criteria arrays
        const rankLevels = rankData.find(r => r.slug === 'rank')?.value.map(Number) || [];
        const selfBusinessLevels = rankData.find(r => r.slug === 'self_business')?.value.map(Number) || [];
        const directTeamLevels = rankData.find(r => r.slug === 'direct_team')?.value.map(Number) || [];
        const directBusinessLevels = rankData.find(r => r.slug === 'direct_business')?.value.map(Number) || [];
        const downlineAchieversLevels = rankData.find(r => r.slug === 'downline_achievers')?.value.map(Number) || [];
        const totalTeamBusinessLevels = rankData.find(r => r.slug === 'total_team_business')?.value.map(Number) || [];
        const totalTeamSizeLevels = rankData.find(r => r.slug === 'total_team_size')?.value.map(Number) || [];

        // Fetch active users
        const usersData = await User.find(
            { "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }
        );
        if (!usersData?.length) return;

        for (let user of usersData) {
            const uCode = user._id;

            // Get user's self business (myPackage)
            const myPackage = await businessUtils.myPackage(uCode);
            if (!myPackage || myPackage < 0) continue;

            // Get direct team
            const directTeam = await team.myActiveDirects(uCode);
            if (!directTeam || directTeam.length === 0) continue;

            // Calculate direct business (sum of packages of direct team members)
            const directBusiness = await Promise.all(
                directTeam.map(async (directMemberId) => {
                    return await businessUtils.myPackage(directMemberId);
                })
            ).then(results => {
                return results.reduce((sum, value) => sum + (value || 0), 0);
            });
            if (!directBusiness || directBusiness < 0) continue;

            // Get total team (including personal)
            const teamData = await team.mygenerationWtihPersonal(uCode);
            if (!teamData || teamData.length === 0) continue;

            // Calculate total team business
            const teamBusiness = await Promise.all(
                teamData.map(async (memberId) => {
                    return await businessUtils.myPackage(memberId);
                })
            ).then(results => {
                return results.reduce((sum, value) => sum + (value || 0), 0);
            });
            if (!teamBusiness || teamBusiness < 0) continue;

            // Calculate downline achievers (users in team with rank >= 3)
            const downlineAchievers = await User.countDocuments({
                _id: { $in: teamData },
                myRank: { $gte: 3 }
            });

            // Determine rank
            let userRank = 0; // Default to no rank
            for (let i = 0; i < rankLevels.length; i++) {
                if (
                    myPackage >= selfBusinessLevels[i] &&
                    directTeam.length >= directTeamLevels[i] &&
                    directBusiness >= directBusinessLevels[i] &&
                    teamData.length >= totalTeamSizeLevels[i] &&
                    teamBusiness >= totalTeamBusinessLevels[i] &&
                    downlineAchievers >= downlineAchieversLevels[i]
                ) {
                    userRank = rankLevels[i]; // Assign the highest qualifying rank
                } else {
                    break; // Stop checking higher ranks if conditions fail
                }
            }

            // Update user rank if changed
            if (userRank !== user.myRank) {
                await User.updateOne(
                    { _id: uCode },
                    { $set: { myRank: userRank } }
                );
                console.log(`User: ${uCode}, Updated Rank: ${userRank}`);
            }
        }
    } catch (e) {
        console.error('Error defining ranks:', e);
    }
}

async function rewarDistribution() {
    try {
        console.log("Reward Distribution Started");
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0, myRank: { $gt: 0 } }, '_id myRank');
        if (!usersData?.length) return;
        const source = 'reward';
        const wallet = 'main_wallet';
        const walletSettings = await WalletSettings.findOne({ slug: source }).lean();
        console.log("walletSettings:", walletSettings);
        if (!walletSettings) return;
        let rewardCount = 0;
        for (let user of usersData) {
            const uCode = user._id;
            const userRank = user.myRank;
            const inStringRank = userRank.toString();
            const finderArraylength = Number(userRank) - 1;
            const rankTimesCondition = await RankSettings.findOne({ slug: 'months' });
            if (!rankTimesCondition) return;
            const rankTimes = rankTimesCondition.value[finderArraylength];
            const rankTimesValue = Number(rankTimes);
            // find incomeTransactions of source: reward, uCode
            const incomeTransaction = await IncomeTransaction.find({ source, uCode, response: inStringRank }).lean();
            if (!incomeTransaction?.length) {
                rewardCount = 0;
            } else {
                rewardCount = incomeTransaction.length;
            }
            if (rewardCount < rankTimesValue) {
                const rewardAmount = await RankSettings.findOne({ slug: 'reward' });
                if (!rewardAmount) return;
                const reward = rewardAmount.value[finderArraylength - 1];
                const payable = Number(reward);
                const remainingCapping = await common.getTotalUserCappingStatus(uCode);
                if (remainingCapping === 0) continue;
                if (payable > remainingCapping) payable = remainingCapping;
                if (payable > 0) {
                    const currentWalletBalance = await common.getBalance(uCode, wallet);
                    const postWalletBalance = currentWalletBalance + payable;
                    const transaction = new IncomeTransaction({
                        uCode,
                        txType: "income",
                        walletType: "",
                        source,
                        amount: payable,
                        txCharge: 0,
                        currentWalletBalance,
                        postWalletBalance,
                        remark: `${walletSettings.name} of $ ${payable} generated`,
                        response: userRank.toString(),
                        status: 1
                    });
                    await transaction.save();
                    await Promise.all([
                        transaction.save(),
                        common.manageWalletAmounts(uCode, source, payable),
                        common.manageWalletAmounts(uCode, wallet, payable),
                        common.manageWalletAmounts(uCode, 'capping', payable),
                    ]);
                }
            }
        }
    } catch (e) {
        console.error(`Error in rewarDistribution: ${e.message}`);
    }
}

module.exports = {
    daily_direct,
    resetWeeklyMonthlyPool,
    roiIncome,
    weeklyDistribution,
    monthlyDistribution,
    level,
    roi_level_commission,
    instant_pool_to_main_wallet,
    roi_level_commission_inc,
    sdfhjj,
    rankDecide,
    rewarDistribution
};