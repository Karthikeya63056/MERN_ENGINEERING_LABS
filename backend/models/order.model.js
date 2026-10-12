import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        // Purchase-time snapshots: an old order must stay meaningful even
        // if the Product is later repriced, renamed or deleted.
        name: {
            type: String,
            required: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Price cannot be negative"]
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"],
            validate: {
                validator: Number.isInteger,
                message: "Quantity must be an integer"
            }
        },
        image: {
            type: String,
            trim: true
        }
    },
    { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        addressLine1: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },

        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: "Order must contain at least one item"
            }
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },

        // Server-calculated Σ(latest price × quantity). Never trusted from client.
        totalAmount: {
            type: Number,
            required: true,
            min: [0, "Total cannot be negative"]
        },

        paymentStatus: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED"],
            default: "PENDING"
        },

        status: {
            type: String,
            enum: ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"],
            default: "PENDING_PAYMENT"
        },

        razorpayOrderId: {
            type: String,
            trim: true
        },

        razorpayPaymentId: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

// At most ONE order awaiting payment per user. This is the database backstop
// behind checkout idempotency: truly concurrent create-payment-order calls
// that both pass the application-level reuse check still collide HERE —
// exactly one wins, the loser gets error 11000 and reuses the winner.
// Keyed on paymentStatus (not fulfilment status) so retired/cancelled
// (FAILED) and paid orders never block a fresh checkout.
orderSchema.index(
    { user: 1, paymentStatus: 1 },
    { unique: true, partialFilterExpression: { paymentStatus: "PENDING" } }
);

const Order = mongoose.model("Order", orderSchema);

// One-time cleanup of the superseded (user,status) partial index from an
// earlier revision of this guard. Buffered until connected; no-op if absent.
Order.collection.dropIndex("user_1_status_1").catch(() => {});

export default Order;
