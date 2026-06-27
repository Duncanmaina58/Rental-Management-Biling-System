import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route handler so thrown/rejected errors reach errorHandler
// without needing try/catch in every controller.
// Note: express-async-errors (imported once in server.ts) achieves the same thing
// globally for thrown errors in async handlers — this wrapper is kept as an explicit,
// readable alternative for handlers that prefer it.
export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
