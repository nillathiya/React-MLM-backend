const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const CryptoJS = require("crypto-js");
const envConfig = require('../config/envConfig');
// import { REQUIRED_FIELD } from "../../../helpers/APIConstant";
const common = require('../helpers/common');
const { User, Transaction, FundTransaction, IncomeTransaction, WalletSettings, Wallet } = require('../models/DB');
const transactionHelper = require('../helpers/transaction');


exports.getAllTransactions = async (req, res, next) => {
    try {
        if (req._IS_ADMIN_ACCOUNT) {
            const allTransactions = await Transaction.find({})
                .populate("txUCode", "name email contactNumber username")
                .populate("uCode", "name email contactNumber username");

            return res.status(200).json(new ApiResponse(200, allTransactions, "Fetch All Transactions successfully"))

        } else {
            throw new ApiError(400,
                "Only admin accounts can view all transactions"
            )

        }
    } catch (err) {
        next(err);
    }
};

exports.createFundTransactionRequest = async (req, res, next) => {
    const vsuser = req.user;
    const postData = req.body;
    try {
        const validateFields = [
            "txType",
            "debitCredit",
            "amount",
            "walletType",
            "method",
        ];
        const response = await common.requestFieldsValidation(
            validateFields,
            postData
        );

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
        }

        if (postData.txUCode) {
            const user = await Users.findOne({ _id: postData.txUCode });
            if (!user) {
                return res.json({
                    status: "error",
                    data: "user not found",
                });
            }
        }
        const data = {
            uCode: vsuser._id,
        };
        if (postData.txUCode) {
            data.txUCode = postData.txUCode;
        }

        [
            "txType",
            "debitCredit",
            "amount",
            "walletType",
            "method",
            "paymentSlip",
            "txNumber",
        ].forEach((item) => {
            if (postData[item] != undefined && postData[item] != "") {
                data[item] = postData[item];
            }
        });
        data.currentWalletBalance = 0;
        const lastTransaction = await FundTransaction.findOne({
            uCode: vsuser._id,
            txType: postData.txType
        }).sort({
            createdAt: -1,
        });

        if (lastTransaction) {
            data.postWalletBalance = lastTransaction.currentWalletBalance;
            data.currentWalletBalance = lastTransaction.currentWalletBalance;
        } else {
            data.postWalletBalance = 0;
        }

        if (postData.debitCredit === "DEBIT") {
            data.currentWalletBalance = data.currentWalletBalance - postData.amount;
        } else {
            data.currentWalletBalance = data.currentWalletBalance + postData.amount;
        }

        if (data.currentWalletBalance < 0) {
            throw new ApiError(400, "Insufficient Balance")
        }

        const newFundTransaction = new FundTransaction(data);
        const tResponse = await newFundTransaction.save();

        // Optionally, update user balance or perform other operations
        // const user = await User.findById(fundRequestData.uCode);
        // if (user) {
        //   user.walletBalance += fundRequestData.amount; // Adjust logic as necessary
        //   await user.save();
        // }

        return res.status(200).json(new ApiResponse(200, tResponse, "Fund Request send successfully"))

    } catch (err) {
        next(err);
    }
};

exports.getAllFundTransactions = async (req, res, next) => {
    const { status, txType } = req.body;

    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(400, "Only admin accounts can view all fund transactions");
        }

        let filter = {};

        if (typeof status !== "undefined") {
            filter.status = status;
        }

        if (txType) {
            filter.txType = txType;
        }

        // Fetch transactions based on filters
        const allTransactions = await FundTransaction.find(filter)
            .populate("txUCode", "name email contactNumber username")
            .populate("uCode", "name email contactNumber username");

        return res.status(200).json(new ApiResponse(200, allTransactions, "Fund transactions fetched successfully"));

    } catch (err) {
        next(err);
    }
};


