const express = require("express");
const router = express.Router();

const {verifyJwt}=require('../middlewares/auth.middleware');
const withdrawalController = require("../controllers/withdrawal.controller");

router.post("/create-request",verifyJwt, withdrawalController.createRequest);
router.post("/update-request",verifyJwt, withdrawalController.updateRequest);
router.post("/get-all-transactions",verifyJwt, withdrawalController.getAllWithdrawalTransactions);
router.post("/get-user-transactions",verifyJwt, withdrawalController.getUserWithdrawalTransactions);
router.post("/delete-transaction",verifyJwt, withdrawalController.deleteTransaction);

module.exports = router;
