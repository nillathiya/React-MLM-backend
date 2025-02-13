const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders.controller");

router.post("/delete", orderController.deleteOrder);


module.exports = router;
