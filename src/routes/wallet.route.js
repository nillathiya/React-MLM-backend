const express = require("express");
const router = express.Router();
const walletController = require("../controllers/wallet.controller");
const {verifyJwt} = require("../middlewares/auth.middleware");

router.post("/create",walletController.createUserWallet); 
router.post("/user",verifyJwt,walletController.getUserWallet); 
router.post("/update",walletController.update); 

module.exports = router;

