// models/orderModel.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // ✅ Each order has an array of rooms (ObjectId → Room model)
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room", // ✅ must match roomModel: mongoose.model("Room", roomSchema)
      },
    ],

    // ✅ We keep payment flexible (online / COD)
    payment: {
      type: Object,
      default: {},
    },

    // Buyer (user who made the order)
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    status: {
      type: String,
      default: "Not Process",
      enum: ["Not Process", "Processing", "Shipped", "deliverd", "cancel"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
