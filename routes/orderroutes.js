// routes/userRoutes.js  (orders endpoint)
// Add this route to your existing user router
 
import express from "express";
import Order from "../models/Order.js";
import authMiddleware from "../middleware/auth.js"; // adjust path as needed
 
const router = express.Router();
 
// GET /api/users/orders  — returns all successfully placed orders for the logged-in user
// Excludes: pending (not yet paid) and failed (payment failed)
router.get("/orders", authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({
            user: req.user._id,
            status: { $in: ["paid", "shipped", "delivered", "cancelled"] },
        }).sort({ createdAt: -1 });
 
        res.json(orders);
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
});
 
export default router;
 