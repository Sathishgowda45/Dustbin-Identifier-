import express from "express";
import {
  sendRegisterCode,
  verifyRegisterCode,
  login,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register/send-code", sendRegisterCode);
router.post("/register/verify", verifyRegisterCode);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
