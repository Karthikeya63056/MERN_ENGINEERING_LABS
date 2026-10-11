import Customer from "../models/customer.model.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
};

// Register Customer
export const registerCustomer = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;
        if (!fullName || !email || !password || !phone) return res.status(400).json({ message: "All fields are required" });
        if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
        const normalizedEmail = email.trim().toLowerCase();
        if (await Customer.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "Email already exists" });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await Customer.create({ fullName, email: normalizedEmail, password: hashedPassword, phone });
        const token = generateToken(newCustomer._id);
        res.cookie("token", token, cookieOptions);
        return res.status(201).json({ success: true, message: "Customer registered successfully", customer: { _id: newCustomer._id, fullName: newCustomer.fullName, email: newCustomer.email, phone: newCustomer.phone } });
    } catch (err) {
        console.log(err);
        if (err.code === 11000) return res.status(409).json({ message: "Email already exists" });
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
};

// Login Customer
export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
        const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
        if (!customer) return res.status(401).json({ message: "Invalid credentials" });
        const isPasswordCorrect = await bcrypt.compare(password, customer.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid credentials" });
        const token = generateToken(customer._id);
        res.cookie("token", token, cookieOptions);
        return res.status(200).json({ success: true, message: "Login successful", customer: { _id: customer._id, fullName: customer.fullName, email: customer.email, phone: customer.phone } });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Logout Customer
export const logoutCustomer = (req, res) => {
    res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: false });
    return res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Get the User
export const getMe = async (req, res) => res.status(200).json(req.user);

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ message: "Old password and new password are required" });
        if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
        const customer = await Customer.findById(req.user._id);
        if (!customer) return res.status(401).json({ message: "User not found" });
        const isPasswordCorrect = await bcrypt.compare(oldPassword, customer.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Old password is incorrect" });
        customer.password = await bcrypt.hash(newPassword, 10);
        await customer.save();
        return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
