import express from "express";
import {
    createProduct,
    getProducts,
    getProductById
} from "../controllers/product.controller.js";

const productRoutes = express.Router();

productRoutes.post("/", createProduct);
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProductById);

export default productRoutes;
