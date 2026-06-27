import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./errorHandler";

// Usage: router.post("/login", validate(loginSchema), handler)
// Validates req.body against the schema and replaces it with the parsed
// (and therefore type-narrowed) result so handlers can trust req.body's shape.
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        result.error.flatten()
      );
    }
    req.body = result.data;
    next();
  };
}
