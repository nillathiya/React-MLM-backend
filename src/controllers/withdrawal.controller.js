// import { authMiddleware } from "../../../lib/authMiddleware";
const { FundTransaction, Wallet, WalletSettings, AdminSettings } = require('../models/DB');
const common = require('../helpers/common');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
// import { REQUIRED_FIELD } from "../../../helpers/APIConstant";
// import { isEmpty } from "lodash";

exports.createRequest = async (req, res, next) => {
  const vsuser = req.user;
  const postData = req.body;
  try {
    const validateFields = ["txType", "debitCredit", "amount", "walletType"];
    const response = await common.requestFieldsValidation(validateFields, postData);

    if (!response.status) {
      throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
    }

    if (postData.amount <= 0) {
      throw new ApiError(400, "Amount must be greater than zero");
    }

    const walletSettingTable = await WalletSettings.find({});
    if (!walletSettingTable.length) {
      throw new ApiError(404, "Wallet settings not found");
    }

    const userWallet = await Wallet.findOne({ uCode: vsuser._id });
    if (!userWallet) {
      throw new ApiError(404, "Wallet not found");
    }

    const walletType = postData.walletType;
    const currentWalletBalance = common.getWalletBalance(walletSettingTable, userWallet, walletType);

    const WithdrawalChargeSettings = await AdminSettings.findOne({ slug: "withdrawal_charge" });
    if (!WithdrawalChargeSettings) {
      throw new ApiError(404, "Withdrawal charge settings not found");
    }


    if (postData.amount > currentWalletBalance) {
      throw new ApiError(400, "Insufficient balance");
    }

    const transferAmount = -postData.amount;
    const mangeTransaction = await common.mangeWalletAmounts(vsuser._id, walletType, transferAmount);

    if (!mangeTransaction.status) {
      throw new ApiError(400, mangeTransaction.message);
    }

    // Update wallet balance before storing transaction
    const updatedWalletBalance = currentWalletBalance - postData.amount;

    const totalCharge = parseFloat(((WithdrawalChargeSettings.value * postData.amount) / 100).toFixed(2));

    const AdminCharge = parseFloat(((10 / WithdrawalChargeSettings.value) * totalCharge).toFixed(2));
    const wPoolCharge = parseFloat(((5 / WithdrawalChargeSettings.value) * totalCharge).toFixed(2));


    const newTransactionData = {
      uCode: vsuser._id,
      postWalletBalance: updatedWalletBalance,
      currentWalletBalance: updatedWalletBalance,
      txType: postData.txType,
      debitCredit: "DEBIT",
      walletType: postData.walletType,
      amount: postData.amount - totalCharge,
      txCharge: AdminCharge,
      wPool: wPoolCharge,
      remark: `Transaction ${postData.txType} of ${postData.amount} for ${walletType}`
    };


    const transaction = new FundTransaction(newTransactionData);
    const tResponse = await transaction.save();

    if (!tResponse) {
      throw new ApiError(400, "Transaction Failed. Please try later");
    }

    const populatedTransaction = await FundTransaction.findById(tResponse._id)
      .populate("uCode", "username name")
      .exec();

    return res.status(200).json(new ApiResponse(200, populatedTransaction, "Withdrawal request sent successfully"));
  } catch (err) {
    next(err);
  }
};

exports.updateRequest = async (req, res, next) => {
  const postData = req.body;

  try {
    if (!req._IS_ADMIN_ACCOUNT) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Validate required fields
    const validateFields = ["id"];
    const response = await common.requestFieldsValidation(validateFields, postData);
    if (!response.status) {
      throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
    }

    // Ensure the ID is a valid ObjectId
    if (!postData.id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid transaction ID format");
    }

    // Fetch the transaction by ID
    const transaction = await FundTransaction.findById(postData.id);
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }
    console.log("transaction", transaction)

    // Handle wallet update if transaction is canceled (status = 2)
    if (parseInt(postData.status, 10) === 2) {
      const refundAmount = transaction.amount + Number(transaction.txCharge || 0);
      const manageTransaction = await common.mangeWalletAmounts(
        transaction.uCode,
        transaction.walletType,
        refundAmount
      );

      if (!manageTransaction.status) {
        throw new ApiError(400, manageTransaction.message);
      }
    }

    // Prepare the fields to update
    const set = {};
    ["status", "response", "reason"].forEach((field) => {
      if (postData[field] !== undefined && postData[field] !== "") {
        set[field] = postData[field];
      }
    });

    // Update the transaction
    const updatedTransaction = await FundTransaction.findByIdAndUpdate(
      postData.id,
      { $set: set },
      { new: true }
    );

    if (!updatedTransaction) {
      throw new ApiError(500, "Failed to update the transaction");
    }

    const populatedTransaction = await FundTransaction.findById(updatedTransaction._id)
      .populate("uCode", "username name")
      .exec();

    return res.status(200).json(new ApiResponse(200, populatedTransaction, "Transaction updated successfully"));
  } catch (err) {
    next(err)
  }
};

exports.getAllWithdrawalTransactions = async (req, res, next) => {
  const vsuser = req.user;
  const postData = req.body;

  try {
    if (!req._IS_ADMIN_ACCOUNT) {
      throw new ApiError(403, "Unauthorized access");
    }

    let filter = { txType: "fund_withdrawal" };

    if (postData && typeof postData.status !== "undefined") {
      filter.status = postData.status;
    }

    const allTransactions = await FundTransaction.find(filter)
      .populate("txUCode", "name email contactNumber username")
      .populate("uCode", "name email contactNumber username")
      .lean();

    return res
      .status(200)
      .json(new ApiResponse(200, allTransactions, "Fetched withdrawal requests successfully"));
  } catch (err) {
    next(err);
  }
};


exports.getUserWithdrawalTransactions = async (req, res, next) => {
  const vsuser = req.user;
  const postData = req.body;

  try {
    let filter = { txType: "fund_withdrawal", uCode: vsuser._id };

    if (postData && Number.isInteger(postData.status)) {
      filter.status = postData.status;
    }

    const allTransactions = await FundTransaction.find(filter)
      .populate("txUCode", "name email contactNumber username")
      .populate("uCode", "name email contactNumber username")
      .sort({ createdAt: -1 }) // Sort by latest transactions
      .lean();

    return res
      .status(200)
      .json(new ApiResponse(200, allTransactions, "User withdrawal requests fetched successfully"));
  } catch (err) {
    next(err);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  const postData = req.body;

  try {
    // Check if the user is an admin
    if (!req._IS_ADMIN_ACCOUNT) {
      throw new ApiError(403, "Unauthorized access");
    }

    // Validate required fields
    const validateFields = ["id"];
    const response = await common.requestFieldsValidation(validateFields, postData);

    if (!response.status) {
      throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
    }

    // Ensure the ID is a valid ObjectId
    if (!postData.id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, "Invalid transaction ID format");
    }

    // Check if transaction exists before deleting
    const transaction = await FundTransaction.findById(postData.id);
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }

    // Delete the transaction
    await FundTransaction.findByIdAndDelete(postData.id);

    return res.status(200).json(new ApiResponse(200, {}, "Transaction deleted successfully"));

  } catch (err) {
    next(err);
  }
};
