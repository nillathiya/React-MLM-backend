const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/admin/create", authController.registerAdmin);
router.post("/admin/login", authController.adminLogin);
router.post("/user/login", authController.userLogin);

module.exports = router;
 