const jwt = require("jsonwebtoken");

function generateToken(customerId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in .env");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id: customerId }, secret, { expiresIn });
}

module.exports = generateToken;