exports.verifyTransaction = async (req, res, next) => {
    const userId = req.user?._id;
    try {
        const { txHash, amount, userAddress } = req.body;

        // Verify transaction
        const result = await transactionHelper.verify(txHash, amount, userAddress);

        let status = result.status === "true" ? 1 : 0;
        if (status !== 1) {
            throw new ApiError(400, "Invalid Transaction");
        }
        let walletType = 'fund_wallet';
        const currentWalletBalance = await common.getBalance(userId, walletType);

        // Insert transaction record in MongoDB
        const transaction = new FundTransaction({
            walletType,
            txType: "add_fund",
            debitCredit: "credit",
            uCode: userId,
            amount,
            paymentSlip: `${amount} USDT`,
            criptAddress: userAddress,
            currentWalletBalance,
            postWalletBalance: Number(currentWalletBalance) + Number(amount),
            criptoType: "USDT",
            status,
            txRecord: txHash,
            remark: status ? "Fund Added" : "Transaction Failed",
        });

        await transaction.save();

        const populatedTransaction = await FundTransaction.findById(transaction._id)
            .populate("txUCode", "name email contactNumber username")
            .populate("uCode", "name email contactNumber username");

        await common.manageWalletAmounts(transaction.uCode, transaction.walletType, transaction.amount);
        if (status === 1) {
            return res.status(200).json(new ApiResponse(200, populatedTransaction, "USDT added Successfully"));
        } else {
            throw new ApiError(400, "Transaction verification failed")
        }
    } catch (error) {
        next(error);
    }
};

exports.userFundTransfer = async (req, res, next) => {
    const vsuser = req.user;
    const postData = req.body;
    try {
        // Validate required fields
        const validateFields = ["username", "amount", "walletType", "txType"];
        const response = await common.requestFieldsValidation(validateFields, postData);

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
        }

        if (isNaN(postData.amount) || postData.amount <= 0) {
            throw new ApiError(400, "Amount must be a valid positive number")
        }

        // const userId = postData.userId;
        const receiverUser = await User.findOne({ username: postData.username });
        if (!receiverUser) {
            throw new ApiError(400, "Receiver User is not found");
        }

        const walletSettingTable = await WalletSettings.find({});
        if (!walletSettingTable.length) {
            throw new ApiError(400, "Wallet settings not configured");
        }

        // sender wallet
        const userWallet = await Wallet.findOne({ uCode: vsuser._id });
        // receiver wallet
        let userToWallet = await Wallet.findOne({ uCode: receiverUser._id });

        if (!userWallet) {
            throw new ApiError(404, "your's wallet not found");
        }

        if (!userToWallet) {
            const walletData = { uCode: receiverUser._id, username: receiverUser.username || 'Unknown' };
            userToWallet = new Wallet(walletData);
            await userToWallet.save();
        }

        let data = { mainWalletBalance: 0, fundWalletBalance: 0 };
        data.mainWalletBalance = await common.getWalletBalance(walletSettingTable, userWallet, "main_wallet");
        data.fundWalletBalance = await common.getWalletBalance(walletSettingTable, userWallet, "fund_wallet");

        // Check for sufficient balance
        if (postData.walletType === "fund_wallet" && data.fundWalletBalance < postData.amount) {
            throw new ApiError(404, "Insufficient funds in the fund wallet");
        }

        if (postData.walletType === "main_wallet" && data.mainWalletBalance < postData.amount) {
            throw new ApiError(404, "Insufficient funds in the main wallet");
        }

        // Prepare the transaction payload
        const transactionPayload = {
            txUCode: receiverUser._id,
            uCode: vsuser._id,
            txType: postData?.txType || "user_fund_transfer",
            debitCredit: "DEBIT",
            walletType: postData.walletType,
            amount: postData.amount,
            method: "ONLINE",
            status: 1,
            isRetrieveFund: postData.isRetrieveFund || false,
            txStatus: 1,
            remark: `${vsuser.username} sent $${postData.amount} to ${receiverUser.username}`
        };

        // Get last transaction details
        const lastTransaction = await FundTransaction.findOne({
            uCode: vsuser._id,
            txType: postData.txType
        }).sort({ createdAt: -1 });

        transactionPayload.currentWalletBalance = lastTransaction?.currentWalletBalance || 0;
        transactionPayload.postWalletBalance = lastTransaction?.currentWalletBalance || 0;

        // if (postData.debitCredit === "DEBIT") {
        transactionPayload.currentWalletBalance =
            transactionPayload.currentWalletBalance - postData.amount;
        // } else {
        //   transactionPayload.currentWalletBalance =
        //     transactionPayload.currentWalletBalance + postData.amount;
        // }

        // if (transactionPayload.currentWalletBalance < 0) {
        //   return res.status(400).json({
        //     status: "error",
        //     message: "Insufficient balance after transaction",
        //   });
        // }

        // Create a new transaction record
        const newTransaction = new FundTransaction(transactionPayload);
        const tResponse = await newTransaction.save();
        if (!tResponse) {
            throw new ApiError(500, "Failed to create transaction")
        }

        const populatedTransaction = await FundTransaction.findById(tResponse._id)
            .populate("uCode", "username")
            .exec();

        // Add funds to receiver wallet
        const manageReceiverTransaction = await common.manageWalletAmounts(receiverUser._id, postData.walletType, postData.amount);

        // Debit amount from sender wallet
        const transferAmount = postData.amount;
        const senderUserAmount = -transferAmount;
        const manageSenderTransaction = await common.manageWalletAmounts(vsuser._id, postData.walletType, senderUserAmount);

        if (!manageSenderTransaction.status) {
            throw new ApiError(500, "Failed to debit amount from sender's wallet. Please try again.");
        }

        if (!manageReceiverTransaction.status) {
            throw new ApiError(500, "Failed to credit amount to receiver's wallet. Please try again.");
        }

        res.status(200).json(new ApiResponse(200, populatedTransaction, "Transaction completed successfully"));
    } catch (err) {
        next(err);
    }
};

