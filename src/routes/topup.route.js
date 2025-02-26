const express = require("express");
const router = express.Router();
const authController = require("../controllers/topup.controller");
const { verifyJwt } = require("../middlewares/auth.middleware");

router.post("/create",verifyJwt, authController.createTopUp);

module.exports = router;
 