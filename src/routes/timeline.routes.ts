import { Router } from "express";
import { getMyTimeline } from "../controllers/timeline.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const timelineRoutes = Router();

timelineRoutes.get("/me", authMiddleware, getMyTimeline);

export { timelineRoutes };
