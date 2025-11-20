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

// ======================================================================
// BRAINTREE PAYMENT GATEWAY
// ======================================================================
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

// ======================================================================
// CREATE ROOM
// ======================================================================
export const createRoomController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields || {};
    const { photo } = req.files || {};

    // Basic validation
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

    // 5 MB
    if (photo && photo.size > 5 * 1024 * 1024) {
      return res.status(400).send({
        success: false,
        error: "Photo should be less than 5MB",
      });
    }

    // Resolve category (ObjectId or name)
    let categoryId = category;

    if (!mongoose.Types.ObjectId.isValid(category)) {
      const categoryName = category.trim();

      const catDoc = await categoryModel.findOne({
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
// UPDATE ROOM
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

    const rooms = await roomModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo")
      .lean();

    res.status(200).send(rooms);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in search API",
      error,
    });
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
export const roomCategoryController = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await categoryModel.findOne({ slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const rooms = await roomModel
      .find({ category: category._id })
      .select("-photo")
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
// BRAINTREE PAYMENT (ONLINE)
// ======================================================================
export const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart, shippingInfo } = req.body;

    if (!cart || !cart.length) {
      return res.status(400).send({
        success: false,
        message: "Cart is empty",
      });
    }

    let total = 0;
    cart.forEach((i) => {
      total += i.price || 0;
    });

    gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      async function (error, result) {
        if (error || !result) {
          console.log("BRAINTREE ERROR =>", error || result);
          return res.status(500).send({
            success: false,
            message: "Payment failed",
            error: error || result,
          });
        }

        const success = result.success === true;

        const order = await orderModel.create({
          rooms: cart.map((item) => item._id),
          payment: {
            mode: "Online",
            amount: total,
            currency: "TND",
            gateway: "Braintree",
            status: success ? "paid" : "failed",
            raw: result,
            shippingInfo,
          },
          buyer: req.user._id,
        });

        return res.json({
          ok: success,
          order,
        });
      }
    );
  } catch (error) {
    console.log("BRAINTREE PAYMENT CONTROLLER ERROR =>", error);
    return res.status(500).send({
      success: false,
      message: "Error processing online payment",
      error: error.message,
    });
  }
};

// ======================================================================
// CASH ON DELIVERY ORDER (COD)
// ======================================================================
export const cashOrderController = async (req, res) => {
  try {
    const { cart, shippingInfo } = req.body;

    if (!cart || !cart.length) {
      return res.status(400).send({
        success: false,
        message: "Cart is empty",
      });
    }

    let total = 0;
    cart.forEach((i) => {
      total += i.price || 0;
    });

    const order = await orderModel.create({
      rooms: cart.map((item) => item._id),
      payment: {
        mode: "Cash on Delivery",
        amount: total,
        currency: "TND",
        status: "pending",
        shippingInfo,
      },
      buyer: req.user._id,
      status: "Not Process",
    });

    return res.status(201).send({
      success: true,
      message: "Cash on Delivery order created",
      order,
    });
  } catch (error) {
    console.log("CASH ORDER ERROR =>", error);
    return res.status(500).send({
      success: false,
      message: "Error while creating order",
      error: error.message,
    });
  }
};
