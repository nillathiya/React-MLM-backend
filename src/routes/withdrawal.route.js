const express = require("express");
const router = express.Router();

const {verifyJwt}=require('../middlewares/auth.middleware');
const withdrawalController = require("../controllers/withdrawal.controller");

router.post("/request",verifyJwt, withdrawalController.createRequest);

module.exports = router;
