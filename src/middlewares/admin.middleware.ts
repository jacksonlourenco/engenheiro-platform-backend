import { Request, Response, NextFunction } from "express";

export function adminMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  return next();
}
