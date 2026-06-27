import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(entity: string) {
    return new AppError(`${entity} not found`, 404, "NOT_FOUND");
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static conflict(message: string) {
    return new AppError(message, 409, "CONFLICT");
  }
}

// Must be registered last, after all routes.
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code, details: err.details },
    });
  }

  // Prisma known errors carry a `code` like "P2002" (unique constraint), "P2025" (not found)
  const prismaCode = (err as any)?.code;
  if (typeof prismaCode === "string" && prismaCode.startsWith("P")) {
    if (prismaCode === "P2002") {
      return res.status(409).json({
        success: false,
        error: { message: "A record with this value already exists", code: "DUPLICATE" },
      });
    }
    if (prismaCode === "P2025") {
      return res.status(404).json({
        success: false,
        error: { message: "Record not found", code: "NOT_FOUND" },
      });
    }
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}
