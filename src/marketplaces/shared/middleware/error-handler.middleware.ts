import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/errors';

interface ResponseNew extends Response {
  status (code: number): ResponseNew;
  json: (body: { status: string; message: string }) => ResponseNew;
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    (res as ResponseNew).status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error('[Unhandled Error]', error);

  (res as ResponseNew).status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
