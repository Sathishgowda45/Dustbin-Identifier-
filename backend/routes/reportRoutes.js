import express from "express";
import {
  createReport,
  getReports,
  resolveReport
} from "../controllers/reportController.js";

const router = express.Router();

router.post("/", createReport);
router.get("/", getReports);
router.patch("/:id/resolve", resolveReport);

export default router;
