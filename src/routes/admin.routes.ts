import { Router } from "express";
import {
  createTimelineItem,
  createBudgetTimelineItem,
  createDiscount,
  deleteTimelineItem,
  deleteUserDiscount,
  getBudgetTimeline,
  getLandingSettings,
  getBudgetSettings,
  listBudgets,
  listUserDiscounts,
  listUserTimeline,
  resendBudgetAcceptedEmail,
  searchUsers,
  testAdminEmail,
  updateBudgetContractStatus,
  updateTimelineItem,
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
adminRoutes.get("/users/:userId/timeline", authMiddleware, adminMiddleware, listUserTimeline);
adminRoutes.post("/users/:userId/timeline", authMiddleware, adminMiddleware, createTimelineItem);
adminRoutes.patch("/budgets/:budgetId/contract", authMiddleware, adminMiddleware, updateBudgetContractStatus);
adminRoutes.get("/budgets/:budgetId/timeline", authMiddleware, adminMiddleware, getBudgetTimeline);
adminRoutes.post("/budgets/:budgetId/timeline", authMiddleware, adminMiddleware, createBudgetTimelineItem);
adminRoutes.patch("/timeline/:itemId", authMiddleware, adminMiddleware, updateTimelineItem);
adminRoutes.delete("/timeline/:itemId", authMiddleware, adminMiddleware, deleteTimelineItem);
adminRoutes.put("/users/:userId/discount", authMiddleware, adminMiddleware, updateUserDiscount);
adminRoutes.post("/users/:userId/discounts", authMiddleware, adminMiddleware, updateUserDiscount);
adminRoutes.post("/discounts", authMiddleware, adminMiddleware, createDiscount);
adminRoutes.get("/discounts", authMiddleware, adminMiddleware, listUserDiscounts);
adminRoutes.delete("/discounts/:discountId", authMiddleware, adminMiddleware, deleteUserDiscount);
adminRoutes.get("/budgets", authMiddleware, adminMiddleware, listBudgets);
adminRoutes.post("/budgets/:budgetId/notify", authMiddleware, adminMiddleware, resendBudgetAcceptedEmail);
adminRoutes.get("/budget-settings", authMiddleware, adminMiddleware, getBudgetSettings);
adminRoutes.put("/budget-settings", authMiddleware, adminMiddleware, updateBudgetSettings);
adminRoutes.post("/test-email", authMiddleware, adminMiddleware, testAdminEmail);

export { adminRoutes };
