import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";

dotenv.config();

const app = express();
const port = 8000;

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

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);

app.listen(port, () => {
  console.log(`Server Started at ${port}`);
});

export default app;