exports.userConvertFunds = async (req, res, next) => {
    const vsuser = req.user;
    const postData = req.body;
    try {
        const validateFields = ["amount", "walletType", "fromWalletType", "txType"];
        const response = await common.requestFieldsValidation(
            validateFields,
            postData
        );
        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
        }

        const userId = vsuser._id;
        const walletSettingTable = await WalletSettings.find({});
        if (!walletSettingTable.length) {
            throw new ApiError(400, "Wallet Settings not found")
        }
        const userWallet = await Wallet.findOne({
            uCode: userId,
        });
        if (!userWallet) {
            throw new ApiError(400, "Wallet not found");
        }

        const fromWalletType = postData.fromWalletType;
        const walletType = postData.walletType;

        const fromWalletBalance = common.getWalletBalance(
            walletSettingTable,
            userWallet,
            fromWalletType
        );

        if (fromWalletBalance < postData.amount) {
            throw new ApiError(400, "Insufficient balance")
        }

        // from wallet
        const amount = parseFloat(postData.amount);
        const transferAmount = 0 - amount;
        const mangeFromWalletTransaction = await common.manageWalletAmounts(
            userId,
            fromWalletType,
            transferAmount
        );
        if (!mangeFromWalletTransaction.status) {
            throw new ApiError(400, mangeWalletTransaction.message || "Transaction Failed.Please try later")
        }

        const mangeWalletTransaction = await common.manageWalletAmounts(
            userId,
            walletType,
            amount
        );
        if (!mangeWalletTransaction.status) {
            throw new ApiError(400, mangeWalletTransaction.message || "Transaction Failed.Please try later")
        }

        const transactionPayload = {
            uCode: userId,
            txType: postData.txType,
            debitCredit: "DEBIT",
            walletType: walletType,
            fromWalletType: fromWalletType,
            amount: postData.amount,
            method: "ONLINE",
            status: 1,
            isRetrieveFund: false,
            remark: `${vsuser.username} converted $${postData.amount} from ${fromWalletType} to ${walletType}`,
        };

        const newTransaction = new FundTransaction(transactionPayload);
        const tResponse = await newTransaction.save();
        if (!tResponse) {
            throw new ApiError(400, "Transaction Failed.Please try later")

        }
        const populatedTransaction = await FundTransaction.findById(tResponse._id)
            .populate("uCode", "username")
            .exec();
        return res.status(200).json(new ApiResponse(200, populatedTransaction, "Fund Convert successfully"));
    } catch (err) {
        next(err)
    }
};

