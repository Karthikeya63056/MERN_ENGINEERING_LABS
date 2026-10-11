import jwt from "jsonwebtoken";
import Customer from "../models/customer.model.js";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Login required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const customer = await Customer.findById(decoded.userId).select("-password");

        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = customer;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default isAuthenticated;
