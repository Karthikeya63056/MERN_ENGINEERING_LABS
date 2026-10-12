import mongoose from "mongoose";
import Product from "../models/product.model.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body;

        if (!name || !description || price === undefined || price === null || !category || !image || stock === undefined || stock === null) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (typeof price !== "number" || price <= 0) {
            return res.status(400).json({ message: "Price must be greater than 0" });
        }

        if (typeof stock !== "number" || stock < 0) {
            return res.status(400).json({ message: "Stock cannot be negative" });
        }

        const newProduct = await Product.create({ name, description, price, category, image, stock });
        return res.status(201).json({ success: true, product: newProduct });
    } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getProducts = async (req, res) => {
    try {
        const { search, category, sort } = req.query;

        // Build the MongoDB query dynamically from whichever filters arrived.
        const query = {};
        if (search) {
            query.name = { $regex: escapeRegex(search), $options: "i" };
        }
        if (category) {
            query.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
        }

        let finder = Product.find(query).select("-__v");

        if (sort === "price_asc") {
            finder = finder.sort({ price: 1 });
        } else if (sort === "price_desc") {
            finder = finder.sort({ price: -1 });
        }

        const products = await finder;
        return res.status(200).json({ success: true, count: products.length, products });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id).select("-__v");
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ success: true, product });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
