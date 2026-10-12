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
// Intentionally unprotected: logout must always reach clearCookie(),
// even when the JWT is expired, invalid or already gone.
customerRoutes.post("/logout", logoutCustomer);
customerRoutes.get("/me", isAuthenticated, getMe);
customerRoutes.patch("/change-password", isAuthenticated, changePassword);

export default customerRoutes;
