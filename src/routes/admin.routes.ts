import { Router } from "express";
import {
  getLandingSettings,
  getBudgetSettings,
  listBudgets,
  resendBudgetAcceptedEmail,
  searchUsers,
  testAdminEmail,
  updateContractStatus,
  updateBudgetSettings,
  updateLandingSettings,
  updateUserDiscount,
} from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const adminRoutes = Router();

adminRoutes.get("/landing", getLandingSettings);
adminRoutes.put("/landing", authMiddleware, adminMiddleware, updateLandingSettings);

adminRoutes.get("/users", authMiddleware, adminMiddleware, searchUsers);
adminRoutes.patch("/users/:userId/contract", authMiddleware, adminMiddleware, updateContractStatus);
adminRoutes.put("/users/:userId/discount", authMiddleware, adminMiddleware, updateUserDiscount);
adminRoutes.get("/budgets", authMiddleware, adminMiddleware, listBudgets);
adminRoutes.post("/budgets/:budgetId/notify", authMiddleware, adminMiddleware, resendBudgetAcceptedEmail);
adminRoutes.get("/budget-settings", authMiddleware, adminMiddleware, getBudgetSettings);
adminRoutes.put("/budget-settings", authMiddleware, adminMiddleware, updateBudgetSettings);
adminRoutes.post("/test-email", authMiddleware, adminMiddleware, testAdminEmail);

export { adminRoutes };
