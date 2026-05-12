import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createBudget, listBudgets, updateBudget } from "../controllers/user-budgets.controller";

const userBudgetsRoutes = Router();

userBudgetsRoutes.get("/", authMiddleware, listBudgets);
userBudgetsRoutes.post("/", authMiddleware, createBudget);
// Important: keep leading slash so PATCH /budgets/:id matches correctly.
userBudgetsRoutes.patch("/:id", authMiddleware, updateBudget);

export { userBudgetsRoutes };
