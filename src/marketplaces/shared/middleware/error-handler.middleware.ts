import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error('[Unhandled Error]', error);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