// routeHandler.updateFundTransaction = async (req, res) => {
//     const vsuser = req.vsuser;
//     const postData = req.body;
//     try {

//         // Authorization check
//         if (!req._IS_ADMIN_ACCOUNT) {
//             return res.status(403).json({
//                 status: "error",
//                 message: "You are not authorized to update transactions",
//             });
//         }
//         // Validate required fields
//         const validateFields = ["id"];
//         const response = await common.requestFieldsValidation(
//             validateFields,
//             postData
//         );
//         if (!response.status) {
//             return res.json({
//                 status: "error",
//                 data: REQUIRED_FIELD,
//             });
//         }
//         // Find the transaction by ID
//         const currentTransaction = await FundTransaction.findById(postData.id);
//         if (!currentTransaction) {
//             return res.json({
//                 status: "error",
//                 data: "Transaction not found",
//             });
//         }
//         // Fetch the user associated with the transaction
//         const user = await Users.findById(currentTransaction.uCode);
//         if (!user) {
//             return res.json({
//                 status: "error",
//                 data: "user not found",
//             });
//         }
//         // Prepare update data
//         const data = {
//             status: postData.status,
//         };

//         // Handle approval of the fund transaction
//         if (
//             postData?.status !== currentTransaction.status &&
//             postData?.status === 1
//         ) {
//             const fundWallet = await WalletSettings.findOne({
//                 slug: "fund_wallet",
//             });
//             if (!fundWallet || !fundWallet.type) {
//                 return res.json({
//                     status: "error",
//                     message: "Fund wallet not found",
//                 });
//             }
//             const stringFundData = JSON.stringify(fundWallet);
//             const jsonFundData = JSON.parse(stringFundData);
//             const walletColumn = jsonFundData["column"];
//             const wallet = await Wallet.findOne({
//                 uCode: user._id,
//             });
//             if (!wallet) {
//                 // create wallet
//                 const walletData = {
//                     uCode: user._id,
//                     username: user.username,
//                 };
//                 walletData[walletColumn] = currentTransaction.amount;
//                 const newWallet = new Wallet(walletData);
//                 await newWallet.save();
//             } else {
//                 const oldAmount = wallet[walletColumn];
//                 let newAmount = oldAmount;
//                 if (currentTransaction.debitCredit === "CREDIT") {
//                     newAmount = oldAmount + currentTransaction.amount;
//                     // update wallet
//                     const walletUpdatedData = {
//                         [walletColumn]: newAmount,
//                     };
//                     await Wallet.findByIdAndUpdate(wallet._id, walletUpdatedData, {
//                         new: true,
//                     });
//                 } else {
//                     newAmount = oldAmount - currentTransaction.amount;
//                     if (newAmount < 0) {
//                         return res.json({
//                             status: "error",
//                             message: "Insufficient Balance",
//                         });
//                     }
//                     // update wallet
//                     const walletUpdatedData = {
//                         [walletColumn]: newAmount,
//                     };
//                     await Wallet.findByIdAndUpdate(wallet._id, walletUpdatedData, {
//                         new: true,
//                     });
//                 }
//             }

//             const tResponse = await FundTransaction.findByIdAndUpdate(
//                 postData.id,
//                 data,
//                 {
//                     new: true,
//                 }
//             );
//             return res.json({
//                 status: "success",
//                 message: "Approved Successfully",
//                 data: tResponse,
//             });
//         }
//         // Handle rejection of the fund transaction
//         else if (postData?.status === 2) {
//             const tResponse = await FundTransaction.findByIdAndUpdate(
//                 postData.id,
//                 data,
//                 {
//                     new: true,
//                 }
//             );

