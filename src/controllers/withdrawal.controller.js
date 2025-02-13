// import { authMiddleware } from "../../../lib/authMiddleware";
const {FundTransaction,Wallet,WalletSettings}=require('../models/DB');
const common =require('../helpers/common');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
// import { REQUIRED_FIELD } from "../../../helpers/APIConstant";
// import { isEmpty } from "lodash";

exports.createRequest = async (req, res,next) => {
  const vsuser = req.user;
  const postData = req.body;
  try {
    const validateFields = ["txType", "debitCredit", "amount", "walletType"];
    const response = await common.requestFieldsValidation(
      validateFields,
      postData
    );
    if (!response.status) {
        throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
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

    const walletSettingTable = await WalletSettings.find({});
    if (!walletSettingTable.length) {
      throw new ApiError(400,  "Wallet not found")
    }
    const userWallet = await Wallet.findOne({
      uCode: vsuser._id,
    });
    if (!userWallet) {
        throw new ApiError(400,  "Wallet not found")
      
    }
    const walletType = postData.walletType;
    const currentWalletBalance = common.getWalletBalance(
      walletSettingTable,
      userWallet,
      walletType
    );

    if (postData.amount > currentWalletBalance) {
        throw new ApiError(400, "Insufficient balance")
    }
    //
    const transferAmount = 0 - postData.amount;
    const mangeTransaction = await common.mangeWalletAmounts(
      vsuser._id,
      walletType,  
      transferAmount
    );
    if (!mangeTransaction.status) {
        throw new ApiError(400,  mangeTransaction.message)
    }

    data.postWalletBalance = currentWalletBalance;

    data.currentWalletBalance = currentWalletBalance - postData.amount;
    const transaction = new FundTransaction(data);
    const newTransaction = await transaction.save();

    return res.status(200).json(new ApiResponse(200,newTransaction,"success"))
  } catch (err) {
     next(err) 
}
};

// routeHandler.updateTransactions = async (req, res) => {
//   const postData = req.body;

//   try {
//     // Check if the user is an admin
//     if (!req._IS_ADMIN_ACCOUNT) {
//       throw new ApiError(401,"Unauthorized access");
//     }

//     // Validate required fields
//     const validateFields = ["id"];
//     const response = await common.requestFieldsValidation(validateFields, postData);
//     if (!response.status) {
//       return res.status(400).json({
//         status: "error",
//         message: "Required field(s) missing: id",
//       });
//     }

//     // Ensure the ID is a valid ObjectId
//     if (!postData.id.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({
//         status: "error",
//         message: "Invalid transaction ID format",
//       });
//     }

//     // Fetch the transaction by ID
//     const transaction = await FundTransaction.findById(postData.id);
//     if (!transaction) {
//       return res.status(404).json({
//         status: "error",
//         message: "Transaction not found",
//       });
//     }

//     // Handle wallet update if transaction is canceled (status = 2)
//     if (postData.status === 2) {
//       const manageTransaction = await common.mangeWalletAmounts(
//         transaction.uCode,
//         transaction.walletType,
//         transaction.amount
//       );

//       if (!manageTransaction.status) {
//         return res.status(400).json({
//           status: "error",
//           message: manageTransaction.message,
//         });
//       }
//     }

//     // Prepare the fields to update
//     const set = {};
//     ["status", "response"].forEach((field) => {
//       if (postData[field] !== undefined && postData[field] !== "") {
//         set[field] = postData[field];
//       }
//     });

//     // Update the transaction
//     const updatedTransaction = await FundTransaction.findByIdAndUpdate(
//       postData.id,
//       { $set: set },
//       { new: true }
//     );

//     if (!updatedTransaction) {
//       return res.status(500).json({
//         status: "error",
//         message: "Failed to update the transaction",
//       });
//     }

//     // Return success response
//     return res.status(200).json({
//       status: "success",
//       message: "Transaction updated successfully",
//       data: updatedTransaction,
//     });
//   } catch (err) {
//     console.error("Error updating transaction:", { error: err, postData });
//     return res.status(500).json({
//       status: "error",
//       message: "Server error",
//     });
//   }
// };

// routeHandler.getTransactions = async (req, res) => {
//   const vsuser = req.vsuser;
//   const postData = req.body;
//   try {
//     if (req._IS_ADMIN_ACCOUNT) {
//       if (isEmpty(postData)) {
//         const allTransactions = await FundTransaction.find({
//           txType: "withdrawal",
//         })
//           .populate("txUCode", "name email contactNumber username")
//           .populate("uCode", "name email contactNumber username");
//         return res.json({
//           status: "success",
//           data: allTransactions,
//         });
//       } else {
//         const allTransactions = await FundTransaction.find({
//           txType: "withdrawal",
//           status: postData.status,
//         })
//           .populate("txUCode", "name email contactNumber username")
//           .populate("uCode", "name email contactNumber username");
//         return res.json({
//           status: "success",
//           data: allTransactions,
//         });
//       }
//     }
//     const allTransactions = await FundTransaction.find({
//       txType: "withdrawal",
//       uCode: vsuser._id,
//     })
//       .populate("txUCode", "name email contactNumber username")
//       .populate("uCode", "name email contactNumber username");
    
//     if (allTransactions.length === 0) {
//       return res.status(400).json({
//         status: "error",
//         message: "No transactions found",
//       });
//     }

//     return res.json({
//       status: "success",
//       data: allTransactions,
//     });
//   } catch (err) {
//     res.json({
//       status: "error",
//       message: "Server error",
//     });
//   }
// };

// routeHandler.deleteTransaction = async (req, res) => {
//   const postData = req.body;
//   try {
//     // Check if the user is an admin
//     if (!req._IS_ADMIN_ACCOUNT) {
//       return res.status(401).json({
//         status: "error",
//         message: "Unauthorized access",
//       });
//     }

//     // Validate required fields
//     const validateFields = ["id"];
//     const response = await common.requestFieldsValidation(validateFields, postData);

//     if (!response.status || !postData.id) {
//       return res.status(400).json({
//         status: "error",
//         message: "Transaction ID is required",
//       });
//     }

//     // Attempt to delete the transaction
//     const deletedTransaction = await FundTransaction.findByIdAndDelete(postData.id);

//     if (!deletedTransaction) {
//       return res.status(404).json({
//         status: "error",
//         message: "Transaction not found",
//       });
//     }

//     // Success response
//     return res.status(200).json({
//       status: "success",
//       message: "Transaction deleted successfully",
//       data: deletedTransaction,
//     });
//   } catch (err) {
//     console.error("Error deleting transaction:", err);
//     return res.status(500).json({
//       status: "error",
//       message: "Server error",
//     });
//   }
// };

// async function handler(req, res) {
//   const { withdrawalSlug } = req.query;
//   let routeFlag = true;

//   if (req.method === "POST") {
//     switch (withdrawalSlug) {
//       case "createRequest":
//         await routeHandler.createRequest(req, res);
//         break;
//       case "updateTransactions":
//         await routeHandler.updateTransactions(req, res);
//         break;
//       case "getTransactions":
//         await routeHandler.getTransactions(req, res);
//         break;
//       case "deleteTransaction":
//         await routeHandler.deleteTransaction(req, res);
//         break;
//       default:
//         routeFlag = false;
//     }
//   } else {
//     routeFlag = false;
//   }

//   if (!routeFlag) {
//     res.status(404).send("No route found.");
//   }
// }

// export default authMiddleware(handler);
