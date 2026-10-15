import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";

dotenv.config();

const app = express();
// Render (and most hosts) assign the port at runtime.
const port = process.env.PORT || 8000;

if (!process.env.dbURL && !process.env.MONGO_URI) {
  console.error("Missing required environment variables: dbURL");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("Missing required environment variables: JWT_SECRET");
  process.exit(1);
}

mongoose
  .connect(process.env.dbURL || process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

// Production origins come from env; localhost always stays allowed so
// local development keeps working unchanged.
const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL].filter(
  Boolean,
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

// Health probe for hosts (Render) and humans: GET /health.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server Started at ${port}`);
});

export default app;
