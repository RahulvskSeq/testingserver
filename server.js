import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js"; // ✅ NEW

dotenv.config();
connectDB();

import mongoose from "mongoose";

mongoose.connection.once("open", async () => {
  try {
    await mongoose.connection.db
      .collection("orders")
      .dropIndex("orderNumber_1");

    console.log("✅ orderNumber index removed");
  } catch (err) {
    console.log("⚠️ Index may not exist:", err.message);
  }
});

const app = express(); // ✅ CREATE APP FIRST

// ✅ CORS AFTER APP
app.use(cors({
  origin: [
    "http://localhost:5175", "http://localhost:5173","http://localhost:5174",
    "https://sequence-site-new-616y.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());

// ✅ TEST ROUTE
app.get("/test", (req, res) => {
  res.send("Server working ✅");
});

// ✅ ROUTES
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes); // ✅ NEW — Razorpay

app.listen(5002, "0.0.0.0", () => {
  console.log("🚀 Server running on port 5002");
});