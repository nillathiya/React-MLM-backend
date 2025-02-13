const { ApiError } = require("../utils/apiError");
const { Orders } = require('../models/DB');
const { ApiResponse } = require("../utils/apiResponse");
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


