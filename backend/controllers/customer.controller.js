const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const generateToken = require("../utils/generateToken");

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
}

function publicCustomer(customer) {
  return {
    _id: customer._id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
  };
}

// POST /customers/register
async function register(req, res) {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const customer = await Customer.create({ fullName, email, password, phone });

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: publicCustomer(customer),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /customers/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (!customer) {
      // Generic message — do not reveal whether email or password was wrong.
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(customer._id);
    res.cookie("token", token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      customer: publicCustomer(customer),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /customers/me (protected — req.user set by middleware)
async function getMe(req, res) {
  const u = req.user;
  return res.status(200).json({
    _id: u._id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
  });
}

// POST /customers/logout
async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
}

// PATCH /customers/change-password (bonus, protected)
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }

    customer.password = newPassword; // pre-save hook hashes it
    await customer.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { register, login, getMe, logout, changePassword };
