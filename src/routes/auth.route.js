const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyJwt } = require('../middlewares/auth.middleware.js');

router.post("/admin/create", authController.registerAdmin);
router.post("/admin/login", authController.adminLogin);
router.post("/admin/get-all", authController.getAllAdmins);
router.post("/admin/impersonate", verifyJwt, authController.impersonation);
router.post("/admin/logout", authController.adminLogout);
router.post("/check-token", authController.checkUserToken);
router.post("/user/login", authController.userLogin);
router.post("/user/check-wallet", authController.checkWallet);
router.post("/user/logout", authController.userLogout);
router.post("/change-password", verifyJwt, authController.changePassword);

router.post("/check-sponsor", authController.checkSponsor);

module.exports = router;
