import Report from "../models/Report.js";
import Dustbin from "../models/Dustbin.js";

export const createReport = async (req, res) => {
  try {
    const { dustbinId, message } = req.body;

    const report = await Report.create({
      dustbinId,
      message
    });

    await Dustbin.findByIdAndUpdate(
      dustbinId,
      { status: "Full" }
    );

    res.status(201).json({
      message: "Report sent successfully",
      report
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("dustbinId")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// RESOLVE a specific report
export const resolveReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "Resolved" },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Also mark the dustbin as Available
    await Dustbin.findByIdAndUpdate(
      report.dustbinId,
      { status: "Available" }
    );

    res.json({ message: "Report resolved", report });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};