// routes/authRoute.js
import express from "express";
import {
  registerController,
  loginController,
  testController,
  forgotPasswordController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
  getAllUsersController,
} from "../controllers/authController.js";

import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// REGISTER
router.post("/register", registerController);

// LOGIN
router.post("/login", loginController);

// FORGOT PASSWORD
router.post("/forgot-password", forgotPasswordController);

// TEST
router.get("/test", requireSignIn, isAdmin, testController);

// AUTH CHECKS
router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

// UPDATE PROFILE
router.put("/profile", requireSignIn, updateProfileController);

// USER ORDERS
router.get("/orders", requireSignIn, getOrdersController);

// ALL ORDERS (ADMIN)
router.get("/all-orders", requireSignIn, isAdmin, getAllOrdersController);

// ALL USERS (ADMIN ONLY)
router.get("/all-users", requireSignIn, isAdmin, getAllUsersController);

// ORDER STATUS UPDATE
router.put(
  "/order-status/:orderId",
  requireSignIn,
  isAdmin,
  orderStatusController
);

export default router;
