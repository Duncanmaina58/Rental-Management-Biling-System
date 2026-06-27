import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@rmbs/shared";
import { config } from "../config/env";
import { AppError } from "./errorHandler";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string;
  ownerId?: string;
  tenantId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }
}

// Usage: router.post("/disbursements/:id/approve", authenticate, requireRole(UserRole.ADMIN, UserRole.FINANCE), handler)
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(", ")}`
      );
    }
    next();
  };
}

// Scopes a request to the caller's own owner/tenant record where relevant —
// e.g. an OWNER can only ever query their own properties, a TENANT only their own lease.
// Use in route handlers: ownerId comes from req.user.ownerId rather than a client-supplied param
// for OWNER-role requests, to prevent one owner from reading another owner's data.
export function scopeToSelfIfApplicable(req: Request): { ownerId?: string; tenantId?: string } {
  if (!req.user) return {};
  if (req.user.role === UserRole.OWNER) return { ownerId: req.user.ownerId };
  if (req.user.role === UserRole.TENANT) return { tenantId: req.user.tenantId };
  return {};
}
