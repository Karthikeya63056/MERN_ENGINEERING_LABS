import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            validate: {
                validator: (v) => typeof v === "number" && v > 0,
                message: "Price must be greater than 0"
            }
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            required: true,
            trim: true
        },

        stock: {
            type: Number,
            required: true,
            min: [0, "Stock cannot be negative"]
        }
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
