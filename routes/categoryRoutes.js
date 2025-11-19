import express from "express";
import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} from "../controllers/categoryController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin only
router.post("/create-category", requireSignIn, isAdmin, createCategoryController);
router.put("/update-category/:id", requireSignIn, isAdmin, updateCategoryController);
router.delete("/delete-category/:id", requireSignIn, isAdmin, deleteCategoryCOntroller);

// Public
router.get("/get-category", categoryControlller);
router.get("/single-category/:slug", singleCategoryController);

export default router; // ⬅️ VERY IMPORTANT
