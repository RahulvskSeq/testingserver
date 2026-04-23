import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    imageUrl: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }, // price at time of purchase
    mrpPrice: { type: Number },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Razorpay identifiers
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // Order details
    items: [orderItemSchema],
    amount: { type: Number, required: true }, // in rupees
    currency: { type: String, default: "INR" },
    coupon: { type: String, default: null },

    // Shipping
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      default: "razorpay",
    },
    failureReason: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;