//             return res.json({
//                 status: "success",
//                 message: "Rejected Successfully",
//                 data: tResponse,
//             });
//         } else {
//             return res.json({
//                 status: "success",
//                 message: "Already Approved",
//             });
//         }
//     } catch (err) {
//         return res.json({
//             status: "error",
//             message: "Server error",
//         });
//     }
// };

exports.getTransactionsByUser = async (req, res, next) => {
    const vsuser = req.user;
    try {
        const allTransactions = await Transaction.find({ uCode: vsuser._id })
            .populate("txUCode", "name email contactNumber username")
            .populate("uCode", "name email contactNumber username");


        return res.status(200).json(new ApiResponse(200, allTransactions, "Fetch User All Transactions successfully"));
    } catch (err) {
        next(err);
    }
};


exports.getFundTransactionsByUser = async (req, res, next) => {
    const { status, txType } = req.body;
    const vsuser = req.user;

    try {
        const filter = { uCode: vsuser._id };

        if (status) {
            filter.status = status;
        }
        if (txType) {
            filter.txType = txType;
        }

        const allTransactions = await FundTransaction.find(filter)
            .populate("txUCode", "name email contactNumber username")
            .populate("uCode", "name email contactNumber username");

        return res
            .status(200)
            .json(new ApiResponse(200, allTransactions, "Fetch User All Transactions successfully"));
    } catch (err) {
        next(err);
    }
};


exports.getUserIncomeTransactions = async (req, res, next) => {
    const { source } = req.query;
    const vsuser = req.user;
    try {
        const filter = { uCode: vsuser?._id };
        if (source) filter.source = source;

        const incomeTransactions = await IncomeTransaction.find(filter)
            .sort({ _id: 1 })
            .lean();

        const encryptedIncomeTransaction = CryptoJS.AES.encrypt(JSON.stringify(incomeTransactions), envConfig.CRYPTO_SECRET_KEY).toString();
        res.status(200).json(new ApiResponse(200, encryptedIncomeTransaction, "Income transactions retrieved successfully"));
    } catch (error) {
        next(error);
    }
};

exports.getAllIncomeTransactions = async (req, res, next) => {
    const postData = req.body;
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "UnAuthorized access")
        }
        const validateFields = ["txType"];
        const response = await common.requestFieldsValidation(
            validateFields,
            postData
        );
        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
        }
        const status = postData.status;
        const txType = postData.txType;


        const query = {};
        if (status !== undefined) {
            query.status = status;
        }
        if (txType !== "all") {
            query.txType = txType;
        }
        const allTransactions = await IncomeTransaction.find(query)
            .populate("txUCode", "username name")
            .populate("uCode", "username name");

        return res.status(200).json(new ApiResponse(200, allTransactions, "Get all income transactions successfully"))

    } catch (err) {
        next(err);
    }
};

