import express from "express";

import {
  getDustbins,
  addDustbin,
  updateDustbinStatus,
  deleteDustbin,
  suggestNearestDustbin
} from "../controllers/dustbinController.js";

const router = express.Router();

// Get all dustbins
router.get("/", getDustbins);

// Suggest nearest available dustbin
router.get("/suggest", suggestNearestDustbin);

// Add a new dustbin
router.post("/", addDustbin);

// Update dustbin status
router.put("/:id", updateDustbinStatus);

// Delete a dustbin
router.delete("/:id", deleteDustbin);

export default router;
