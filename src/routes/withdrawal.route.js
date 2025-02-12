const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawal.controller");

router.post("/request", withdrawalController.createRequest);

module.exports = router;
 