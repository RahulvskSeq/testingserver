import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   LAZY RAZORPAY INSTANCE
   We create the instance the first time it's needed, NOT at
   import time — so dotenv.config() has a chance to run first.
───────────────────────────────────────────────────────────── */
let razorpayInstance = null;

const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file."
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
};

/* ─────────────────────────────────────────────────────────────
   POST /api/payment/create-order
───────────────────────────────────────────────────────────── */
router.post("/create-order", protect, async (req, res) => {
  try {
    const { amount, items, coupon, shippingAddress } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Handle both middleware patterns:
    //   req.user._id    → middleware that does User.findById()
    //   req.user.id     → middleware that just does req.user = decoded
    const userId = req.user?._id || req.user?.id;
    const userName = req.user?.name || "Guest";

    if (!userId) {
      console.error("No user ID found on req.user:", req.user);
      return res.status(401).json({ message: "Authentication failed — user ID missing" });
    }

    const razorpay = getRazorpay(); // ← lazy init here
    const amountInPaise = Math.round(amount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${userId.toString().slice(-6)}`,
      notes: {
        userId: userId.toString(),
        userName,
        coupon: coupon || "none",
        itemCount: items.length,
      },
    });

    const dbOrder = await Order.create({
  user: userId,
  razorpayOrderId: razorpayOrder.id,
  orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // ✅ ADD THIS
  items,
  amount,
  coupon: coupon || null,
  shippingAddress,
  status: "pending",
  paymentMethod: "razorpay",
});

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: dbOrder._id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      message: "Failed to create order",
      error: err.message,
    });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/payment/verify
───────────────────────────────────────────────────────────── */
router.post("/verify", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed", failureReason: "Invalid signature" }
      );
      return res.status(400).json({
        success: false,
        message: "Payment verification failed — invalid signature",
      });
    }

    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found in DB" });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      orderId: order._id,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({
      message: "Payment verification error",
      error: err.message,
    });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/payment/failed
───────────────────────────────────────────────────────────── */
router.post("/failed", protect, async (req, res) => {
  try {
    const { razorpay_order_id, reason } = req.body;

    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "failed",
        failureReason: reason || "Payment failed / cancelled",
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Log failed payment error:", err);
    res.status(500).json({ message: "Failed to log" });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/payment/orders
───────────────────────────────────────────────────────────── */
router.get("/orders", protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/payment/webhook
───────────────────────────────────────────────────────────── */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSignature = req.headers["x-razorpay-signature"];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("Webhook secret not configured");
        return res.status(500).send("Not configured");
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      if (expectedSignature !== webhookSignature) {
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body.toString());
      console.log("Webhook event:", event.event);

      switch (event.event) {
        case "payment.captured": {
          const payment = event.payload.payment.entity;
          await Order.findOneAndUpdate(
            { razorpayOrderId: payment.order_id },
            {
              status: "paid",
              razorpayPaymentId: payment.id,
              paidAt: new Date(payment.created_at * 1000),
            }
          );
          break;
        }
        case "payment.failed": {
          const payment = event.payload.payment.entity;
          await Order.findOneAndUpdate(
            { razorpayOrderId: payment.order_id },
            {
              status: "failed",
              failureReason: payment.error_description || "Payment failed",
            }
          );
          break;
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);

export default router;