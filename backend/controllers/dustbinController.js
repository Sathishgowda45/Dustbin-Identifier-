import Dustbin from "../models/Dustbin.js";
import Report from "../models/Report.js";

// GET ALL
export const getDustbins = async (req, res) => {
  try {
    const dustbins = await Dustbin.find();
    res.json(dustbins);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// ADD
export const addDustbin = async (req, res) => {
  try {
    const {
      binId,
      city,
      area,
      street,
      landmark,
      latitude,
      longitude
    } = req.body;

    const dustbin = await Dustbin.create({
      binId,
      city,
      area,
      street,
      landmark,
      latitude,
      longitude
    });

    res.status(201).json(dustbin);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// UPDATE STATUS
export const updateDustbinStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const dustbin = await Dustbin.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // When admin marks dustbin Available → resolve all Pending reports for it
    if (status === "Available") {
      await Report.updateMany(
        { dustbinId: req.params.id, status: "Pending" },
        { status: "Resolved" }
      );
    }

    res.json(dustbin);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// SUGGEST NEAREST AVAILABLE DUSTBIN
export const suggestNearestDustbin = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Latitude and longitude are required"
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Get all available dustbins
    const dustbins = await Dustbin.find({ status: "Available" });

    if (dustbins.length === 0) {
      return res.status(404).json({
        message: "No available dustbins found"
      });
    }

    // Calculate distance using Haversine formula
    const toRad = (deg) => (deg * Math.PI) / 180;

    const getDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth radius in km
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find nearest dustbin
    let nearest = null;
    let minDistance = Infinity;

    for (const bin of dustbins) {
      const dist = getDistance(userLat, userLng, bin.latitude, bin.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = bin;
      }
    }

    res.json({
      dustbin: nearest,
      distance: Math.round(minDistance * 1000) // distance in meters
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// DELETE DUSTBIN
export const deleteDustbin = async (req, res) => {
  try {
    const dustbin = await Dustbin.findByIdAndDelete(req.params.id);

    if (!dustbin) {
      return res.status(404).json({ message: "Dustbin not found" });
    }

    // Also delete related reports
    await Report.deleteMany({ dustbinId: req.params.id });

    res.json({ message: "Dustbin deleted successfully" });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
