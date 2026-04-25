// import mongoose from "mongoose";

// const userSchema = mongoose.Schema({
//   name: String,
//   email: String,
//   phone: String,   // ✅ ADD THIS
//   password: String,
//   isAdmin: Boolean,
// });

// export default mongoose.model("UserSequence", userSchema);









import mongoose from "mongoose";

// ==================== ADDRESS SCHEMA ====================
const addressSchema = mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  pincode: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: "India" },
  addressType: {
    type: String,
    enum: ["Home", "Work", "Other"],
    default: "Home"
  },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

// ==================== ORDER ITEM SCHEMA ====================
const orderItemSchema = mongoose.Schema({
  productId: String,
  name: String,
  image: String,
  price: Number,
  quantity: Number,
});

// ==================== ORDER SCHEMA ====================
const orderSchema = mongoose.Schema({
  orderId: String,
  items: [orderItemSchema],
  total: Number,
  status: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing"
  },
  shippingAddress: addressSchema,
}, { timestamps: true });

// ==================== USER SCHEMA ====================
const userSchema = mongoose.Schema({
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  password: { type: String },
  isAdmin: { type: Boolean, default: false },

  // Profile details
  profileImage: { type: String, default: "" },
  gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
  dob: { type: Date },

  // E-commerce features
  addresses: [addressSchema],
  orders: [orderSchema],
  wishlist: [{ type: String }],
}, { timestamps: true });






export default mongoose.model("UserSequence", userSchema);