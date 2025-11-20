import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
      },
    ],

    payment: {
      method: { type: String, default: "COD" },
      status: { type: String, default: "pending" },

      // NEW FIELDS
      shippingInfo: {
        name: String,
        email: String,
        phone: String,
        country: String,
        address: String,
      },
    },

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