exports.directFundTransfer = async (req, res, next) => {
    const vsuser = req.user;
    const postData = req.body;

    try {
        // Trim and validate input fields
        postData.username = postData.username?.trim();
        const requiredFields = ["username", "amount", "debitCredit", "walletType"];
        const validationResponse = await common.requestFieldsValidation(requiredFields, postData);

        if (!validationResponse.status) {
            throw new ApiError(400, `Missing fields: ${validationResponse.missingFields.join(", ")}`);
        }

        const { username, amount, debitCredit, walletType, isRetrieveFund, txType, tsxType, reason } = postData;

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            throw new ApiError(400, "Invalid amount. It must be a positive number.");
        }


        // Validate user existence
        const targetUser = await User.findOne({ username }).lean();
        if (!targetUser) {
            throw new ApiError(404, "User not found.");
        }

        const userId = targetUser._id;

        // Validate admin privileges
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized action.");
        }

        let balance = 0;
        let lastBalance = 0;

        // Fetch user wallet once

        const userWallet = await Wallet.findOne({ uCode: userId }).lean();
        if (!userWallet) {
            throw new ApiError(404, "User wallet not found.");
        }

        const walletSettings = await WalletSettings.find({});
        if (!walletSettings) {
            throw new ApiError(404, "Wallet settings not found.");
        }
        // Validate balance if retrieving funds
        if (isRetrieveFund && debitCredit === "DEBIT") {


            balance = await common.getWalletBalance(walletSettings, userWallet, walletType);
            if (balance < amount) {
                throw new ApiError(400, "Insufficient balance.");
            }
        } else {
            balance = await common.getWalletBalance(walletSettings, userWallet, walletType);
        }

        lastBalance = balance;


        console.log("vsuser", vsuser)
        // Create transaction payload
        const transactionPayload = {
            txUCode: userId,
            uCode: vsuser._id,
            txType: txType || "direct_fund_transfer",
            debitCredit,
            walletType,
            amount,
            method: "ONLINE",
            state: 1,
            isRetrieveFund: isRetrieveFund || false,
            reason,
            tsxType,
            currentWalletBalance: lastBalance,
            postWalletBalance: debitCredit === "DEBIT" ? lastBalance - amount : lastBalance + amount,
        };


        // Save the transaction
        const newTransaction = await new FundTransaction(transactionPayload).save();
        if (!newTransaction) {
            throw new ApiError(400, "Failed to create transaction.");
        }

        // Adjust wallet balance
        const transferAmount = debitCredit === "DEBIT" ? -amount : amount;
        const walletAdjustment = await common.manageWalletAmounts(userId, walletType, transferAmount);
        console.log("walletAdjustment", walletAdjustment)
        if (!walletAdjustment.status) {
            throw new ApiError(500, walletAdjustment.message || "Wallet adjustment failed.");
        }

        // Populate transaction with username
        const populatedTransaction = await FundTransaction.findById(newTransaction._id)
            .populate("uCode", "username name")
            .populate("txUCode", "username name")
            .lean();
        return res.status(200).json(new ApiResponse(200, populatedTransaction, "Fund Transfer Successful"));

    } catch (err) {
        next(err);
    }
};


// routeHandler.getUserWalletBalance = async (req, res) => {
//     const vsuser = req.vsuser;
//     const postData = req.body;
//     try {
//         const validateFields = ["userId"];
//         const response = await common.requestFieldsValidation(
//             validateFields,
//             postData
//         );
//         const userId = postData.userId;
//         if (!response.status) {
//             return res.json({
//                 status: "error",
//                 data: REQUIRED_FIELD,
//             });
//         }
//         const currentUser = await Users.findOne({ _id: userId });
//         if (!currentUser) {
//             return res.json({
//                 status: "error",
//                 message: "User not found",
//             });
//         }
//         if (!req._IS_ADMIN_ACCOUNT)
//             return res.json({
//                 status: "error",
//                 message: "You are not authorized to perform this action",
//             });

//         const walletSettingTable = await WalletSettings.find({});
//         if (!walletSettingTable.length) {
//             return res.json({
//                 status: 0,
//                 message: "Wallet not found",
//             });
//         }
//         const userWallet = await Wallet.findOne({
//             uCode: currentUser._id,
//         });
//         if (!userWallet) {
//             return res.json({
//                 status: "error",
//                 message: "Wallet not found",
//             });
//         }

//         let data = { mainWalletBalance: 0, fundWalletBalance: 0 };
//         data.mainWalletBalance = common.getWalletBalance(
//             walletSettingTable,
//             userWallet,
//             "main_wallet"
//         );
//         data.fundWalletBalance = common.getWalletBalance(
//             walletSettingTable,
//             userWallet,
//             "fund_wallet"
//         );
//         return res.json({
//             status: "success",
//             data: data,
//         });
//     } catch (err) {
//         res.json({
//             status: "error",
//             message: "Server error",
//         });
//     }
// };

