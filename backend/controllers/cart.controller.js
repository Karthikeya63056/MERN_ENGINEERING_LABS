import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";

const cartPopulate = {
    path: "cart.product",
    select: "name price category image stock"
};

// Load the user's cart populated, prune dead references (product deleted
// since it was added), and return the clean items. Keeps the UI from ever
// receiving a null product card.
const getPopulatedCart = async (userId) => {
    const customer = await Customer.findById(userId).populate(cartPopulate);
    if (!customer) return null;
    const valid = customer.cart.filter((item) => item.product !== null);
    if (valid.length !== customer.cart.length) {
        customer.cart = valid;
        await customer.save();
    }
    return valid;
};

const toCartJSON = (items) =>
    items.map((item) => ({
        product: item.product,
        quantity: item.quantity
    }));

export const addToCart = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.stock < 1) {
            return res.status(400).json({ message: `Only ${product.stock} units available` });
        }

        if (!(await Customer.exists({ _id: req.user._id }))) {
            return res.status(401).json({ message: "User not found" });
        }

        // All cart writes below are single-document atomic operations.
        // The $elemMatch guard makes the stock check and the increment ONE
        // operation, so concurrent adds can never overshoot stock or lose
        // an increment (the wishlist controller uses the same pattern).
        for (let attempt = 0; attempt < 2; attempt++) {
            // Case 1: already in cart and below stock → bump by 1.
            const bumped = await Customer.updateOne(
                {
                    _id: req.user._id,
                    cart: { $elemMatch: { product: product._id, quantity: { $lt: product.stock } } }
                },
                { $inc: { "cart.$.quantity": 1 } }
            );
            if (bumped.matchedCount === 1) {
                const items = await getPopulatedCart(req.user._id);
                return res.status(200).json({ success: true, message: "Cart updated", cart: toCartJSON(items) });
            }

            // The bump missed: either absent from cart or already at max.
            const fresh = await Customer.findById(req.user._id).select("cart.product cart.quantity");
            if (!fresh) {
                return res.status(401).json({ message: "User not found" });
            }
            const item = fresh.cart.find(
                (entry) => entry.product.toString() === product._id.toString()
            );
            if (item) {
                if (item.quantity >= product.stock) {
                    return res.status(400).json({ message: `Only ${product.stock} units available` });
                }
                // Below stock but the bump missed → a concurrent request
                // mutated the array between our ops. Retry once.
                continue;
            }

            // Case 2: absent → push qty 1. The $ne guard makes concurrent
            // pushes race-free: only one wins, the loser retries into Case 1.
            const pushed = await Customer.updateOne(
                { _id: req.user._id, "cart.product": { $ne: product._id } },
                { $push: { cart: { product: product._id, quantity: 1 } } }
            );
            if (pushed.matchedCount === 1) {
                const items = await getPopulatedCart(req.user._id);
                return res.status(200).json({ success: true, message: "Cart updated", cart: toCartJSON(items) });
            }
            // Lost the push race → loop retries the bump path.
        }

        return res.status(500).json({ message: "Could not update cart. Please try again." });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getCart = async (req, res) => {
    try {
        const items = await getPopulatedCart(req.user._id);
        if (items === null) {
            return res.status(401).json({ message: "User not found" });
        }
        return res.status(200).json({ success: true, cart: toCartJSON(items) });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateCartQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
            return res.status(400).json({ message: "Quantity must be a number" });
        }

        if (quantity < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (quantity > product.stock) {
            return res.status(400).json({ message: `Only ${product.stock} units available` });
        }

        // Atomic set: the $elemMatch filter and the write are ONE operation,
        // so two concurrent quantity updates cannot interleave and lose one.
        const updated = await Customer.updateOne(
            { _id: req.user._id, cart: { $elemMatch: { product: product._id } } },
            { $set: { "cart.$.quantity": quantity } }
        );

        if (updated.matchedCount === 0) {
            if (!(await Customer.exists({ _id: req.user._id }))) {
                return res.status(401).json({ message: "User not found" });
            }
            return res.status(404).json({ message: "Product not in cart" });
        }

        const items = await getPopulatedCart(req.user._id);
        return res.status(200).json({ success: true, message: "Cart updated", cart: toCartJSON(items) });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        // Atomic remove: filter match and $pull are ONE operation, so a
        // concurrent add of the same product cannot be silently dropped.
        const pulled = await Customer.updateOne(
            { _id: req.user._id, "cart.product": productId },
            { $pull: { cart: { product: productId } } }
        );

        if (pulled.matchedCount === 0) {
            if (!(await Customer.exists({ _id: req.user._id }))) {
                return res.status(401).json({ message: "User not found" });
            }
            return res.status(404).json({ message: "Product not in cart" });
        }

        const items = await getPopulatedCart(req.user._id);
        return res.status(200).json({ success: true, message: "Product removed from cart", cart: toCartJSON(items) });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
