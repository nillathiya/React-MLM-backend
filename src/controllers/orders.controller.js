const { ApiError } = require("../utils/apiError");
const { Orders } = require('../models/DB');
const { ApiResponse } = require("../utils/apiResponse");

exports.getUserOrders = async (req, res, next) => {
  const { userId } = req.body;
  try {
    const userOrders = await Orders.find({ customerId: userId });
    res.status(200).json(new ApiResponse(200, userOrders, "Get User orders successfully"))
  } catch (error) {
    next(error)
  }
}
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      throw new ApiError(400, "Order ID is required")
    }

    // Delete order from "orders" collection
    const order = await Orders.findByIdAndDelete(orderId);
    if (!order) {
      throw new ApiError(400, "Order not found")
    }

    // Delete associated order items from "order_items" collection
    await OrderItem.deleteMany({ orderId });

    return res.status(200).json(new ApiResponse(200, {}, "Order Deleted successfully"))

  } catch (error) {
    next(error)
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    if (!req._IS_ADMIN_ACCOUNT) {
      throw new ApiError(403, "Unauthorized access")
    }
    const orders = await Orders.find({});
    res.status(200).json(new ApiResponse(200, orders, "Get All orders successfully"))
  } catch (error) {
    next(error)
  }
}