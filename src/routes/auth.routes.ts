import { Router } from "express";
import {
  forgotPassword,
  getAdminProfile,
  getProfile,
  login,
  register,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.get("/verify-email", verifyEmail);

authRoutes.get("/me", authMiddleware, getProfile);
authRoutes.patch("/me", authMiddleware, updateProfile);

authRoutes.get("/admin/me", authMiddleware, adminMiddleware, getAdminProfile);

export { authRoutes };
