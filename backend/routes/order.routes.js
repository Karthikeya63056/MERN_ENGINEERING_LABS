import express from "express";
import {
    createPaymentOrder,
    verifyPayment,
    syncPayment,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder
} from "../controllers/order.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const orderRoutes = express.Router();

orderRoutes.post("/create-payment-order", isAuthenticated, createPaymentOrder);
orderRoutes.post("/verify-payment", isAuthenticated, verifyPayment);
orderRoutes.post("/:id/sync", isAuthenticated, syncPayment);
orderRoutes.get("/", isAuthenticated, getOrders);
orderRoutes.get("/:id", isAuthenticated, getOrderById);
orderRoutes.patch("/:id/status", isAuthenticated, updateOrderStatus);
orderRoutes.post("/:id/cancel", isAuthenticated, cancelOrder);

export default orderRoutes;
