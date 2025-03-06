const { ApiError } = require("../utils/apiError");
const { Orders } = require('../models/DB');
const { ApiResponse } = require("../utils/apiResponse");
const common = require('../helpers/common');


exports.getUserOrders = async (req, res, next) => {
  const { userId } = req.body;
  try {
    const userOrders = await Orders.find({ customerId: userId });
    res.status(200).json(new ApiResponse(200, userOrders, "Get User orders successfully"))
  } catch (error) {
    next(error)
  }
}


exports.updateOrder = async (req, res, next) => {
  const { orderId } = req.params;
  const updateData = req.body;

  try {
    if (!req._IS_ADMIN_ACCOUNT) {
      throw new ApiError(403, "Unauthorized access");
    }
    if (!orderId) {
      throw new ApiError(400, "Order ID is required");
    }

    const updatedOrder = await Orders.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      throw new ApiError(404, "Order not found");
    }

    res.status(200).json(new ApiResponse(200, updatedOrder, "Order updated successfully"));
  } catch (err) {
    next(err);
  }
};

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
    const orders = await Orders.find({}).populate("customerId", "username name");
    res.status(200).json(new ApiResponse(200, orders, "Get All orders successfully"))
  } catch (error) {
    next(error)
  }
}

exports.getOrderById = async (req, res, next) => {
  const { orderId } = req.params;
  try {
    const order = await Orders.findById(orderId);
    return res.status(200).json(new ApiResponse(200, order, "Get Order successfully"))
  } catch (error) {
    next(error)
  }
}