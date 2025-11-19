// models/roomModel.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // link to Category collection
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    shipping: {
      type: Boolean,
      default: false,
    },
    photo: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
