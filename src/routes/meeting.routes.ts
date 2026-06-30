import { Router } from "express";
import {
  bookMeeting,
  createBlockRule,
  createAvailability,
  deleteAvailability,
  deleteBlockRule,
  getAdminCalendar,
  getAdminDaySchedule,
  listAvailability,
  listAvailableSlots,
  listBlockRules,
  listMeetingBookings,
  listMyMeetingBookings,
  saveWorkSchedule,
} from "../controllers/meeting.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

const meetingRoutes = Router();

meetingRoutes.get("/slots", authMiddleware, listAvailableSlots);
meetingRoutes.get("/mine", authMiddleware, listMyMeetingBookings);
meetingRoutes.post("/book", authMiddleware, bookMeeting);

meetingRoutes.get("/admin/availability", authMiddleware, adminMiddleware, listAvailability);
meetingRoutes.post("/admin/availability", authMiddleware, adminMiddleware, createAvailability);
meetingRoutes.delete("/admin/availability/:id", authMiddleware, adminMiddleware, deleteAvailability);
meetingRoutes.get("/admin/bookings", authMiddleware, adminMiddleware, listMeetingBookings);
meetingRoutes.get("/admin/block-rules", authMiddleware, adminMiddleware, listBlockRules);
meetingRoutes.post("/admin/block-rules", authMiddleware, adminMiddleware, createBlockRule);
meetingRoutes.put("/admin/work-schedule", authMiddleware, adminMiddleware, saveWorkSchedule);
meetingRoutes.delete("/admin/block-rules/:id", authMiddleware, adminMiddleware, deleteBlockRule);
meetingRoutes.get("/admin/calendar", authMiddleware, adminMiddleware, getAdminCalendar);
meetingRoutes.get("/admin/day", authMiddleware, adminMiddleware, getAdminDaySchedule);

export { meetingRoutes };
