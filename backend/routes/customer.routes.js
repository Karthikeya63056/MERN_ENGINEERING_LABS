import express from "express";
import {
    registerCustomer,
    loginCustomer,
    logoutCustomer,
    getMe,
    changePassword
} from "../controllers/customer.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const customerRoutes = express.Router();

customerRoutes.post("/register", registerCustomer);
customerRoutes.post("/login", loginCustomer);
customerRoutes.post("/logout", isAuthenticated, logoutCustomer);
customerRoutes.get("/me", isAuthenticated, getMe);
customerRoutes.patch("/change-password", isAuthenticated, changePassword);

export default customerRoutes;
