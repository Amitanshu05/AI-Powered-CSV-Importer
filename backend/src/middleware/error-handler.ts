import { Request, Response, NextFunction } from "express";
import { AppError } from "../config/app-error";
import { logger } from "../config/logger";

// Must be registered LAST, after all routes — Express identifies error middleware
// by its 4-argument signature (err, req, res, next).
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, path: req.path }, "Handled error");
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  // Unexpected error — log full detail server-side, but never leak internals to the client.
  logger.error({ err, path: req.path }, "Unhandled error");
  return res.status(500).json({
    success: false,
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}