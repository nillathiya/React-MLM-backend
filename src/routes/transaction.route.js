const express = require("express");
const router = express.Router();
const { verifyJwt } = require('../middlewares/auth.middleware');
const transactionController = require("../controllers/transaction.controller");

router.post("/get-all", verifyJwt, transactionController.getAllTransactions);
router.post("/user", verifyJwt, transactionController.getTransactionsByUser);
router.post("/fund/all", verifyJwt, transactionController.getAllFundTransactions);
router.post("/fund/request", verifyJwt, transactionController.createFundTransactionRequest);
router.post("/fund/user", verifyJwt, transactionController.getFundTransactionsByUser);
router.post("/verify", verifyJwt, transactionController.verifyTransaction);
router.post("/fund/transfer", verifyJwt, transactionController.userFundTransfer);
router.post("/fund/convert", verifyJwt, transactionController.userConvertFunds);
router.post("/income/user", verifyJwt, transactionController.getUserIncomeTransactions);
router.post("/income/all", verifyJwt, transactionController.getAllIncomeTransactions);

module.exports = router;
