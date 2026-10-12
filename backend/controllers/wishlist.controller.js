import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";

const wishlistSelect = "name price category image stock";

export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const customer = await Customer.findById(req.user._id).select("_id");
        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        // Atomic check-and-set in ONE operation: the filter only matches
        // when the reference is absent, so concurrent requests can never
        // create duplicates. (matchedCount is used instead of
        // modifiedCount because timestamps make every update "modified".)
        const result = await Customer.updateOne(
            { _id: customer._id, wishlist: { $ne: product._id } },
            { $addToSet: { wishlist: product._id } }
        );

        if (result.matchedCount === 0) {
            return res.status(409).json({ message: "Product already in wishlist" });
        }

        return res.status(200).json({ success: true, message: "Product added to wishlist" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getWishlist = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id).populate({
            path: "wishlist",
            select: wishlistSelect
        });

        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        // A referenced product may have been deleted since it was saved.
        // populate() yields null for those — drop them so the UI never
        // receives a null card, and prune the dead references.
        const items = customer.wishlist.filter((p) => p !== null);
        if (items.length !== customer.wishlist.length) {
            await Customer.updateOne(
                { _id: customer._id },
                { $pull: { wishlist: { $nin: items.map((p) => p._id) } } }
            );
        }

        return res.status(200).json({
            success: true,
            count: items.length,
            wishlist: items
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const customer = await Customer.findById(req.user._id).select("_id");
        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        // Atomic check-and-remove in ONE operation: the filter only
        // matches when the reference is present.
        const result = await Customer.updateOne(
            { _id: customer._id, wishlist: productId },
            { $pull: { wishlist: productId } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Product not in wishlist" });
        }

        return res.status(200).json({ success: true, message: "Product removed from wishlist" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const customer = await Customer.findById(req.user._id).select("_id");
        if (!customer) {
            return res.status(401).json({ message: "User not found" });
        }

        // Atomic remove-first: a filter match means it was saved.
        const pulled = await Customer.updateOne(
            { _id: customer._id, wishlist: product._id },
            { $pull: { wishlist: product._id } }
        );

        if (pulled.matchedCount === 1) {
            return res.status(200).json({ success: true, saved: false, message: "Product removed from wishlist" });
        }

        // Nothing was there — atomic add (still race-free via $addToSet).
        await Customer.updateOne(
            { _id: customer._id },
            { $addToSet: { wishlist: product._id } }
        );
        return res.status(200).json({ success: true, saved: true, message: "Product added to wishlist" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
