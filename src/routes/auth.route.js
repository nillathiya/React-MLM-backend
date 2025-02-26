const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/admin/create", authController.registerAdmin);
router.post("/admin/login", authController.adminLogin);
router.post("/admin/get-all", authController.getAllAdmins);
router.post("/user/login", authController.userLogin);
router.post("/user/check-wallet", authController.checkWallet);
router.post("/logout", authController.logout);

module.exports = router;
 