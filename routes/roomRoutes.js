// routes/roomRoutes.js
import express from "express";
import {
  createRoomController,
  getRoomController,
  getSingleRoomController,
  roomPhotoController,
  updateRoomController,
  deleteRoomController,
  roomFiltersController,
  roomCountController,
  roomListController,
  relatedRoomController,
  roomCategoryController,
  braintreeTokenController,
  brainTreePaymentController,   // ✅ this is how it is exported in controller
  searchRoomController,         // ✅ search controller
} from "../controllers/roomController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ============================
   PUBLIC ROUTES
============================ */

// All rooms
router.get("/get-room", getRoomController);

// Single room by slug
router.get("/get-room/:slug", getSingleRoomController);

// Room photo by id
router.get("/room-photo/:pid", roomPhotoController);

// Filter rooms
router.post("/room-filters", roomFiltersController);

// Rooms count (for pagination)
router.get("/room-count", roomCountController);

// Paginated rooms list
router.get("/room-list/:page", roomListController);

// Related rooms
router.get("/related-room/:pid/:cid", relatedRoomController);

// Rooms by category slug
router.get("/room-category/:slug", roomCategoryController);

// 🔍 SEARCH ROOMS – support both `/search-room` and `/search` just in case
router.get("/search-room/:keyword", searchRoomController);
router.get("/search/:keyword", searchRoomController);

/* ============================
   BRAINTREE PAYMENT
============================ */
router.get("/braintree/token", braintreeTokenController);
router.post(
  "/braintree/payment",
  requireSignIn,
  brainTreePaymentController
);

/* ============================
   ADMIN / PROTECTED ROUTES
============================ */
router.post("/create-room", requireSignIn, isAdmin, createRoomController);
router.put("/update-room/:pid", requireSignIn, isAdmin, updateRoomController);
router.delete("/delete-room/:pid", requireSignIn, isAdmin, deleteRoomController);

export default router;
