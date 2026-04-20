// import jwt from "jsonwebtoken";

// const protect = (req, res, next) => {
//   console.log("🔥 PROTECT MIDDLEWARE HIT");

//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ message: "No token" });
//   }

//   const token = authHeader.startsWith("Bearer ")
//     ? authHeader.split(" ")[1]
//     : authHeader;

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch {
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

// export default protect;



import jwt from "jsonwebtoken";

const STATIC_TOKEN = "seq$123";

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  // ✅ Static token
  if (token === STATIC_TOKEN) {
    req.user = { type: "static" };
    return next();
  }

  // ✅ JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;