// routeHandler.getRetrieveFunds = async (req, res) => {
//     const vsuser = req.vsuser;
//     try {
//         if (!req._IS_ADMIN_ACCOUNT)
//             return res.json({
//                 status: "error",
//                 message: "You are not authorized to perform this action",
//             });

//         const allTransactions = await FundTransaction.find({ isRetrieveFund: true })
//             .populate("txUCode", "name email contactNumber username")
//             .populate("uCode", "name email contactNumber username");

//         return res.json({
//             status: "success",
//             data: allTransactions,
//         });
//     } catch (err) {
//         res.json({
//             status: "error",
//             message: "Server error",
//         });
//     }
// };



// routeHandler.getWalletTransaction = async (req, res) => {
//     const vsuser = req.vsuser;
//     const postData = req.body;
//     try {
//         const validateFields = ["txType"];
//         const response = await common.requestFieldsValidation(
//             validateFields,
//             postData
//         );
//         if (!response.status) {
//             return res.json({
//                 status: "error",
//                 data: REQUIRED_FIELD,
//             });
//         }
//         const txType = postData.txType;
//         const status = postData.status;
//         if (req._IS_ADMIN_ACCOUNT) {
//             const query = {};
//             if (status !== undefined) {
//                 query.status = status;
//             }
//             if (txType !== "all") {
//                 query.txType = txType;
//             }

//             if (txType === "all") {
//                 const allTransactions = await FundTransaction.find(query)
//                     .populate("txUCode", "name email contactNumber username")
//                     .populate("uCode", "name email contactNumber username");

//                 return res.json({
//                     status: "success",
//                     data: allTransactions,
//                 });
//             }
//             const allTransactions = await FundTransaction.find(query)
//                 .populate("txUCode", "name email contactNumber username")
//                 .populate("uCode", "name email contactNumber username");

//             return res.json({
//                 status: "success",
//                 data: allTransactions,
//             });
//         }
//         const allTransactions = await FundTransaction.find({
//             txType: txType,
//             uCode: vsuser._id,
//         })
//             .populate("txUCode", "name email contactNumber username")
//             .populate("uCode", "name email contactNumber username");

//         return res.json({
//             status: "success",
//             data: allTransactions,
//         });
//     } catch (err) {
//         res.json({
//             status: "error",
//             message: "Server error",
//         });
//     }
// };

// async function handler(req, res) {
//     const { TransactionSlug } = req.query;
//     let routeFlag = true;

//     if (req.method === "POST") {
//         switch (TransactionSlug) {
//             case "getAllTransactions":
//                 await routeHandler.getAllTransactions(req, res);
//                 break;
//             case "getAllFundTransactions":
//                 await routeHandler.getAllFundTransactions(req, res);
//                 break;
//             case "getFundTransactionsByUser":
//                 await routeHandler.getFundTransactionsByUser(req, res);
//                 break;
//             case "getAllIncomeTransactions":
//                 await routeHandler.getAllIncomeTransactions(req, res);
//                 break;
//             case "createFundTransactionRequest":
//                 await routeHandler.createFundTransactionRequest(req, res);
//                 break;
//             case "updateFundTransaction":
//                 await routeHandler.updateFundTransaction(req, res);
//                 break;
//             case "directFundTransfer":
//                 await routeHandler.directFundTransfer(req, res);
//                 break;
//             case "getRetrieveFunds":
//                 await routeHandler.getRetrieveFunds(req, res);
//                 break;
//             case "userFundTransfer":
//                 await routeHandler.userFundTransfer(req, res);
//                 break;
//             case "userConvertFunds":
//                 await routeHandler.userConvertFunds(req, res);
//                 break;
//             case "getWalletTransaction":
//                 await routeHandler.getWalletTransaction(req, res);
//                 break;
//             case "getUserWalletBalance":
//                 await routeHandler.getUserWalletBalance(req, res);
//                 break;
//             default:
//                 routeFlag = false;
//         }
//     } else {
//         routeFlag = false;
//     }

//     if (!routeFlag) {
//         res.status(404).send("No route found.");
//     }
// }

// export default authMiddleware(handler);
