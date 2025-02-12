const express = require("express");
const router = express.Router();
const { verifyJwt } = require('../middlewares/auth.middleware');
const transactionController = require("../controllers/transaction.controller");

router.post("/all", verifyJwt, transactionController.getAllTransactions);
router.post("/fund/all", verifyJwt, transactionController.getAllFundTransactions);
router.post("/fund/request", verifyJwt, transactionController.createFundTransactionRequest);
router.post("/fund/user", verifyJwt, transactionController.getFundTransactionsByUser);

module.exports = router;
