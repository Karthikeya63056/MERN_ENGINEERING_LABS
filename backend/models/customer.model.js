import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
