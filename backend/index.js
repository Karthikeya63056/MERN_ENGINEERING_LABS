const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const customerRoutes = require("./routes/customer.routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "ShopKart Auth API running" });
});

app.use("/customers", customerRoutes);

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
