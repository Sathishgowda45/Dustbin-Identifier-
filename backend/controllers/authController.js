import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// Create transporter lazily so dotenv.config() has already loaded env vars
const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Email service is not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env"
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

const sendVerificationEmail = async ({ to, subject, heading, code }) => {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"Dustbin Finder" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
        <div style="max-width: 420px; margin: auto; background: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #667eea; margin-top: 0;">🗑️ Dustbin Finder</h2>
          <p>${heading}</p>
          <h1 style="text-align: center; color: #667eea; letter-spacing: 8px; font-size: 36px; margin: 20px 0;">${code}</h1>
          <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
  console.log(`[EMAIL SENT] ${subject} -> ${to} | ${info.response}`);
  return info;
};

// Generate 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// REGISTER STEP 1 - Send verification code to email
export const sendRegisterCode = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await PendingRegistration.findOneAndUpdate(
      { email },
      { name, email, password: hashedPassword, code, expiry },
      { upsert: true, returnDocument: "after" }
    );

    await sendVerificationEmail({
      to: email,
      subject: "Dustbin Finder - Email Verification Code",
      heading: "Your account verification code is:",
      code,
    });

    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to send verification email" });
  }
};

// REGISTER STEP 2 - Verify code & create user
export const verifyRegisterCode = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const code = req.body.code;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(404).json({ message: "No pending registration found for this email" });
    }

    if (pending.code !== code.trim()) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (pending.expiry < new Date()) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ message: "User already exists" });
    }

    await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
    });

    await PendingRegistration.deleteOne({ email });

    res.status(201).json({ message: "Email verified! Registration successful." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const correctPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!correctPassword) {
      return res.status(401).json({
        message: "Incorrect password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// FORGOT PASSWORD - Send code to email
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email"
      });
    }

    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetCode = code;
    user.resetCodeExpiry = expiry;
    await user.save();

    await sendVerificationEmail({
      to: email,
      subject: "Dustbin Finder - Password Reset Code",
      heading: "Your password reset code is:",
      code,
    });

    res.json({
      message: "Reset code sent to your email"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to send reset email"
    });
  }
};

// VERIFY CODE & RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { code, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (!user.resetCode || user.resetCode !== code.trim()) {
      return res.status(400).json({
        message: "Invalid reset code"
      });
    }

    if (user.resetCodeExpiry < new Date()) {
      return res.status(400).json({
        message: "Reset code has expired"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.json({
      message: "Password reset successful! You can now login."
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
