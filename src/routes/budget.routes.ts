import { Router } from "express";
import { calculateBudget, getBudgetQuestions } from "../controllers/budget.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const budgetRoutes = Router();

budgetRoutes.get("/questions", authMiddleware, getBudgetQuestions);
budgetRoutes.post("/calculate", authMiddleware, calculateBudget);

export { budgetRoutes };
