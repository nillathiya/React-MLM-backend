const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders.controller");
const { verifyJwt } = require('../middlewares/auth.middleware');

router.post("/delete", orderController.deleteOrder);
router.post("/user", verifyJwt, orderController.getUserOrders);
router.post("/get-all", verifyJwt, orderController.getAllOrders);
router.post("/update/:orderId", verifyJwt, orderController.updateOrder);
router.post("/get/:orderId", verifyJwt, orderController.getOrderById);

module.exports = router;
