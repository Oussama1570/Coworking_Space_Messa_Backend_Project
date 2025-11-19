// controllers/roomController.js
import mongoose from "mongoose";
import roomModel from "../models/roomModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";

dotenv.config();

// payment gateway
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

// ======================================================================
// CREATE ROOM
// ======================================================================
// ======================================================================
// CREATE ROOM
// ======================================================================
export const createRoomController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields || {};
    const { photo } = req.files || {};

    // ------------------ basic validation ------------------
    if (!name) {
      return res
        .status(400)
        .send({ success: false, error: "Name is required" });
    }
    if (!description) {
      return res
        .status(400)
        .send({ success: false, error: "Description is required" });
    }
    if (!price) {
      return res
        .status(400)
        .send({ success: false, error: "Price is required" });
    }
    if (!category) {
      return res
        .status(400)
        .send({ success: false, error: "Category is required" });
    }

    // 🔼 increase limit: 5 MB
    if (photo && photo.size > 5 * 1024 * 1024) {
      return res.status(400).send({
        success: false,
        error: "Photo should be less than 5MB",
      });
    }

    // ------------------ resolve category ------------------
    let categoryId = category;

    // if category is not a valid ObjectId, treat it as a NAME (e.g. "Children")
    if (!mongoose.Types.ObjectId.isValid(category)) {
      const categoryName = category.trim();

      const catDoc = await categoryModel.findOne({
        // case-insensitive exact match
        name: { $regex: new RegExp(`^${categoryName}$`, "i") },
      });

      if (!catDoc) {
        return res.status(400).send({
          success: false,
          error: `Category "${categoryName}" not found`,
        });
      }

      categoryId = catDoc._id;
    }

    // ------------------ create room ------------------
    const room = new roomModel({
      name,
      description,
      price,
      category: categoryId,
      quantity: quantity || 1,
      shipping: shipping || false,
      slug: slugify(name, { lower: true }),
    });

    if (photo) {
      room.photo.data = fs.readFileSync(photo.path);
      room.photo.contentType = photo.type;
    }

    await room.save();

    return res.status(201).send({
      success: true,
      message: "Room Created Successfully",
      room,
    });
  } catch (error) {
    console.error("CREATE ROOM ERROR =>", error);
    return res.status(500).send({
      success: false,
      message: "Error creating room",
      error: error.message,
    });
  }
};


// ======================================================================
// GET ALL ROOMS
// ======================================================================
export const getRoomController = async (req, res) => {
  try {
    const rooms = await roomModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      counTotal: rooms.length,
      message: "All Rooms",
      rooms,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in getting rooms",
      error: error.message,
    });
  }
};

// ======================================================================
// GET SINGLE ROOM
// ======================================================================
export const getSingleRoomController = async (req, res) => {
  try {
    const room = await roomModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");
    res.status(200).send({
      success: true,
      message: "Single Room Fetched",
      room,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single room",
      error,
    });
  }
};

// ======================================================================
// ROOM PHOTO
// ======================================================================
export const roomPhotoController = async (req, res) => {
  try {
    const room = await roomModel.findById(req.params.pid).select("photo");
    if (room && room.photo && room.photo.data) {
      res.set("Content-type", room.photo.contentType);
      return res.status(200).send(room.photo.data);
    }
    return res.status(404).send({
      success: false,
      message: "Photo not found",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error,
    });
  }
};

// ======================================================================
// DELETE ROOM
// ======================================================================
export const deleteRoomController = async (req, res) => {
  try {
    await roomModel.findByIdAndDelete(req.params.pid).select("-photo");
    res.status(200).send({
      success: true,
      message: "Room Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting room",
      error,
    });
  }
};

// ======================================================================
// UPDATE ROOM (PATCH-STYLE – fields optional)
// ======================================================================
export const updateRoomController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields || {};
    const { photo } = req.files || {};

    if (photo && photo.size > 1_000_000) {
      return res.status(400).send({
        success: false,
        error: "Photo should be less than 1MB",
      });
    }

    const updateData = { ...req.fields };

    // regenerate slug only if name changed
    if (name) {
      updateData.slug = slugify(name, { lower: true });
    }

    const room = await roomModel.findByIdAndUpdate(
      req.params.pid,
      updateData,
      { new: true }
    );

    if (!room) {
      return res.status(404).send({
        success: false,
        message: "Room not found",
      });
    }

    if (photo) {
      room.photo.data = fs.readFileSync(photo.path);
      room.photo.contentType = photo.type;
      await room.save();
    }

    res.status(200).send({
      success: true,
      message: "Room Updated Successfully",
      room,
    });
  } catch (error) {
    console.log("UPDATE ROOM ERROR =>", error);
    res.status(500).send({
      success: false,
      error: error.message,
      message: "Error in update room",
    });
  }
};

// ======================================================================
// FILTER ROOMS
// ======================================================================
export const roomFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked && checked.length > 0) args.category = checked;
    if (radio && radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const rooms = await roomModel.find(args);
    res.status(200).send({
      success: true,
      rooms,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while filtering rooms",
      error,
    });
  }
};

// ======================================================================
// ROOM COUNT
// ======================================================================
export const roomCountController = async (req, res) => {
  try {
    const total = await roomModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in room count",
      error,
      success: false,
    });
  }
};

// ======================================================================
// ROOM LIST (PAGINATION)
// ======================================================================
export const roomListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? req.params.page : 1;
    const rooms = await roomModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      rooms,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in per page controller",
      error,
    });
  }
};

// ======================================================================
// SEARCH ROOM
// ======================================================================

export const searchRoomController = async (req, res) => {
  try {
    const { keyword } = req.params;

    if (!keyword || !keyword.trim()) {
      return res.json([]);
    }

    const regex = new RegExp(keyword, "i"); // case-insensitive

    const rooms = await roomModel
      .find({
        $or: [{ name: regex }, { description: regex }],
      })
      .select("-photo");

    res.json(rooms);
  } catch (error) {
    console.error("Error in searchRoomController:", error);
    res.status(500).json({ error: "Error while searching rooms" });
  }
};

// ======================================================================
// RELATED ROOMS
// ======================================================================
export const relatedRoomController = async (req, res) => {
  try {
    const { rid, cid } = req.params;
    const rooms = await roomModel
      .find({
        category: cid,
        _id: { $ne: rid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");
    res.status(200).send({
      success: true,
      rooms,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while getting related rooms",
      error,
    });
  }
};

// ======================================================================
// ROOMS BY CATEGORY
// ======================================================================
// ======================================================================
// ROOMS BY CATEGORY
// ======================================================================
export const roomCategoryController = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1) Find category by its slug
    const category = await categoryModel.findOne({ slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    // 2) Find rooms that belong to this category (_id, not the whole doc)
    const rooms = await roomModel
      .find({ category: category._id })
      .select("-photo")      // we load photo via /room-photo/:pid
      .sort({ createdAt: -1 })
      .populate("category");

    return res.status(200).send({
      success: true,
      message: "Rooms for this category",
      category,
      rooms,
    });
  } catch (error) {
    console.log("ROOM CATEGORY ERROR =>", error);
    return res.status(400).send({
      success: false,
      message: "Error while getting rooms by category",
      error: error.message,
    });
  }
};


// ======================================================================
// BRAINTREE TOKEN
// ======================================================================
export const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

// ======================================================================
// BRAINTREE PAYMENT
// ======================================================================
export const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    let total = 0;
    cart.map((i) => {
      total += i.price;
    });
    gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      function (error, result) {
        if (result) {
          new orderModel({
            rooms: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};
