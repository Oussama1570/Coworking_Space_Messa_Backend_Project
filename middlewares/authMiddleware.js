// src/middlewares/authMiddleware.js
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected Routes (token based)
export const requireSignIn = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: "No authorization header provided",
      });
    }

    // Accept both "Bearer <token>" and "<token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decode = JWT.verify(token, process.env.JWT_SECRET);
    req.user = decode; // { _id: ... }
    next();
  } catch (error) {
    console.log("AUTH MIDDLEWARE ERROR =>", error.message);
    return res.status(401).send({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Admin access
export const isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user || user.role !== 1) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized Access",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    res.status(401).send({
      success: false,
      error,
      message: "Error in admin middleware",
    });
  }
};
