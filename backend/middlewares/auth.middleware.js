const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");

async function protect(req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const customer = await Customer.findById(decoded.id).select("-password");
    if (!customer) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, customer not found" });
    }

    req.user = customer;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token invalid" });
  }
}

module.exports = protect;
