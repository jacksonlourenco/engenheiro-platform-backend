import path from "path";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { adminRoutes } from "./routes/admin.routes";
import { budgetRoutes } from "./routes/budget.routes";
import { userBudgetsRoutes } from "./routes/user-budgets.routes";
import { timelineRoutes } from "./routes/timeline.routes";
import { utilsRoutes } from "./routes/utils.routes";
import { meetingRoutes } from "./routes/meeting.routes";

const app = express();

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  return res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/dashboard", (_req, res) => {
  return res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/admin", (_req, res) => {
  return res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/health", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/budget", budgetRoutes);
app.use("/budgets", userBudgetsRoutes);
app.use("/timeline", timelineRoutes);
app.use("/meetings", meetingRoutes);
app.use("/utils", utilsRoutes);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  return res.status(500).json({ message: error.message });
});

export { app };
