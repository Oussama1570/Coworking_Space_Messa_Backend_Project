// server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// ✅ ADD THIS
import authRoutes from "./routes/authRoute.js";

import categoryRoutes from "./routes/categoryRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";

dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// DB
connectDB();

// ✅ AUTH ROUTES
app.use("/api/v1/auth", authRoutes);

// CATEGORY + ROOM ROUTES
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/room", roomRoutes);

app.get("/", (req, res) => {
  res.send("API running...");
});

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
