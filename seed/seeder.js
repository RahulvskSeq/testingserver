import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/Product.js";
import { productSequence as products } from "./productData.js";

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log("✅ Data Seeded");
    process.exit();
  } catch (error) {
    console.error(error);
  }
};

importData();