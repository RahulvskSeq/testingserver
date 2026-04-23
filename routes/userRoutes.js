// import express from "express";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";

// const router = express.Router();

// router.post("/register", async (req, res) => {
//   const { name, email, phone, password } = req.body;

//   if ((!email && !phone) || !password) {
//     return res.status(400).json({ message: "Email or phone required" });
//   }

//   let query = [];
//   if (email) query.push({ email });
//   if (phone) query.push({ phone });

//   const userExists = await User.findOne({ $or: query });

//   if (userExists) {
//     return res.status(400).json({ message: "User already exists" });
//   }

//   const user = await User.create({
//     name,
//     email,
//     phone,
//     password,
//   });

//   const token = jwt.sign(
//     { id: user._id, name: user.name },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );

//   res.json({ token });
// });

// // ✅ LOGIN
// router.post("/login", async (req, res) => {
//   const { email, phone, password } = req.body;

//   let query = [];
//   if (email) query.push({ email });
//   if (phone) query.push({ phone });

//   const user = await User.findOne({ $or: query });

//   if (!user || user.password !== password) {
//     return res.status(401).json({ message: "Invalid credentials" });
//   }

//   const token = jwt.sign(
//     { id: user._id, name: user.name },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );

//   res.json({ token });
// });

// export default router;





import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import Order from "../models/Order.js";
const router = express.Router();

// ==================== AUTH MIDDLEWARE ====================
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found" });
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ==================== REGISTER ====================
router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return res.status(400).json({ message: "Email or phone required" });
  }

  let query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });

  const userExists = await User.findOne({ $or: query });

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
  });

  const token = jwt.sign(
    { id: user._id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// ==================== LOGIN ====================
router.post("/login", async (req, res) => {
  const { email, phone, password } = req.body;

  let query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });

  const user = await User.findOne({ $or: query });

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// ==================== GET PROFILE ====================
router.get("/profile", protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    profileImage: req.user.profileImage,
    gender: req.user.gender,
    dob: req.user.dob,
  });
});

// ==================== UPDATE PROFILE ====================
router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.gender = req.body.gender || user.gender;
    user.dob = req.body.dob || user.dob;

    const updated = await user.save();

    // Generate new token if name changed
    const token = jwt.sign(
      { id: updated._id, name: updated.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      gender: updated.gender,
      dob: updated.dob,
      profileImage: updated.profileImage,
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// ==================== UPDATE PROFILE IMAGE ====================
router.put("/profile-image", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.profileImage = req.body.profileImage;
    await user.save();
    res.json({ message: "Image updated", profileImage: user.profileImage });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// ==================== CHANGE PASSWORD ====================
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user.password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Change failed" });
  }
});

// ==================== GET ADDRESSES ====================
router.get("/addresses", protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user.addresses || []);
});

// ==================== ADD ADDRESS ====================
router.post("/addresses", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // If new address is default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach(a => (a.isDefault = false));
    }

    // If it's the first address, make it default automatically
    if (!user.addresses || user.addresses.length === 0) {
      req.body.isDefault = true;
    }

    user.addresses.push(req.body);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: "Failed to add address" });
  }
});

// ==================== UPDATE ADDRESS ====================
router.put("/addresses/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });

    if (req.body.isDefault) {
      user.addresses.forEach(a => (a.isDefault = false));
    }

    Object.assign(address, req.body);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ==================== DELETE ADDRESS ====================
router.delete("/addresses/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull({ _id: req.params.id });
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// ==================== SET DEFAULT ADDRESS ====================
router.put("/addresses/:id/default", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.forEach(a => {
      a.isDefault = a._id.toString() === req.params.id;
    });
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: "Failed to set default" });
  }
});

// ==================== GET ORDERS ====================
router.get("/orders", protect, async (req, res) => {
  try {
    console.log("=== ORDER DEBUG ===");
    console.log("req.user:", req.user);
    console.log("req.user._id:", req.user._id);

    const allOrders = await Order.find({});
    console.log("Total orders in DB:", allOrders.length);
    console.log("Sample order user field:", allOrders[0]?.user);
    console.log("Sample order status:", allOrders[0]?.status);

    const userOrders = await Order.find({ user: req.user._id });
    console.log("Orders matching this user (no status filter):", userOrders.length);

    const filtered = await Order.find({
      user: req.user._id,
      status: { $in: ["paid", "shipped", "delivered", "cancelled"] },
    });
    console.log("Orders after status filter:", filtered.length);

    res.json(filtered);
  } catch (err) {
    console.error("Order fetch error:", err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
});

export default router;