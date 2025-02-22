const express = require("express");
const router = express.Router();
const walletController = require("../controllers/wallet.controller");

router.post("/create",walletController.createUserWallet); 
router.post("/user",walletController.getUserWallet); 
router.post("/update",walletController.update); 

module.exports = router;

