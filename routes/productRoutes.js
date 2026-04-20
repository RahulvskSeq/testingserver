import express from "express";
import Product from "../models/Product.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET ALL
router.get("/",protect, async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// GET SINGLE
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});

// CREATE
router.post("/", async (req, res) => {
  const product = new Product(req.body);
  const saved = await product.save();
  res.json(saved);
});

// UPDATE
router.put("/:id", async (req, res) => {
  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// DELETE
router.delete("/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});




export default router;