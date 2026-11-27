import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import dustbinRoutes from "./routes/dustbinRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure DB is connected for every request (essential for serverless like Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Dustbin Finder Backend is Running!");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dustbins", dustbinRoutes);
app.use("/api/reports", reportRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Start server (only if run directly, not when imported by Vercel serverless)
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
