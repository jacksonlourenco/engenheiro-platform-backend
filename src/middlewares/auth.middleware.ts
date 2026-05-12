import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  sub: string | number;
  email: string;
  role?: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined.");
  }

  return secret;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token not provided." });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Malformed token." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    req.user = {
      id: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role || "user",
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token." });
  }
}
